import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRpcClient } from '../../apps/web/src/server/lib/rpc';
import { deriveMemberStatus } from '../../apps/web/src/server/core/member-status';
import { memberRelease } from '../../apps/web/src/server/core/member-release';
import { pendingView, stakeEffectSeen } from '../../apps/web/src/server/core/pending-view';
import { pendingText } from '../../packages/ui/pending';
import { recorded } from '../support/rpc';

/**
 * The three squad-page defects reported from a testnet phone run, checked against the live
 * chain rather than only against the recording (docs/PROGRESS.md 2026-11-09).
 *
 * The subject is a real staker **mid-exit**, found by following the staking contract's own
 * transaction history back to its sender: `NQ22 11TS …` had active 0 and 11,000,000 luna
 * inactive, from a `setActiveStake` included at block 16,208,043.
 *
 * It signs and sends nothing.
 */
const LEAVER = 'NQ22 11TS NJ8N BMD0 UVUM E0KL 2RPU NHM1 2RS8';
const UNSTAKE = recorded.leavingUnstakeTx.params[0] as string;
const FAILED_RETIRE = recorded.failedRetireTx.params[0] as string;

test('a visible on-chain effect can never read "0 of 60 confirmations" (live testnet)', {
  skip: process.env.LIVE_RPC !== '1', timeout: 40_000,
}, async () => {
  const rpc = createRpcClient({ url: 'https://rpc.testnet.nimiqwatch.com' });
  const head = await rpc.getBlockNumber();
  assert.ok(head.ok, JSON.stringify(head));

  const read = await rpc.getStakerByAddress(LEAVER, { fresh: true });
  assert.ok(read.ok && read.data.status === 'STAKING', JSON.stringify(read));
  const staker = read.data.staker;
  console.log('head', head.data, 'staker', staker);

  // The chain still shows this member mid-exit. If they ever finish, the assertion below is
  // the one that will say so, rather than the test quietly passing on a different shape.
  assert.ok(staker.inactiveBalance > 0 || staker.retiredBalance > 0,
    'the subject must still be mid-exit; pick another from the staking contract history');

  // The member status derived from that record — the half of the page that was always right.
  const status = deriveMemberStatus({
    staker, commitments: [staker.inactiveBalance], headBlock: head.data, releaseBlock: null });
  assert.equal(status.status, 'UNSTAKING');

  // The real inactivation, read live. The field is present and the count is far past finality:
  // neither a missing field nor a miscount was ever the cause.
  const tx = await rpc.getTransactionByHash(UNSTAKE, { fresh: true });
  assert.ok(tx.ok, JSON.stringify(tx));
  assert.equal(tx.data.executionResult, true);
  assert.equal(tx.data.blockNumber, 16_208_043);
  assert.ok((tx.data.confirmations ?? 0) > 60, `confirmations ${tx.data.confirmations}`);
  console.log('unstake tx', { blockNumber: tx.data.blockNumber,
    confirmations: tx.data.confirmations, executionResult: tx.data.executionResult });

  // The rule, against live reads: the effect is on the chain, so no phase and no wording this
  // produces may be a zero count — however little is known about the transaction itself.
  const effectSeen = stakeEffectSeen({ kind: 'unstake', staker, retiredEarlier: false });
  assert.equal(effectSeen, true);
  for (const unknown of [null, 0] as const) {
    const view = pendingView({ state: 'SUBMITTED', confirmations: unknown, effectSeen });
    assert.equal(view.phase, 'INCLUDED_CONFIRMING');
    assert.equal(view.confirmations, null);
    assert.ok(!pendingText(view).includes('0 of 60'), pendingText(view));
  }

  // `inactiveFrom` is an effective election block, not an inclusion block: live proof of the
  // invariant the release math depends on (AGENTS.md 5).
  assert.ok(staker.inactiveFrom !== null);
  assert.ok(staker.inactiveFrom > tx.data.blockNumber,
    `inactiveFrom ${staker.inactiveFrom} vs inclusion ${tx.data.blockNumber}`);

  // The release the squad page now shows, derived from that inclusion block through the shared
  // helper the leaving screen uses.
  const release = await memberRelease(
    { unstakeHash: UNSTAKE, headBlock: head.data, delegation: staker.delegation },
    { rpc, now: Date.now });
  assert.ok(release !== null, 'the release must be derivable from a real inclusion block');
  assert.ok(release.releaseBlock > tx.data.blockNumber);
  console.log('release', release, 'inactiveFrom', staker.inactiveFrom);

  // And a real included-but-failed retire still reads as a failure, not as progress.
  const failed = await rpc.getTransactionByHash(FAILED_RETIRE, { fresh: true });
  assert.ok(failed.ok, JSON.stringify(failed));
  assert.equal(failed.data.executionResult, false);
  const verdict = pendingView({ state: 'INCLUDED_FAILED',
    confirmations: failed.data.confirmations ?? null, effectSeen });
  assert.equal(verdict.phase, 'FAILED');
  console.log('failed retire', { blockNumber: failed.data.blockNumber,
    executionResult: failed.data.executionResult });
});
