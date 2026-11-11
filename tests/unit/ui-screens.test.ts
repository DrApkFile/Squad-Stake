import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateSquadScreen } from '../../packages/ui/CreateSquadScreen';
import { LeavingSteps } from '../../packages/ui/LeavingSteps';
import { MySquadsScreen } from '../../packages/ui/MySquadsScreen';
import { OrbitScene } from '../../packages/ui/OrbitSquad';
import { ProofScreen } from '../../packages/ui/ProofScreen';
import { SignInScreen } from '../../packages/ui/SignInScreen';
import { InfoSheet } from '../../packages/ui/InfoSheet';
import { NoticeScreen } from '../../packages/ui/NoticeScreen';
import { PayShareSheet } from '../../packages/ui/PayShareSheet';
import { SquadScreen } from '../../packages/ui/SquadScreen';
import { TxStatusScene } from '../../packages/ui/TxStatus';
import { REDUCED_MOTION_T, typedChars } from '../../packages/ui/motion';
import { noticeScenes } from '../../packages/ui/scenes/notice';
import { mySquadsScenes, proofScenes, squadPageScenes } from '../../packages/ui/scenes/squad-page';
import { orbitScenes } from '../../packages/ui/scenes/orbit';
import { leavingScenes } from '../../packages/ui/scenes/leaving';
import { payShareScenes, txStatusScenes } from '../../packages/ui/scenes/payment';
import { signInScenes } from '../../packages/ui/scenes/sign-in';
import { createSquadScenes } from '../../packages/ui/scenes/squad-flow';
import { DEMO_LABEL } from '../../packages/ui/scenes/demo/squad';

const render = (component: unknown, props: unknown) =>
  renderToStaticMarkup(createElement(component as never, props as never));

test('Q17 every new scene renders twice to the same bytes from props alone', () => {
  const groups = [
    { component: OrbitScene, scenes: orbitScenes },
    { component: MySquadsScreen, scenes: mySquadsScenes },
    { component: SquadScreen, scenes: squadPageScenes },
    { component: ProofScreen, scenes: proofScenes },
    { component: SignInScreen, scenes: signInScenes },
    { component: LeavingSteps, scenes: leavingScenes },
    { component: PayShareSheet, scenes: payShareScenes },
    { component: TxStatusScene, scenes: txStatusScenes },
    // The screens a page shows when it cannot show itself (app/{not-found,error}.tsx).
    { component: NoticeScreen, scenes: noticeScenes },
  ] as const;
  let rendered = 0;
  for (const { component, scenes } of groups) {
    assert.ok(scenes.length > 0);
    for (const scene of scenes) {
      const props = { ...scene.props, demoLabel: DEMO_LABEL };
      const first = render(component, props);
      assert.equal(first, render(component, props), scene.id);
      assert.match(first, /SAMPLE DATA/, scene.id);
      rendered++;
    }
  }
  // orbit + my squads + squad page + proof + sign-in + leaving + pay + tx status.
  // The squad page gained eight: a fixture for each state the 2026-11-09 fixes introduced
  // (confirming with and without a count, leaving with an unknown release, ready, jailed,
  // withdrawn, paid, and one squad holding every stage at once).
  // 3 added for the native-UI pass: the copied confirmation and the two ⓘ-sheet frames.
  // 2 added for the retry pass: a withdrawal the network interrupted, and the same failure
  // once a hash exists, where no retry may be offered.
  // 1 added by the audit pass: a payment in flight, where step four must not claim the
  // withdrawal is unfinished (docs/AUDIT.md, m-4).
  // 4 added by the links/failures pass: a refused clipboard write on the squad page, the
  // entry screen a members-only page sent someone to, and the proof view's two arrivals
  // (redirected here, and opened from your own squad).
  // 4 notice scenes: missing page, server fault, that fault retrying, invalid invite.
  assert.equal(rendered, 7 + 5 + 19 + 5 + 9 + 3 + 27 + 13 + 4 + 4);
});

