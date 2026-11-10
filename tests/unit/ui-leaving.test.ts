import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeavingSteps } from '../../packages/ui/LeavingSteps';
import { PayShareSheet } from '../../packages/ui/PayShareSheet';
import { leavingScenes } from '../../packages/ui/scenes/leaving';
import { payShareScenes } from '../../packages/ui/scenes/payment';
import { DEMO_LABEL } from '../../packages/ui/scenes/demo/squad';

const render = (component: unknown, props: unknown) =>
  renderToStaticMarkup(createElement(component as never, props as never));
const leaving = (id: string) => {
  const scene = leavingScenes.find((entry) => entry.id === id);
  assert.ok(scene, id);
  return { props: scene.props, markup: render(LeavingSteps, { ...scene.props, demoLabel: DEMO_LABEL }) };
};
const paying = (id: string) => {
  const scene = payShareScenes.find((entry) => entry.id === id);
  assert.ok(scene, id);
  return { props: scene.props, markup: render(PayShareSheet, { ...scene.props, demoLabel: DEMO_LABEL }) };
};

test('Q17 §9.7 the leave-by banner reads in the viewer’s own zone and counts down', () => {
  const { markup } = leaving('leaving-start');
  // The scene sits two days before the deadline, in UTC+1 (the fixture's zone).
  assert.match(markup, /Start leaving by 16 Dec 2026, 23:00 UTC\+1/);
  // `t` moves the clock inside the frame (4 s into the scene), so two days out reads as 1 d 23 h.
  assert.match(markup, /1 d 23 h left\./);
  assert.match(markup, /Goal day is 18 Dec 2026, 01:00 UTC\+1/);
  // A passed deadline says so instead of showing a negative countdown.
  assert.match(leaving('leaving-deadline-passed').markup, /That deadline has passed/);
  assert.doesNotMatch(leaving('leaving-deadline-passed').markup, /-\d+ d/);
});

test('Q17 §9.7 starting to leave names the squads that would go short before any approval', () => {
  const warned = leaving('leaving-start-affects-others');
  assert.match(warned.markup, /This will show you short by/);
  // Each other squad is named with what the member committed there, because every squad reads
  // the same one active balance.
  for (const squad of warned.props.affected) {
    assert.match(warned.markup, new RegExp(squad.name), squad.name);
  }
  assert.match(warned.markup, /Start leaving in Nimiq Pay/);
  // With spare stake there is no warning at all.
  assert.doesNotMatch(leaving('leaving-start').markup, /This will show you short by/);
  // No stake, no step one: it is locked rather than offering a transaction that cannot work.
  const none = leaving('leaving-not-staking');
  assert.match(none.markup, /No stake found for your address/);
  assert.doesNotMatch(none.markup, /Start leaving in Nimiq Pay/);
});

test('Q11 §9.7 the countdown states the block rule and retire cannot be tapped until the tick', () => {
  const counting = leaving('leaving-countdown');
  assert.match(counting.markup, /Released at block/);
  assert.match(counting.markup, /The block\s+number is the rule; the time is an estimate\./);
  assert.doesNotMatch(counting.markup, /Confirm withdrawal in Nimiq Pay/);
  // A jailed validator is said out loud, because it is why the wait is longer (Q07).
  assert.match(leaving('leaving-countdown-jailed').markup, /validator has been jailed/);
  // An unknown release never guesses a date.
  const unknown = leaving('leaving-release-unknown');
  assert.match(unknown.markup, /not known yet, so this stays switched off rather than guessing/);
  assert.doesNotMatch(unknown.markup, /Released at block/);

  // Releasable, tick empty: the button is on screen and disabled.
  const ready = leaving('leaving-releasable');
  assert.match(ready.markup, /I understand this cannot be undone\./);
  assert.match(ready.markup, /Confirm withdrawal in Nimiq Pay<\/button>/);
  assert.match(ready.markup, /<button class="primary-button" disabled=""/);
  // Ticked: the same button, now enabled.
  const ticked = leaving('leaving-releasable-ticked');
  assert.match(ticked.markup, /checked=""/);
  assert.doesNotMatch(ticked.markup.split('Confirm withdrawal in Nimiq Pay')[0] ?? '',
    /<button class="primary-button" disabled=""/);
});

test('Q12 §9.7 withdraw offers the whole retired balance and explains the fee comes out of it', () => {
  const retired = leaving('leaving-retired');
  assert.match(retired.markup, /goes back to your wallet/);
  assert.match(retired.markup, /whole amount, and the fee comes out of it/);
  assert.match(retired.markup, /Withdraw in Nimiq Pay/);
  // Nothing retired yet: the step explains rather than offering.
  assert.match(leaving('leaving-countdown').markup, /Confirm the withdrawal first\./);
});

