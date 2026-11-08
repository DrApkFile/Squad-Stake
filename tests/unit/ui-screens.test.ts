import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MySquadsScreen } from '../../packages/ui/MySquadsScreen';
import { OrbitScene } from '../../packages/ui/OrbitSquad';
import { ProofScreen } from '../../packages/ui/ProofScreen';
import { SignInScreen } from '../../packages/ui/SignInScreen';
import { SquadScreen } from '../../packages/ui/SquadScreen';
import { REDUCED_MOTION_T, typedChars } from '../../packages/ui/motion';
import { mySquadsScenes, proofScenes, squadPageScenes } from '../../packages/ui/scenes/squad-page';
import { orbitScenes } from '../../packages/ui/scenes/orbit';
import { signInScenes } from '../../packages/ui/scenes/sign-in';
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
  assert.equal(rendered, 7 + 5 + 8 + 2 + 8);
});

test('Q17 the same t always renders the same frame, and a different t renders a different one', () => {
  const scene = signInScenes.find((entry) => entry.id === 'sign-in-start');
  assert.ok(scene);
  const at = (t: number) => render(SignInScreen, { ...scene.props, t });
  // Determinism is what lets Remotion render frame by frame (AGENTS.md "UI purity" 6).
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
    /Check the chain again/);

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
  // The centre figure is a dash, not a zero and not a guess; the target beside it is known.
  assert.match(markup, /class="orbit-total" data-size="[a-z]+">—</);
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