test('Q17 the same t always renders the same frame, and a different t renders a different one', () => {
  const scene = signInScenes.find((entry) => entry.id === 'sign-in-start');
  assert.ok(scene);
  const at = (t: number) => render(SignInScreen, { ...scene.props, t });
  // Determinism is what lets the video renderer draw frame by frame (AGENTS.md "UI purity" 6).
  assert.equal(at(0.5), at(0.5));
  assert.equal(at(2.25), at(2.25));
  assert.notEqual(at(0), at(0.8));          // the typewriter has moved
  assert.notEqual(at(10), at(20));          // the rings have turned
  // Nothing in the markup comes from a clock or a timer.
  assert.doesNotMatch(at(1), /setInterval|requestAnimationFrame|@keyframes/);
});

test('Q17 the frozen reduced-motion frame is the finished frame: full heading, final total', () => {
  const reduced = signInScenes.find((entry) => entry.id === 'sign-in-reduced-motion');
  const start = signInScenes.find((entry) => entry.id === 'sign-in-start');
  assert.ok(reduced && start);
  assert.equal(reduced.props.t, REDUCED_MOTION_T);
  const frozen = render(SignInScreen, reduced.props);
  const first = render(SignInScreen, start.props);
  // The visible line: the emphasis phrase is fully typed when frozen, empty at t = 0.
  assert.match(frozen, /class="typewriter-emphasis">Nobody holds the pot\.</);
  assert.match(first, /class="typewriter-emphasis"><\/span>/);
  assert.equal(typedChars(REDUCED_MOTION_T, 36), 36);
  // The entrance is over: no element is left part-way in.
  assert.doesNotMatch(frozen, /--enter:0\./);
  assert.match(frozen, /--enter:1/);
  // The screen reader always had the whole line, typed or not.
  assert.match(first, /class="sr-only"/);
});

test('Q17 §9.5 the squad page shows backed totals, read ages and a masked shortfall', () => {
  const backed = squadPageScenes.find((scene) => scene.id === 'squad-page-backed');
  assert.ok(backed);
  const markup = render(SquadScreen, { ...backed.props, demoLabel: DEMO_LABEL });
  assert.match(markup, /Checked/);
  // A masked SHORT row says "Short", never a number: the number is a balance (FAILURE_MODES).
  const masked = backed.props.members.find((member) => member.status?.status === 'SHORT');
  assert.ok(masked && masked.status?.status === 'SHORT' && masked.status.shortBy === null);
  assert.match(markup, />Short</);
  assert.doesNotMatch(markup, /Short by/);
  // Every screen offers a way out (no dead ends) and a way to re-read the chain.
  assert.match(markup, /href="\/squads"/);
  // The refresh control appears when a container supplies the callback; a fixture has none.
  assert.match(render(SquadScreen, { ...backed.props, onRefresh: () => undefined }),
    /Refresh/);

  const loading = squadPageScenes.find((scene) => scene.id === 'squad-page-loading');
  assert.ok(loading);
  const blank = render(SquadScreen, { ...loading.props, demoLabel: DEMO_LABEL });
  assert.match(blank, /—/);                       // no invented figure while nothing is read
  assert.doesNotMatch(blank, /Checked \d/);

  const unavailable = squadPageScenes.find((scene) => scene.id === 'squad-page-chain-unavailable');
  assert.ok(unavailable);
  assert.match(render(SquadScreen, { ...unavailable.props, demoLabel: DEMO_LABEL }),
    /could not be read/);
});

test('Q17 §9.10 the proof view is public, names its network and prints the call to repeat', () => {
  for (const scene of proofScenes) {
    const markup = render(ProofScreen, { ...scene.props, demoLabel: DEMO_LABEL });
    assert.match(markup, /getStakerByAddress/, scene.id);
    assert.match(markup, new RegExp(scene.props.network), scene.id);
    // Full addresses, so a reader can check each one themselves.
    assert.match(markup, /NQ\d\d /, scene.id);
    // A public page offers no action and no invite link.
    assert.doesNotMatch(markup, /Share invite|Leave squad/, scene.id);
  }
});

