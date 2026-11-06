import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignInScreen } from '../../packages/ui/SignInScreen';
import { signInScenes } from '../../packages/ui/scenes/sign-in';
import { MemberStatusBadge, MemberStatusScene } from '../../packages/ui/MemberStatusBadge';
import { memberStatusScenes } from '../../packages/ui/scenes/member-status';
import { PrivacyNotice } from '../../packages/ui/PrivacyNotice';
import { CreateSquadScreen } from '../../packages/ui/CreateSquadScreen';
import { JoinCommitSheet } from '../../packages/ui/JoinCommitSheet';
import { LeaveConfirm } from '../../packages/ui/LeaveConfirm';
import { createSquadScenes, joinCommitScenes, leaveScenes, privacyScenes } from '../../packages/ui/scenes/squad-flow';
import { DEMO_LABEL } from '../../packages/ui/scenes/demo/squad';
import { errors } from '../../apps/web/src/core/errors/catalog';

test('Q17 all five sign-in scenes render deterministically from props alone', () => {
  assert.equal(signInScenes.length, 5);
  for (const scene of signInScenes) {
    const first = renderToStaticMarkup(createElement(SignInScreen, scene.props));
    assert.equal(first, renderToStaticMarkup(createElement(SignInScreen, scene.props)));
    assert.match(first, /Signing in doesn’t move any NIM/);
    if (scene.props.state.status === 'waiting') {
      assert.match(first, /disabled/);
      assert.match(first, /Approve in Nimiq Pay/);
    }
  }
});

test('Q17 every member status scene renders deterministically with explicit read age and countdown', () => {
  const statuses = new Set(memberStatusScenes.flatMap((scene) => scene.props.state ? [scene.props.state.status] : []));
  assert.deepEqual([...statuses].sort(), ['BACKED', 'NOT_STAKING', 'RELEASABLE', 'RETIRED', 'SHORT', 'UNSTAKING']);
  for (const scene of memberStatusScenes) {
    const props = { ...scene.props, demoLabel: 'SYNTHETIC TESTNET UI FIXTURE' };
    const first = renderToStaticMarkup(createElement(MemberStatusScene, props));
    assert.equal(first, renderToStaticMarkup(createElement(MemberStatusScene, props)));
    assert.match(first, scene.props.readAt === null ? /Chain read: —/ : /Checked/);
    assert.match(first, /SYNTHETIC TESTNET/);
    if (scene.id === 'member-short') assert.match(first, /Short by 0.00001 NIM/);
    if (scene.id === 'member-stale') assert.match(first, /Checked 3 min ago · Refresh unavailable/);
    if ('refreshError' in scene.props) assert.deepEqual(scene.props.refreshError, {
      message: errors.CHAIN_UNAVAILABLE.message, nextAction: errors.CHAIN_UNAVAILABLE.nextAction,
    });
    if (scene.id === 'member-waiting-for-chain') assert.match(first, /Waiting for chain confirmation/);
  }
  const missing = renderToStaticMarkup(createElement(MemberStatusBadge, { state: { status: 'BACKED' }, readAt: null, now: 0 }));
  assert.match(missing, /Chain read: —/);
  assert.doesNotMatch(missing, /Backed/);
});

test('Q17 every squad-flow scene renders deterministically from props alone', () => {
  const screens = [
    { component: PrivacyNotice, scenes: privacyScenes },
    { component: CreateSquadScreen, scenes: createSquadScenes },
    { component: JoinCommitSheet, scenes: joinCommitScenes },
    { component: LeaveConfirm, scenes: leaveScenes },
  ] as const;
  for (const { component, scenes } of screens) {
    assert.ok(scenes.length > 0);
    for (const scene of scenes) {
      const props = { ...scene.props, demoLabel: DEMO_LABEL };
      const first = renderToStaticMarkup(createElement(component as never, props));
      assert.equal(first, renderToStaticMarkup(createElement(component as never, props)), scene.id);
      assert.match(first, /SAMPLE DATA/, scene.id);
    }
  }
});

test('Q17 the commit sheet covers every PRD §7.3 state and never calls a hash success', () => {
  const statuses = new Set(joinCommitScenes.map((scene) => scene.props.state.status));
  assert.deepEqual([...statuses].sort(), ['committed', 'failed', 'needs-stake', 'not-staking',
    'pending', 'ready', 'waiting']);
  for (const scene of joinCommitScenes) {
    const markup = renderToStaticMarkup(createElement(JoinCommitSheet,
      { ...scene.props, demoLabel: DEMO_LABEL }));
    // Every state shows the age of the chain read, or says there is none.
    assert.match(markup, scene.props.readAt === null ? /Chain read: —/ : /Checked/, scene.id);
    if (scene.props.state.status === 'pending') {
      assert.match(markup, /12 of 60 confirmations/);
      assert.match(markup, /A hash is not\s+success/);
      assert.match(markup, /disabled/);
    }
    if (scene.id === 'commit-committed') assert.match(markup, /Committed 2,000 NIM/);
    if (scene.id === 'commit-declined') assert.match(markup, /Nothing changed/);
    if (scene.id === 'commit-failed') assert.doesNotMatch(markup, /Nothing changed/);
  }
});

test('Q17 the create screen shows both modes, the minimum date and the share step', () => {
  const modeB = createSquadScenes.find((scene) => scene.props.values.mode === 'B');
  assert.ok(modeB);
  const markup = renderToStaticMarkup(createElement(CreateSquadScreen, modeB.props));
  assert.match(markup, /Your target \(NIM\)/);
  assert.doesNotMatch(markup, /Recipient address/);
  const modeA = createSquadScenes.find((scene) => scene.id === 'create-mode-a');
  assert.ok(modeA);
  const markupA = renderToStaticMarkup(createElement(CreateSquadScreen, modeA.props));
  assert.match(markupA, /Recipient address/);
  assert.match(markupA, /min="2026-11-09"/);
  const shared = createSquadScenes.find((scene) => scene.props.created);
  assert.ok(shared);
  const markupShared = renderToStaticMarkup(createElement(CreateSquadScreen, shared.props));
  assert.match(markupShared, /is ready/);
  assert.doesNotMatch(markupShared, /Goal date/);
});
