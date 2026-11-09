import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeavingSteps } from '../../packages/ui/LeavingSteps';
import { MySquadsScreen } from '../../packages/ui/MySquadsScreen';
import { OrbitScene } from '../../packages/ui/OrbitSquad';
import { ProofScreen } from '../../packages/ui/ProofScreen';
import { SignInScreen } from '../../packages/ui/SignInScreen';
import { PayShareSheet } from '../../packages/ui/PayShareSheet';
import { SquadScreen } from '../../packages/ui/SquadScreen';
import { TxStatusScene } from '../../packages/ui/TxStatus';
import { REDUCED_MOTION_T, typedChars } from '../../packages/ui/motion';
import { mySquadsScenes, proofScenes, squadPageScenes } from '../../packages/ui/scenes/squad-page';
import { orbitScenes } from '../../packages/ui/scenes/orbit';
import { leavingScenes } from '../../packages/ui/scenes/leaving';
import { payShareScenes, txStatusScenes } from '../../packages/ui/scenes/payment';
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
    { component: LeavingSteps, scenes: leavingScenes },
    { component: PayShareSheet, scenes: payShareScenes },
    { component: TxStatusScene, scenes: txStatusScenes },
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
  assert.equal(rendered, 7 + 5 + 18 + 3 + 8 + 3 + 22 + 13 + 4);
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