test('Q17 the orbit fits every squad size and claims no total it has not read', () => {
  const sizes = orbitScenes.map((scene) => scene.props.members.length);
  assert.ok(sizes.includes(3) && sizes.includes(6) && sizes.includes(12));
  const noRead = orbitScenes.find((scene) => scene.id === 'orbit-no-read');
  assert.ok(noRead);
  assert.equal(noRead.props.backedLuna, null);
  const markup = render(OrbitScene, { ...noRead.props, demoLabel: DEMO_LABEL });
  // The centre makes no claim it has not read: a skeleton block where the figure will be,
  // never a zero and never a guess. The dash stays as the block's accessible name, so a
  // screen reader still hears "unknown" rather than silence.
  assert.match(markup, /class="skeleton orbit-total-skeleton" aria-label="—"/);
  assert.doesNotMatch(markup, /class="orbit-total" data-size="[a-z]+">0</);
  const twelve = orbitScenes.find((scene) => scene.props.members.length === 12);
  assert.ok(twelve);
  const full = render(OrbitScene, { ...twelve.props, demoLabel: DEMO_LABEL });
  // Four rings at twelve members, each seat placed as a percentage so 375 px scales down.
  assert.equal((full.match(/orbit-ring/g) ?? []).length >= 4, true);
  assert.match(full, /--seat-x:/);
  assert.doesNotMatch(full, /px/);
});

test('Q17 §9.3 My squads has an empty state that leads to create, and cards claim no status', () => {
  const empty = mySquadsScenes.find((scene) => scene.id === 'my-squads-empty');
  assert.ok(empty);
  const markup = render(MySquadsScreen, { ...empty.props, demoLabel: DEMO_LABEL });
  assert.match(markup, /href="\/squads\/new"/);
  const several = mySquadsScenes.find((scene) => scene.id === 'my-squads-several');
  assert.ok(several);
  const cards = render(MySquadsScreen, { ...several.props, demoLabel: DEMO_LABEL });
  // The list is our own record of commitments, so it says "committed", never "backed":
  // only the squad page reads the chain.
  assert.match(cards, /committed/i);
  assert.doesNotMatch(cards, /backed/i);
  // Not even a seat's colour claims a status the card never read.
  assert.match(cards, /data-tone="NEUTRAL"/);
});

test('Q17 §7.4/§7.5 the three defects found on testnet cannot render again', () => {
  const scene = (id: string) => {
    const found = squadPageScenes.find((entry) => entry.id === id);
    assert.ok(found, id);
    return render(SquadScreen, { ...found.props, demoLabel: DEMO_LABEL });
  };

  // 1. The tracker agrees with the chain. The row carries a real count, and no screen in this
  // set may print "0 of 60" — the fabricated figure the phone showed.
  const countdown = scene('squad-page-leaving-countdown');
  assert.match(countdown, /On the chain · 12 of 60 confirmations/);
  // 2. The banner is the countdown, and "Start leaving" is not on the page at all. The scene's
  // `now` is inside the leave-by window, so the old screen would have offered it.
  assert.match(countdown, /unlocks in about/);
  assert.doesNotMatch(countdown, /Start leaving/);
  assert.match(countdown, /View progress/);
  // 3. Leaving still counts toward the squad: never "0 saved" and nothing else.
  assert.match(countdown, /3,100 NIM leaving/);
  assert.match(countdown, /ready in ~/);

  // A count nobody read is worded, not printed.
  const unread = scene('squad-page-leaving-unread-count');
  assert.match(unread, /On the chain · confirming/);
  for (const id of ['squad-page-leaving-countdown', 'squad-page-leaving-unread-count',
    'squad-page-leaving-release-unknown', 'squad-page-leaving-ready', 'squad-page-leaving-jailed',
    'squad-page-withdrawn', 'squad-page-share-paid', 'squad-page-every-stage'] as const) {
    assert.doesNotMatch(scene(id), /0 of 60 confirmations/, id);
    // None of these stages may offer to start leaving again.
    assert.doesNotMatch(scene(id), /Start leaving/, id);
  }

  // An unknown release says so instead of naming a time.
  assert.match(scene('squad-page-leaving-release-unknown'), /release time is not known yet/);
  assert.match(scene('squad-page-leaving-ready'), /ready to withdraw/);
  assert.match(scene('squad-page-leaving-jailed'), /validator is jailed/);
  assert.match(scene('squad-page-withdrawn'), /back in your wallet/);
  assert.match(scene('squad-page-share-paid'), /share is paid/);

  // Every stage at once, each under its own name, and only the short member counted missing.
  const mixed = scene('squad-page-every-stage');
  for (const phrase of [/2,000 NIM leaving/, /2,500 NIM saved/, /1,100 NIM ready to withdraw/,
    /1,800 NIM missing/]) {
    assert.match(mixed, phrase, String(phrase));
  }
});

