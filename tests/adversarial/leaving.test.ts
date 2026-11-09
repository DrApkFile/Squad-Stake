import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STAKING_FEES_LUNA } from '../../apps/web/src/config/constants';
import { planLeaving, planRemove, planRetire } from '../../apps/web/src/core/staking-actions';
import { leavePlan } from '../../apps/web/src/server/core/leave-plan';
import { createTxTracker } from '../../apps/web/src/server/core/tx-tracker';
import { sendLeavingAction, sendPayment } from '../../apps/web/src/wallet/staking';
import { ADDRESSES, planHarness, staker, transaction } from '../support/squads';
import { blockedAdapter, recordingAdapter, type RecordedCall } from '../support/wallet';

const DAY = 86_400_000;
const SHARE = 200_000_000;
const UNSTAKE_HASH = '9'.repeat(64);
const RETIRE_HASH = 'a'.repeat(64);

async function leavingSquad() {
  const context = planHarness();
  const created = await context.squads.create(ADDRESSES.alice, { mode: 'B', name: 'Winter buffers',
    goalAt: context.at() + 30 * DAY, personalTargetLuna: SHARE });
  assert.ok(created.ok);
  context.commit(created.id, ADDRESSES.alice, SHARE);
  context.setStaker(staker(100_000_000, { address: ADDRESSES.alice, inactiveBalance: SHARE }));
  context.setTransaction(transaction({ hash: UNSTAKE_HASH, blockNumber: 14_819_000 }));
  context.track({ hash: UNSTAKE_HASH, address: ADDRESSES.alice, squadId: created.id,
    kind: 'unstake', expected: { valueLuna: SHARE }, state: 'INCLUDED_OK', checkedAt: context.at() });
  return { context, squadId: created.id };
}

test('Q11 a retire forced before the release block comes back failed with nothing lost', async () => {
  const { context, squadId } = await leavingSquad();
  // The plan says "waiting": the chain is nowhere near the release block.
  const waiting = await leavePlan(squadId, ADDRESSES.alice, context.deps);
  assert.ok(waiting.ok);
  assert.deepEqual(waiting.view.steps.retire, { state: 'waiting' });
  const releaseBlock = waiting.view.release?.releaseBlock ?? 0;
  assert.ok(releaseBlock > (waiting.view.headBlock ?? 0));
  // The pure planner refuses to build the transaction at all, whatever the screen did.
  assert.deepEqual(planRetire({ inactiveBalanceLuna: SHARE,
    headBlock: waiting.view.headBlock ?? 0, releaseBlock }),
  { kind: 'blocked', reason: 'NOT_RELEASABLE' });

  // Suppose it was sent anyway — a stale page, or a hand-made call. The staking contract
  // rejects it, so the transaction is included and fails (FAILURE_MODES "retire before
  // release"). The tracker must call that a failure, not a wait and not a success.
  context.setTransaction(transaction({ hash: RETIRE_HASH, executionResult: false,
    blockNumber: 14_820_000, confirmations: 60 }));
  assert.ok(await context.store.insertTrackedTx({ hash: RETIRE_HASH, address: ADDRESSES.alice,
    squadId, kind: 'retire', expected: { valueLuna: SHARE }, state: 'SUBMITTED', checkedAt: null }));
  const tracker = createTxTracker({ store: context.store, rpc: context.rpc, now: context.at });
  const checked = await tracker.check(RETIRE_HASH);
  assert.ok(checked.ok && checked.state === 'INCLUDED_FAILED');

  const after = await leavePlan(squadId, ADDRESSES.alice, context.deps);
  assert.ok(after.ok);
  assert.deepEqual(after.view.steps.retire, { state: 'failed', hash: RETIRE_HASH });
  // Nothing moved: the stake is still inactivating, nothing is retired, and withdraw stays shut.
  assert.equal(after.view.stake?.inactiveLuna, SHARE);
  assert.equal(after.view.stake?.retiredLuna, 0);
  assert.deepEqual(after.view.steps.withdraw, { state: 'locked' });
  // And with nothing retired there is no withdrawal to build either.
  assert.deepEqual(planRemove({ retiredBalanceLuna: after.view.stake?.retiredLuna ?? 0 }),
    { kind: 'blocked', reason: 'NOTHING_TO_WITHDRAW' });
});

