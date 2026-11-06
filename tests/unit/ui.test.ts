import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignInScreen } from '../../packages/ui/SignInScreen';
import { signInScenes } from '../../packages/ui/scenes/sign-in';
import { MemberStatusBadge, MemberStatusScene } from '../../packages/ui/MemberStatusBadge';
import { memberStatusScenes } from '../../packages/ui/scenes/member-status';
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