test('Q17 the screens read as an app: no printed invite link, no underlined control', () => {
  const backed = squadPageScenes.find((scene) => scene.id === 'squad-page-backed');
  assert.ok(backed);
  const markup = render(SquadScreen, { ...backed.props, demoLabel: DEMO_LABEL });

  /**
   * The invite URL is the one string on this screen that must not be mistyped, and a phone
   * cannot select it comfortably. It travels by the share sheet or the clipboard; it is never
   * printed. The fixture's own link is the needle here, so this fails the moment a screen
   * renders it again anywhere.
   */
  const inviteUrl = backed.props.inviteUrl;
  assert.ok(typeof inviteUrl === 'string' && inviteUrl.length > 0, 'the fixture has a link');
  assert.ok(!markup.includes(inviteUrl), 'the invite link is never printed on screen');
  assert.match(markup, /Share invite/);
  assert.match(markup, /Copy link/);

  // The create screen's share step is the first place a creator needs the link, and it used
  // to print it in full while this screen did not (docs/AUDIT.md, M-1). Same rule, same
  // controls, same needle.
  const share = createSquadScenes.find((scene) => scene.props.created !== undefined);
  assert.ok(share?.props.created, 'a fixture for the share step');
  const shareMarkup = render(CreateSquadScreen, share.props);
  assert.ok(!shareMarkup.includes(share.props.created.inviteUrl),
    'the create screen never prints the invite link either');
  assert.match(shareMarkup, /Share invite/);
  assert.match(shareMarkup, /Copy link/);

  // A compact top bar: the screen's own name, centred, with a back chevron rather than the
  // "← Squads" text link it replaces.
  assert.match(markup, /class="topbar"/);
  assert.match(markup, /class="topbar-title"/);
  assert.doesNotMatch(markup, /←/, 'the back control is a chevron, not an arrow glyph');

  // The main action is pinned in an action bar inside the safe area.
  assert.match(markup, /class="action-bar"/);

  /**
   * No underline inside a control. The screens render anchors styled as buttons, which inherit
   * the browser's underline unless the class clears it, so this is checked in the stylesheet
   * that the same package ships.
   */
  const css = readFileSync(new URL('../../packages/ui/styles.css', import.meta.url), 'utf8');
  for (const control of ['.primary-button', '.secondary-button', '.gradient-button',
    '.row-button', '.link-button', '.icon-button']) {
    const block = css.slice(css.indexOf(`${control} {`));
    assert.match(block.slice(0, block.indexOf('}')), /text-decoration: none/, control);
  }

  /**
   * Plain words on the member's screens, the chain's own vocabulary on the public proof view.
   * "Backed" and "Unstaking" describe a staking contract; "Saved" and "Leaving" describe what
   * the member is actually doing, and the proof page is the one place the brief keeps the
   * technical terms, because its reader is checking the contract.
   */
  assert.match(markup, /Saved/);
  assert.doesNotMatch(markup, /Backed/);
  const proof = proofScenes.find((scene) => scene.id === 'proof-view-payments');
  assert.ok(proof);
  const proofMarkup = render(ProofScreen, { ...proof.props, demoLabel: DEMO_LABEL });
  assert.match(proofMarkup, /Backed/, 'the proof view keeps the chain\'s word');

  /**
   * Monospace is for amounts, addresses and hashes — the strings people compare character by
   * character. Metadata ("Checked 2 min ago") is prose and is set in the text face.
   */
  for (const metadata of ['.member-age', '.member-status-age', '.meta']) {
    const block = css.slice(css.indexOf(`${metadata} {`));
    assert.match(block.slice(0, block.indexOf('}')), /font-family: var\(--font-sans\)/, metadata);
  }
});