test('Q17 §9.9 a pending step is never success, and a failed one says the chain rejected it', () => {
  const pending = leaving('leaving-start-pending');
  assert.match(pending.markup, /Waiting for the chain/);
  // The hash is on screen even while the verdict is not: a hash is not success (Q10).
  assert.match(pending.markup, new RegExp(pending.props.steps.start.state === 'pending'
    ? pending.props.steps.start.hash : 'no hash'));
  assert.doesNotMatch(pending.markup, /Your stake is on its way out/);
  // A stalled poll stops and offers a manual re-check; it never resends. The wording no
  // longer promises "after two minutes": a refusal can end the window sooner, and the member
  // does not need to be told how long we waited (docs/AUDIT.md, m-1).
  const stalled = leaving('leaving-start-stalled').markup;
  assert.match(stalled, /Still no verdict yet\. Nothing was resent/);
  assert.doesNotMatch(stalled, /two minutes/);
  // Included but failed is a failure with the fee spent, not a retry (NimJar, 12 Sep 2026).
  const failed = leaving('leaving-retire-failed');
  assert.match(failed.markup, /That transaction failed/);
  assert.match(failed.markup, /included in a block but did not execute\. Nothing moved/);
  // Every state keeps the one re-read control, because every figure above it is a chain read.
  // Its word is now "Refresh": "Check the chain again" described the mechanism rather than
  // the member's intent, and plain words are the rule outside the proof page.
  for (const scene of leavingScenes) {
    assert.match(render(LeavingSteps, { ...scene.props, demoLabel: DEMO_LABEL }),
      /Refresh/, scene.id);
  }
});

test('Q17 §9.7 step four never says "finish withdrawing first" about a payment in flight', () => {
  // The step is not locked — the chain has it and is counting confirmations. The transaction
  // block above it already says so, so repeating the locked sentence contradicts it
  // (docs/AUDIT.md, m-4).
  const pending = leaving('leaving-pay-pending');
  assert.doesNotMatch(pending.markup, /Finish withdrawing first/);
  assert.match(pending.markup, /Waiting for the chain/);
  // And it offers no second send while a hash is in flight (AGENTS.md invariant 8): the words
  // "Pay my share" survive only as the step's own heading, with no control under them.
  assert.doesNotMatch(pending.markup, /class="primary-button"/);

  // The sentence is still there in the state it describes: nothing withdrawn yet.
  const locked = leaving('leaving-start');
  assert.match(locked.markup, /Finish withdrawing first, then pay your share\./);
  // Once the NIM is back, the step offers the payment instead of the sentence.
  const ready = leaving('leaving-withdrawn-shared-goal');
  assert.doesNotMatch(ready.markup, /Finish withdrawing first/);
  assert.match(ready.markup, /class="primary-button"[^>]*>Pay my share/);
});

test('Q17 §9.8 the pay sheet shows the fixed recipient, the marker and the squad roster', () => {
  const { props, markup } = paying('pay-ready');
  assert.match(markup, new RegExp(props.recipient.replace(/ /g, ' ')));
  assert.match(markup, new RegExp(`sq:${props.squad.shortId}`));
  assert.match(markup, /3 of 4 paid/);
  assert.match(markup, /Nimiq Pay will ask you to approve exactly this amount/);
  // Before withdrawing there is nothing to pay with, and the sheet says so instead of offering.
  const early = paying('pay-not-withdrawn-yet');
  assert.match(early.markup, /Withdraw first/);
  assert.doesNotMatch(early.markup, /Nimiq Pay will ask you to approve/);
});

test('Q15 §9.8 a refused payment says the NIM left, and a verified one says what was checked', () => {
  for (const id of ['pay-refused-recipient', 'pay-refused-short', 'pay-refused-no-marker']) {
    const { markup } = paying(id);
    assert.match(markup, /The NIM did leave your wallet/, id);
    assert.doesNotMatch(markup, /Paid and verified/, id);
  }
  const paid = paying('pay-paid');
  assert.match(paid.markup, /Paid and verified/);
  // The five §7.6 checks are named, so the claim is auditable rather than a badge.
  assert.match(paid.markup, /recipient, at least your share, the squad reference, the\s+execution result and finality/);
  assert.match(paying('pay-paid-squad-complete').markup, /Everyone has paid, so this squad is complete\./);
  // A declined approval changed nothing, and says so.
  assert.match(paying('pay-declined').markup, /Nothing changed\./);
  // An unknown outcome never claims either way.
  const unknown = paying('pay-outcome-unknown');
  assert.doesNotMatch(unknown.markup, /Paid and verified|Nothing changed\./);
});
