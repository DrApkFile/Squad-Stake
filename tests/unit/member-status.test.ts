import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveMemberStatus } from '../../apps/web/src/server/core/member-status';
import { recorded } from '../support/rpc';

const staker = recorded.staker.response.result.data;
const headBlock = recorded.head.response.result.data;
const releaseBlock = recorded.window.response.result.data;

test('Q04 BACKED and exact SHORT use the sum of commitments and only active luna', () => {
  const derive = (commitments: number[]) => deriveMemberStatus({ staker, commitments, headBlock, releaseBlock });
  assert.deepEqual(derive([staker.balance - 1, 1]), { status: 'BACKED' });
  assert.deepEqual(derive([staker.balance, 1]), { status: 'SHORT', shortBy: 1 });
  assert.deepEqual(derive([]), { status: 'BACKED' });
  assert.deepEqual(deriveMemberStatus({ staker: { ...staker, balance: 0 }, commitments: [1], headBlock, releaseBlock }),
    { status: 'SHORT', shortBy: 1 });
});

test('Q04 leaving balances derive UNSTAKING, RELEASABLE at the boundary, and RETIRED', () => {
  // Derived edge cases, not additional observed chain states; retain the S2 wire fields.
  const inactive = { ...staker, balance: 0, inactiveBalance: staker.balance, inactiveFrom: headBlock };
  const input = { staker: inactive, commitments: [staker.balance], headBlock, releaseBlock };
  assert.deepEqual(deriveMemberStatus(input), { status: 'UNSTAKING', releaseBlock });
  assert.deepEqual(deriveMemberStatus({ ...input, headBlock: releaseBlock - 1 }), { status: 'UNSTAKING', releaseBlock });
  assert.deepEqual(deriveMemberStatus({ ...input, headBlock: releaseBlock }), { status: 'RELEASABLE' });
  assert.deepEqual(deriveMemberStatus({ ...input, headBlock: releaseBlock + 1 }), { status: 'RELEASABLE' });
  assert.deepEqual(deriveMemberStatus({ ...input, releaseBlock: null }), { status: 'UNSTAKING', releaseBlock: null });
  assert.deepEqual(deriveMemberStatus({ ...input, staker: { ...staker, balance: 0, retiredBalance: staker.balance } }),
    { status: 'RETIRED' });
  assert.deepEqual(deriveMemberStatus({ ...input, staker: { ...inactive, balance: staker.balance } }), { status: 'BACKED' });
  assert.deepEqual(deriveMemberStatus({ ...input, staker: { ...inactive, retiredBalance: 1 } }),
    { status: 'UNSTAKING', releaseBlock });
});

test('Q05 an absent staker derives NOT_STAKING', () => {
  assert.deepEqual(deriveMemberStatus({ staker: null, commitments: [1], headBlock, releaseBlock: null }), { status: 'NOT_STAKING' });
});