test('Q17 the ⓘ sheet is a pure function of t, and says what the banner no longer does', () => {
  const rising = squadPageScenes.find((scene) => scene.id === 'squad-page-info-rising');
  const open = squadPageScenes.find((scene) => scene.id === 'squad-page-info-open');
  assert.ok(rising && open);

  const risingMarkup = render(SquadScreen, { ...rising.props, demoLabel: DEMO_LABEL });
  const openMarkup = render(SquadScreen, { ...open.props, demoLabel: DEMO_LABEL });
  // Mid-rise and open are different frames, and each is reproducible from its props alone.
  assert.notEqual(risingMarkup, openMarkup, 'the rise is visible, not instant');
  assert.equal(risingMarkup, render(SquadScreen, { ...rising.props, demoLabel: DEMO_LABEL }));
  assert.match(risingMarkup, /--info-progress/);

  // The long explanation left the banner and is only in the sheet.
  const closed = squadPageScenes.find((scene) => scene.id === 'squad-page-leave-by');
  assert.ok(closed);
  const closedMarkup = render(SquadScreen, { ...closed.props, demoLabel: DEMO_LABEL });
  assert.match(closedMarkup, /Unstaking takes about a day/, 'one short sentence stays');
  assert.doesNotMatch(closedMarkup, /reporting window/, 'the long version is behind the ⓘ');
  assert.doesNotMatch(closedMarkup, /class="info-sheet"/, 'a closed sheet is not in the DOM');
  assert.match(openMarkup, /reporting window/);
});

test('Q17 the entry screen says what Squad Stake is, and labels its sample without a banner', () => {
  const scene = signInScenes.find((entry) => entry.id === 'sign-in-idle');
  assert.ok(scene);
  // No `demoLabel`: this is the screen as `containers/sign-in.tsx` renders it for a visitor.
  const html = render(SignInScreen, scene.props);

  // The complaint: a first-time visitor met "SAMPLE DATA — not a real squad" as the first
  // words on the page, above anything saying what the page was for.
  assert.doesNotMatch(html, /SAMPLE DATA/);
  assert.ok(!readFileSync('apps/web/src/containers/sign-in.tsx', 'utf8').includes('DEMO_LABEL'));

  // The invented data is still labelled, where it is drawn rather than across the top.
  assert.match(html, /Example squad/);
  assert.match(html, /Example goals/);

  // And the screen now answers "what is this?" before it asks for a signature.
  assert.match(html, /How it works/);
  for (const phrase of ['Pick a goal, together', 'never leaves your wallet',
    'read from the chain']) {
    assert.match(html, new RegExp(phrase), phrase);
  }
  // Explanation does not push the one action off the screen: it is pinned, not in the flow.
  assert.match(html, /class="action-bar"/);

  // The name is carried by the full lockup on its own row, not squeezed into a 44 px corner.
  assert.match(html, /class="topbar topbar-lockup"/);
  assert.match(html, /<title>Squad Stake<\/title>/);
});