test('§7.5 the plan is one member’s own, and nobody else can ask for it', async () => {
  const { context, squadId } = await leavingSquad();
  // A stranger gets no plan at all — not a redacted one.
  assert.deepEqual(await leavePlan(squadId, ADDRESSES.bob, context.deps),
    { ok: false, code: 'NOT_A_MEMBER' });
  // A member of the squad who is asking about it still only ever sees their own stake and
  // their own commitments: the plan takes one address and reads only that staker.
  context.commit(squadId, ADDRESSES.bob, SHARE);
  const theirs = await leavePlan(squadId, ADDRESSES.bob, context.deps);
  assert.ok(theirs.ok);
  assert.deepEqual([...theirs.view.commitments].map((entry) => entry.squadId), [squadId]);
  const body = JSON.stringify(theirs.view);
  // No other member's address is anywhere in bob's plan: there is no roster of people in it,
  // only his own stake, his own commitments and the squad's own public fields. (The harness
  // scripts one staker record for every address, so the balances cannot tell them apart —
  // what is asserted here is that no second member appears at all.)
  assert.doesNotMatch(body, new RegExp(ADDRESSES.alice));
  assert.equal(JSON.parse(body).roster, null);
});

test('Q13 a second wallet call while one is open is refused, and nothing is retried', async () => {
  const calls: RecordedCall[] = [];
  let release = () => undefined as void;
  const held = new Promise<void>((resolve) => { release = () => resolve(); });
  const adapter = recordingAdapter(calls, held);

  const first = sendLeavingAction({ kind: 'retire-stake', retireStakeLuna: SHARE,
    feeLuna: STAKING_FEES_LUNA.retire }, adapter);
  // While the approval sheet is open: a second tap, and a different call entirely.
  assert.deepEqual(await sendLeavingAction({ kind: 'remove-stake', valueLuna: SHARE, feeLuna: 0 },
    adapter), { ok: false, code: 'TX_PENDING' });
  assert.deepEqual(await sendPayment({ kind: 'pay', recipient: ADDRESSES.carol,
    valueLuna: SHARE, data: 'sq:k3m9p2qr' }, adapter), { ok: false, code: 'TX_PENDING' });
  release();
  assert.deepEqual(await first, { ok: true, hash: 'd'.repeat(64) });
  // Exactly one provider call reached Nimiq Pay, and it was the retire.
  assert.deepEqual(calls.map((call) => call.method), ['retire']);
  // The guard releases afterwards, so the next genuine tap works.
  assert.ok((await sendLeavingAction({ kind: 'remove-stake', valueLuna: SHARE, feeLuna: 0 },
    adapter)).ok);
  assert.deepEqual(calls.map((call) => call.method), ['retire', 'remove']);
});

test('Q14 outside Nimiq Pay, or on the wrong network, no leaving or paying call is made', async () => {
  for (const code of ['OUTSIDE_HOST', 'WRONG_NETWORK'] as const) {
    const adapter = blockedAdapter(code);
    assert.deepEqual(await sendLeavingAction({ kind: 'set-active-stake',
      newActiveBalanceLuna: 0, feeLuna: STAKING_FEES_LUNA.unstake }, adapter),
    { ok: false, code });
    assert.deepEqual(await sendPayment({ kind: 'pay', recipient: ADDRESSES.carol,
      valueLuna: SHARE, data: 'sq:k3m9p2qr' }, adapter), { ok: false, code });
  }
});

test('§7.6 a declined approval is not a payment, and an unmapped failure is never "nothing happened"', async () => {
  const calls: RecordedCall[] = [];
  const declined = recordingAdapter(calls, Promise.resolve(),
    { throws: true, errorCode: () => 'TX_DECLINED' });
  assert.deepEqual(await sendPayment({ kind: 'pay', recipient: ADDRESSES.carol, valueLuna: SHARE,
    data: 'sq:k3m9p2qr' }, declined), { ok: false, code: 'TX_DECLINED' });
  // An error the SDK does not name could still have reached the chain, so the outcome is
  // unknown — never a clean "nothing happened" (BUILD_CONTRACT: no fake success, no fake
  // failure). The caller then tracks nothing and re-reads instead of resending.
  const unmapped = recordingAdapter(calls, Promise.resolve(), { throws: true });
  assert.deepEqual(await sendPayment({ kind: 'pay', recipient: ADDRESSES.carol, valueLuna: SHARE,
    data: 'sq:k3m9p2qr' }, unmapped), { ok: false, code: 'TX_OUTCOME_UNKNOWN' });
  // Both attempts were sent exactly once each; neither was retried.
  assert.deepEqual(calls.map((call) => call.method), ['pay', 'pay']);
});

