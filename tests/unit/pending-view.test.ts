import assert from 'node:assert/strict';
import test from 'node:test';
import {
  pendingView, stakeEffectSeen,
} from '../../apps/web/src/server/core/pending-view';
import { transactionSchema, stakerSchema } from '../../apps/web/src/server/lib/rpc-schemas';
import { pendingText } from '../../packages/ui/pending';
import { recorded } from '../support/rpc';

/**
 * The real testnet responses behind these tests, recorded on 2026-11-09 (provenance in
 * `tests/fixtures/rpc/README.md`):
 *
 * - `leavingStaker` — `NQ22 11TS …`, a staker **mid-exit**: active 0, inactive 11,000,000 luna.
 * - `leavingUnstakeTx` — `0ad4e4a1…`, that member's own `setActiveStake`: included at block
 *   16,208,043, `executionResult: true`, 82,366 confirmations when recorded.
 * - `failedRetireTx` — `70a282c0…`, a real **included-but-failed** `retireStake`.
 *
 * They are parsed through the production schemas, so a test cannot quietly use a shape the
 * wire parser would reject.
 */
const leavingStaker = stakerSchema.parse(recorded.leavingStaker.response.result.data);
const unstakeTx = transactionSchema.parse(recorded.leavingUnstakeTx.response.result.data);
const failedRetire = transactionSchema.parse(recorded.failedRetireTx.response.result.data);

test('the real unstake plus the real staker record can never read "0 of 60 confirmations"', () => {
  // Sanity-check the recording still says what the test is about.
  assert.equal(leavingStaker.inactiveBalance, 11_000_000);
  assert.equal(unstakeTx.executionResult, true);
  assert.ok((unstakeTx.confirmations ?? 0) > 60);

  const effectSeen = stakeEffectSeen({
    kind: 'unstake', staker: leavingStaker, retiredEarlier: false,
  });
  assert.equal(effectSeen, true, 'inactive stake on the chain is the effect of an inactivation');

  // The tracker settles this transaction as final, because it executed and is 82,366 deep.
  const settled = pendingView({
    state: 'INCLUDED_OK', confirmations: unstakeTx.confirmations ?? null, effectSeen,
  });
  assert.equal(settled.phase, 'FINAL');
  assert.equal(settled.confirmations, unstakeTx.confirmations);

  /**
   * The regression itself. This is the shape the squad page was actually in on the phone: a
   * row still stored as SUBMITTED, no count read for it, and the chain already showing the
   * inactive stake. It must not produce a zero of any kind.
   */
  const asTheBugHadIt = pendingView({ state: 'SUBMITTED', confirmations: null, effectSeen });
  assert.equal(asTheBugHadIt.phase, 'INCLUDED_CONFIRMING');
  assert.equal(asTheBugHadIt.confirmations, null, 'a count nobody read stays unread');
  assert.notEqual(asTheBugHadIt.confirmations, 0);
  assert.equal(pendingText(asTheBugHadIt), 'On the chain · confirming');
  assert.ok(!pendingText(asTheBugHadIt).includes('0 of 60'), 'the defect, in words');

  // Nor when the node answers 0 for a transaction whose effect is already visible: the two
  // cannot both be true, and the count is the less trustworthy of them.
  const zeroFromTheNode = pendingView({ state: 'SUBMITTED', confirmations: 0, effectSeen });
  assert.equal(zeroFromTheNode.phase, 'INCLUDED_CONFIRMING');
  assert.equal(zeroFromTheNode.confirmations, null);

  // A real count below finality is kept and shown as the climb it is.
  const climbing = pendingView({ state: 'SUBMITTED', confirmations: 12, effectSeen });
  assert.deepEqual(climbing,
    { phase: 'INCLUDED_CONFIRMING', confirmations: 12, requiredConfirmations: 60 });
  assert.equal(pendingText(climbing), 'On the chain · 12 of 60 confirmations');
});

test('an unreadable transaction says so, and no elapsed time makes it a failure (Q10)', () => {
  // No effect on the chain and no readable transaction: unknown, with nothing printed as a
  // digit. This is the honest version of what the page used to call "0 of 60".
  const unknown = pendingView({ state: 'UNKNOWN', confirmations: null, effectSeen: false });
  assert.deepEqual(unknown,
    { phase: 'UNKNOWN', confirmations: null, requiredConfirmations: 60 });
  assert.equal(pendingText(unknown), 'Checking the chain');

  // Submitted with nothing yet on the chain is still allowed to say zero, because zero is what
  // the node reported about a transaction with no visible effect.
  const fresh = pendingView({ state: 'SUBMITTED', confirmations: 0, effectSeen: false });
  assert.equal(fresh.phase, 'SUBMITTED');
  assert.equal(fresh.confirmations, 0);
  assert.equal(pendingText(fresh), 'Sent · 0 of 60 confirmations');
});

test('a real included-but-failed retire outranks a visible effect', () => {
  assert.equal(failedRetire.executionResult, false, 'the recording is the failed one');
  // An earlier successful inactivation leaves inactive stake behind, so the "effect" of a
  // retire looks present while this retire itself failed. The verdict read from the
  // transaction wins; a failure is never dressed up as progress.
  const verdict = pendingView({
    state: 'INCLUDED_FAILED',
    confirmations: failedRetire.confirmations ?? null,
    effectSeen: stakeEffectSeen({
      kind: 'retire', staker: { ...leavingStaker, retiredBalance: 5_000 }, retiredEarlier: true,
    }),
  });
  assert.equal(verdict.phase, 'FAILED');
  assert.equal(pendingText(verdict), 'That transaction failed');
});

test('an effect is only inferred where a staker record can actually show one', () => {
  const staking = { ...leavingStaker, inactiveBalance: 0, retiredBalance: 0 };
  // A deposit cannot be told from any other transfer into the same stake, and a Mode A payment
  // is a transfer to a third party judged by §7.6. Neither is ever inferred from a balance.
  for (const kind of ['create', 'add', 'pay'] as const) {
    assert.equal(stakeEffectSeen({ kind, staker: leavingStaker, retiredEarlier: true }), false,
      kind);
  }
  // Nothing out of the active balance yet: no effect, so the row says "sent".
  assert.equal(stakeEffectSeen({ kind: 'unstake', staker: staking, retiredEarlier: false }), false);
  // Retired stake is an inactivation's effect too — it got there through one.
  assert.equal(stakeEffectSeen({
    kind: 'unstake', staker: { ...staking, retiredBalance: 7 }, retiredEarlier: false }), true);
  // A withdrawal is only legible beside a retire this app watched succeed; an empty retired
  // balance on its own means nothing at all.
  assert.equal(stakeEffectSeen({ kind: 'remove', staker: staking, retiredEarlier: false }), false);
  assert.equal(stakeEffectSeen({ kind: 'remove', staker: staking, retiredEarlier: true }), true);
  // No staker record left: everything has gone, whichever leaving step is being watched.
  for (const kind of ['unstake', 'retire', 'remove'] as const) {
    assert.equal(stakeEffectSeen({ kind, staker: null, retiredEarlier: false }), true, kind);
  }
});