test('n-5/n-6 the entry action is the loudest control on its screen, and the ⓘ sheet closes', () => {
  const idle = signInScenes.find((entry) => entry.id === 'sign-in-idle');
  const waiting = signInScenes.find((entry) => entry.id === 'sign-in-waiting');
  assert.ok(idle && waiting);

  // The one action on the first screen was the outlined gradient pill — this app's quiet
  // style — while "Change my commitment" elsewhere is filled ink (docs/AUDIT.md, n-5).
  const idleHtml = render(SignInScreen, idle.props);
  assert.match(idleHtml, /class="primary-button"[^>]*>\s*Sign in with Nimiq Pay/);
  assert.doesNotMatch(idleHtml, /class="gradient-button"/);

  // Waiting still says so, and still turns: the spinner did not go with the pill.
  const waitingHtml = render(SignInScreen, { ...waiting.props, t: 0.4 });
  assert.match(waitingHtml, /aria-busy="true"/);
  assert.match(waitingHtml, /class="spinner"/);
  assert.match(waitingHtml, /Waiting for approval/);

  // n-6: the scrim closes the sheet on a tap outside it and on Escape, as pure handlers —
  // a tap on the sheet itself must not close it.
  const open = squadPageScenes.find((scene) => scene.id === 'squad-page-info-open');
  assert.ok(open);
  let closed = 0;
  const element = InfoSheet({
    info: { title: 'Why a day', body: 'Because of the reporting window.', openedT: 0 },
    t: REDUCED_MOTION_T, onClose: () => { closed += 1; },
  });
  assert.ok(element !== null);
  const scrim = { className: 'info-scrim' };
  const sheet = { className: 'info-sheet' };
  element.props.onClick({ target: scrim, currentTarget: scrim });
  assert.equal(closed, 1, 'a tap on the scrim closes it');
  element.props.onClick({ target: sheet, currentTarget: scrim });
  assert.equal(closed, 1, 'a tap inside the sheet does not');
  element.props.onKeyDown({ key: 'Escape', stopPropagation: () => {} });
  assert.equal(closed, 2, 'Escape closes it');
  element.props.onKeyDown({ key: 'a', stopPropagation: () => {} });
  assert.equal(closed, 2);
  // The close button is still there: the scrim is not the only way out, and it carries no
  // role of its own.
  assert.match(render(SquadScreen, { ...open.props, demoLabel: DEMO_LABEL }),
    /class="info-scrim"/);
});

test('§7.5 a failed exit step always offers a way on, and never a second send', () => {
  const by = (id: string) => {
    const scene = leavingScenes.find((entry) => entry.id === id);
    assert.ok(scene, id);
    return render(LeavingSteps, scene.props);
  };

  // The reported state: a withdrawal interrupted by the network. The retired balance is still
  // on the chain, so step three is still the member's, and the failure carries a retry.
  const interrupted = by('leaving-withdraw-network-failed');
  assert.match(interrupted, /The connection was interrupted/);
  assert.match(interrupted, /Try again/);
  // Pinned above the home indicator, not printed at the foot of a four-step page.
  assert.match(interrupted, /class="action-bar"[\s\S]*role="alert"[\s\S]*Try again/);

  // Once a hash exists the step is pending, so no control on the screen may send again.
  const unknown = by('leaving-withdraw-failed-no-resend');
  assert.match(unknown, /not clear whether that transaction was sent/);
  assert.doesNotMatch(unknown, /Try again/);

  // A read that failed locks every step, which used to leave the screen with no control at
  // all above the fold. It now carries its own.
  const unread = by('leaving-chain-unavailable');
  assert.doesNotMatch(unread, /class="primary-button"[^>]*>(?!\s*Try again)/);
  assert.match(unread, /Try again/);

  /*
   * The state the second phone report was actually in: a withdrawal included in a block that
   * did not execute, the fee spent — and then the page reloaded, so the failure is no longer
   * in React state at all. The fixture carries no `error` and no `onRetry` on purpose. The way
   * on has to come from the step, read off the chain, or it does not survive a reload.
   */
  const failedWithdraw = by('leaving-withdraw-failed');
  assert.doesNotMatch(failedWithdraw, /role="alert"/);
  assert.match(failedWithdraw, /included in a block but did not execute/);
  // Step three offers itself again, inside the step, under the explanation of what happened.
  assert.match(failedWithdraw, /did not execute[\s\S]*class="primary-button"[\s\S]*Try again/);
  // And it is the only send on the screen: steps one and two are done, four is locked.
  assert.equal(failedWithdraw.match(/class="primary-button"/g)?.length, 1);
});