test('§7.5 a second inactivation is impossible once leaving has started', async () => {
  const commitments = [{ squadId: 'squad-1', name: 'Winter buffers', committedLuna: SHARE }];
  const notLeavingYet = { inactiveBalanceLuna: 0, retiredBalanceLuna: 0, unstakeOpen: false };
  const base = { activeBalanceLuna: 100_000_000, commitments, squadId: 'squad-1',
    amountLuna: 50_000_000 };

  // The state the phone was in: the first inactivation has landed, so the member already has
  // inactive stake. A second one would replace their active balance again — the provider takes
  // the resulting balance, not a delta — so it must be refused, not merely unoffered.
  assert.deepEqual(planLeaving({ ...base, ...notLeavingYet, inactiveBalanceLuna: SHARE }),
    { kind: 'blocked', reason: 'ALREADY_LEAVING' });
  // After the retire, too: the stake is still in the pipeline.
  assert.deepEqual(planLeaving({ ...base, ...notLeavingYet, retiredBalanceLuna: 1 }),
    { kind: 'blocked', reason: 'ALREADY_LEAVING' });
  // And while the first inactivation is still open, when the chain shows nothing yet: this is
  // the window a double tap or a stale page would exploit.
  assert.deepEqual(planLeaving({ ...base, ...notLeavingYet, unstakeOpen: true }),
    { kind: 'blocked', reason: 'ALREADY_LEAVING' });
  // The refusal comes before any amount check, so a plausible amount cannot slip past it.
  assert.deepEqual(planLeaving({ ...base, ...notLeavingYet, inactiveBalanceLuna: SHARE,
    amountLuna: 100_000_000 }), { kind: 'blocked', reason: 'ALREADY_LEAVING' });
  // A member who has not started still gets their plan.
  assert.equal(planLeaving({ ...base, ...notLeavingYet }).kind, 'set-active-stake');
});

test('§7.5 the leaving screen never offers step one again, so nothing is sent twice', async () => {
  const { context, squadId } = await leavingSquad();
  const plan = await leavePlan(squadId, ADDRESSES.alice, context.deps);
  assert.ok(plan.ok);
  // The chain shows inactive stake, so step one is finished, not available.
  assert.equal(plan.view.steps.start.state, 'done');
  assert.notEqual(plan.view.steps.start.state, 'available');

  // Even with the tracked inactivation still open and no inactive stake read yet, step one is
  // "pending" rather than available: an open transaction is not an invitation to send another.
  context.setStaker(staker(300_000_000, { address: ADDRESSES.alice }));
  context.track({ hash: '7'.repeat(64), address: ADDRESSES.alice, squadId,
    kind: 'unstake', expected: { valueLuna: SHARE }, state: 'SUBMITTED', checkedAt: null });
  const open = await leavePlan(squadId, ADDRESSES.alice, context.deps);
  assert.ok(open.ok);
  assert.equal(open.view.steps.start.state, 'pending');

  // And the planner refuses the figures this very screen is holding, so a client that posted
  // past the step gate still gets nothing to send to the wallet.
  assert.deepEqual(planLeaving({
    activeBalanceLuna: open.view.stake?.activeLuna ?? null,
    commitments: open.view.commitments,
    squadId,
    amountLuna: open.view.shareLuna,
    inactiveBalanceLuna: open.view.stake?.inactiveLuna ?? 0,
    retiredBalanceLuna: open.view.stake?.retiredLuna ?? 0,
    unstakeOpen: open.view.steps.start.state === 'pending',
  }), { kind: 'blocked', reason: 'ALREADY_LEAVING' });
});
