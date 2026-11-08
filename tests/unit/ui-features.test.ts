import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateSquadScreen } from '../../packages/ui/CreateSquadScreen';
import { JoinCommitSheet } from '../../packages/ui/JoinCommitSheet';
import { MySquadsScreen } from '../../packages/ui/MySquadsScreen';
import { SquadScreen } from '../../packages/ui/SquadScreen';
import {
  featureCommitScenes, featureCreateScenes, featureMySquadsScenes, featureSquadScenes,
} from '../../packages/ui/scenes/features';
import { DEMO_LABEL, demoPoolDirect, demoPoolFallback } from '../../packages/ui/scenes/demo/squad';
import { strings } from '../../packages/ui/i18n';

const render = (component: unknown, props: unknown) =>
  renderToStaticMarkup(createElement(component as never, props as never));

test('Q17 every pool, earned, fiat, template and language scene renders from props alone', () => {
  const groups = [
    { component: JoinCommitSheet, scenes: featureCommitScenes },
    { component: SquadScreen, scenes: featureSquadScenes },
    { component: MySquadsScreen, scenes: featureMySquadsScenes },
    { component: CreateSquadScreen, scenes: featureCreateScenes },
  ] as const;
  let rendered = 0;
  for (const { component, scenes } of groups) {
    for (const scene of scenes) {
      const props = { ...scene.props, demoLabel: DEMO_LABEL };
      const first = render(component, props);
      assert.equal(first, render(component, props), scene.id);
      assert.match(first, /SAMPLE DATA/, scene.id);
      rendered++;
    }
  }
  // commit 4 + squad 4 + my squads 1 + create 2, each of the three screens in four more
  // languages (12).
  assert.equal(rendered, 4 + 4 + 1 + 2 + 12);
});

test('§7.7 the pool is named with its fee before the approval, and the fallback admits it', () => {
  const restake = featureCommitScenes.find((scene) => scene.id === 'pool-restake');
  assert.ok(restake);
  const markup = render(JoinCommitSheet, { ...restake.props, demoLabel: DEMO_LABEL });
  assert.match(markup, /Sample Restake Pool · 5% fee/);
  assert.match(markup, /Rewards are added to your stake/);
  assert.match(markup, /Validators API/);
  // A restake pool's payout schedule is not a promise this screen makes.
  assert.doesNotMatch(markup, /Every 12 hours/);

  const direct = render(JoinCommitSheet, {
    ...restake.props, pool: demoPoolDirect, demoLabel: DEMO_LABEL });
  assert.match(direct, /Rewards are paid out to your wallet \(Every 3 hours\)/);

  // With no directory the sheet shows no fee and no payout type at all, and says why.
  const fallback = render(JoinCommitSheet, {
    ...restake.props, pool: demoPoolFallback, demoLabel: DEMO_LABEL });
  assert.match(fallback, /Pool details unavailable/);
  assert.doesNotMatch(fallback, /%/);
  assert.doesNotMatch(fallback, /Rewards are/);

  // No pool is shown where no stake is being created: a commitment that fits needs no validator.
  const ready = featureCommitScenes.find((scene) => scene.id === 'pool-not-shown-when-ready');
  assert.ok(ready);
  assert.doesNotMatch(render(JoinCommitSheet, { ...ready.props, demoLabel: DEMO_LABEL }),
    /Your validator/);
});

test('§9.12 earned is a measured figure or a dash with a reason, never an estimate', () => {
  const measured = featureSquadScenes.find((scene) => scene.id === 'earned-measured');
  const unknown = featureSquadScenes.find((scene) => scene.id === 'earned-unknown');
  assert.ok(measured && unknown);
  const markup = render(SquadScreen, { ...measured.props, demoLabel: DEMO_LABEL });
  assert.match(markup, /Earned since joining/);
  assert.match(markup, /\+14\.82 NIM/);                       // the measurement itself
  assert.match(markup, /Measured from the chain, never estimated/);
  assert.match(markup, /minus the 2,000 NIM of deposits/);    // what it was measured from
  assert.match(markup, /12 payouts from the pool’s payout address/);
  // The reasons are sentences, and the figure beside them is a dash.
  const dashes = render(SquadScreen, { ...unknown.props, demoLabel: DEMO_LABEL });
  assert.match(dashes, /member-earned-value">—</);
  assert.doesNotMatch(dashes, /\+\d/);
  assert.doesNotMatch(dashes, /Measured from the chain/);
  assert.match(dashes, /Validators API could not be read/);
  assert.match(dashes, /has not published the address it pays from/);
  // The "why" is a disclosure, so it needs no JavaScript and no state to open.
  assert.match(dashes, /<details class="member-earned"/);
  assert.match(dashes, /<summary>/);
});

test('§9.11 a fiat figure is always "≈", always an estimate, and absent when there is no price', () => {
  const withFiat = featureSquadScenes.find((scene) => scene.id === 'fiat-estimate');
  const base = featureSquadScenes.find((scene) => scene.id === 'earned-measured');
  assert.ok(withFiat && base);
  const markup = render(SquadScreen, { ...withFiat.props, demoLabel: DEMO_LABEL });
  assert.match(markup, /≈ /);
  assert.match(markup, /estimate/);
  assert.match(markup, /CoinGecko/);
  // Without a rate the screen says nothing about money it has not priced. ("never estimated"
  // in the earned row is the opposite claim, so the needle is the estimate line itself.)
  const none = render(SquadScreen, { ...base.props, fiat: null, demoLabel: DEMO_LABEL });
  assert.doesNotMatch(none, /≈/);
  assert.doesNotMatch(none, /· estimate/);
  assert.doesNotMatch(none, /CoinGecko/);
  const cards = featureMySquadsScenes[0];
  assert.ok(cards);
  assert.match(render(MySquadsScreen, { ...cards.props, demoLabel: DEMO_LABEL }), /≈ /);
});

test('§10 the create screen offers templates and the longest translations still fit the markup', () => {
  const offered = featureCreateScenes.find((scene) => scene.id === 'templates-offered');
  assert.ok(offered);
  const markup = render(CreateSquadScreen, { ...offered.props, demoLabel: DEMO_LABEL });
  for (const label of ['Trip', 'Gift', 'Gadget', 'Rent buffer', 'Event']) {
    assert.match(markup, new RegExp(label), label);
  }
  assert.match(markup, /Start from scratch/);
  // Every language renders the same screen, in its own words, from the same component.
  for (const scene of featureCreateScenes.filter((entry) => entry.id.startsWith('lang-'))) {
    const lang = scene.id.split('-')[1] as 'es' | 'de' | 'fr' | 'pt';
    const frame = render(CreateSquadScreen, { ...scene.props, demoLabel: DEMO_LABEL });
    assert.match(frame, new RegExp(strings(lang).templates.label), scene.id);
    assert.match(frame, new RegExp(strings(lang).create.submit), scene.id);
  }
});