test('a control that starts work says so, and never prints a count nobody read', () => {
  const scene = leavingScenes.find((entry) => entry.id === 'leaving-refreshing');
  assert.ok(scene);
  const refreshing = render(LeavingSteps, scene.props);
  // Reported from a phone: "the refresh button there when i press it nothing shows to make me
  // know its refreshing at least the button should roll". The spinner turns, and because
  // reduced motion freezes `t` the words have to change too — so both are asserted.
  assert.match(refreshing, /aria-busy="true"/);
  assert.match(refreshing, /class="spinner"/);
  assert.match(refreshing, /Refreshing…/);
  assert.doesNotMatch(refreshing, />Refresh</);

  // The spinner is a pure function of `t`, like every other moving thing in this package: two
  // different instants draw two different frames, and the same instant draws the same bytes.
  const atZero = render(LeavingSteps, { ...(scene.props as object), t: 0 });
  const later = render(LeavingSteps, { ...(scene.props as object), t: 0.4 });
  assert.notEqual(atZero, later);
  assert.equal(later, render(LeavingSteps, { ...(scene.props as object), t: 0.4 }));

  // The same defect as the squad page's, one component along: `confirmations ?? 0` turned "not
  // read" into the sentence "0 of 60 confirmations" (docs/PROGRESS.md 2026-11-09).
  const unread = render(TxStatusScene, {
    state: 'pending', hash: 'ab'.repeat(32), confirmations: null, requiredConfirmations: 60,
  });
  assert.match(unread, /has not been read yet/);
  assert.doesNotMatch(unread, /0 of 60/);
  const counted = render(TxStatusScene, {
    state: 'pending', hash: 'ab'.repeat(32), confirmations: 12, requiredConfirmations: 60,
  });
  assert.match(counted, /12 of 60/);
});

test('the screens fit a 320 px phone and no longer paint a purple page', () => {
  const css = readFileSync('packages/ui/styles.css', 'utf8');
  const tokens = readFileSync('packages/ui/tokens.css', 'utf8');

  // A 375 px floor on the screen roots made every screen scroll sideways on an iPhone SE
  // (320 px) and a folded Galaxy Z (344 px). Nothing may reintroduce one.
  assert.doesNotMatch(css, /min-width:\s*375px/);
  // The gutter is a token, so it can close up on a narrow screen; screens read it.
  assert.match(css, /padding: calc\(var\(--space-6\) \+ var\(--safe-top\)\) var\(--gutter\)/);
  assert.match(tokens, /@media \(max-width: 359px\)/);

  // The dark page was Nimiq's navy radial, which ends at #260133 and reads as purple.
  assert.doesNotMatch(tokens, /--page-image: var\(--nq-blue-bg\)/);
  for (const block of tokens.split(/\n(?=\[data-theme=|@media)/)) {
    if (!block.includes('--page:')) continue;
    assert.doesNotMatch(block, /--page: var\(--nq-blue\)/, block.slice(0, 40));
  }
  // White and black: the light page is paper, the dark page is the near-black end of the ramp,
  // and neither carries a background image.
  assert.match(tokens, /--page: var\(--nq-paper-white\);\n\s*--page-image: none/);
  assert.match(tokens, /--page: var\(--ink-900\);\n\s*--page-image: none/);
  // The one filled control is ink, not a gradient.
  assert.match(tokens, /--money-bg: var\(--ink-900\)/);
  assert.match(tokens, /--money-bg-image: none/);
});

test('§7.4 a settled squad offers no action the server would refuse', () => {
  const scene = (id: string) => {
    const found = squadPageScenes.find((entry) => entry.id === id);
    assert.ok(found, id);
    return render(SquadScreen, { ...found.props, demoLabel: DEMO_LABEL, onLeave: () => undefined });
  };
  // COMPLETED is not an active state, so `isActive` refuses both a commitment and a leave with
  // SQUAD_CLOSED (server/core/{commitments,squads}.ts). The page must not send the member to a
  // sheet that can only refuse (docs/AUDIT.md, F-2).
  const done = scene('squad-page-completed');
  assert.match(done, /This squad is complete/);
  assert.doesNotMatch(done, /Commit my share|Change my commitment|Leave squad/);
  assert.doesNotMatch(done, /class="action-bar"/);

  // An open squad still offers both, so this is a state rule and not a removal.
  const open = scene('squad-page-backed');
  assert.match(open, /class="action-bar"/);
  assert.match(open, /Commit my share|Change my commitment/);
  assert.match(open, /Leave squad/);
});
