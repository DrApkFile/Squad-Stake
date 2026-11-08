import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leavePlan } from '../../apps/web/src/server/core/leave-plan';
import { paymentDataHex } from '../../apps/web/src/server/core/payment-check';
import { ADDRESSES, planHarness, staker, transaction } from '../support/squads';

const DAY = 86_400_000;
const SHARE = 200_000_000;
const UNSTAKE_HASH = '1'.repeat(64);
const PAY_HASH = '2'.repeat(64);
/** The block the inactivation landed in: what release is counted from (PRD §7.5, S3 v3). */
const INCLUSION_BLOCK = 14_819_000;

async function setup(options: { mode?: 'A' | 'B' } = {}) {
  const context = planHarness();
  const mode = options.mode ?? 'B';
  const created = mode === 'A'
    ? await context.squads.create(ADDRESSES.alice, { mode: 'A', name: 'Lisbon in April',
      goalAt: context.at() + 30 * DAY, targetLuna: 600_000_000, recipient: ADDRESSES.carol })
    : await context.squads.create(ADDRESSES.alice, { mode: 'B', name: 'Winter buffers',
      goalAt: context.at() + 30 * DAY, personalTargetLuna: SHARE });
  assert.ok(created.ok);
  context.commit(created.id, ADDRESSES.alice, SHARE);
  return { context, squadId: created.id };
}

const plan = async (context: Awaited<ReturnType<typeof setup>>['context'], squadId: string) => {
  const result = await leavePlan(squadId, ADDRESSES.alice, context.deps);
  assert.ok(result.ok, JSON.stringify(result));
  return result.view;
};

test('Q06 release is counted from the inactivation transaction’s inclusion block, never from inactiveFrom', async () => {
  const { context, squadId } = await setup();
  // inactiveFrom is a wildly different, much later block on purpose: if the planner ever fed
  // it to calculateRelease the recorded election/window answers below would not come back.
  context.setStaker(staker(100_000_000, { address: ADDRESSES.alice, inactiveBalance: SHARE,
    inactiveFrom: 15_900_000 }));
  context.setTransaction(transaction({ hash: UNSTAKE_HASH, blockNumber: INCLUSION_BLOCK }));
  context.track({ hash: UNSTAKE_HASH, address: ADDRESSES.alice, squadId, kind: 'unstake',
    expected: { valueLuna: SHARE }, state: 'INCLUDED_OK', checkedAt: context.at() });

  const view = await plan(context, squadId);
  assert.equal(view.release?.releaseBlock, context.blocks.window);
  assert.equal(view.release?.jailed, false);
  assert.equal(view.release?.remainingBlocks, context.blocks.window - context.blocks.head);
  // getElectionBlockAfter was asked about the inclusion block, and the reporting window about
  // the election block it answered with — the §7.5 chain, in that order.
  assert.ok(context.calls.includes(`election:${INCLUSION_BLOCK}`), context.calls.join(','));
  assert.ok(context.calls.includes(`window:${context.blocks.election}`));
  assert.ok(!context.calls.some((call) => call.startsWith('jail:')));
  // The balances the wallet will be handed come from a read that bypassed the display cache.
  assert.ok(context.calls.includes('staker:fresh'));
  assert.equal(view.stake?.inactiveLuna, SHARE);
  assert.equal(view.chainUnavailable, false);
});

test('Q07 a jailed validator pushes the release out, and an unreadable one leaves it unknown', async () => {
  const { context, squadId } = await setup();
  context.setStaker(staker(100_000_000, { address: ADDRESSES.alice, inactiveBalance: SHARE,
    delegation: ADDRESSES.bob }));
  context.setTransaction(transaction({ hash: UNSTAKE_HASH, blockNumber: INCLUSION_BLOCK }));
  context.track({ hash: UNSTAKE_HASH, address: ADDRESSES.alice, squadId, kind: 'unstake',
    expected: { valueLuna: SHARE }, state: 'INCLUDED_OK', checkedAt: context.at() });

  // A validator with jailedFrom set: the release is the later of the window and after-jail,
  // and on the recorded testnet answers after-jail is the later one.
  context.setValidator({ address: ADDRESSES.bob, signingKey: 'f'.repeat(64),
    votingKey: 'f'.repeat(570), rewardAddress: ADDRESSES.bob, signalData: null,
    balance: 100_000_000_000, numStakers: 3, retired: false, inactivityFlag: null,
    jailedFrom: 15_100_000 });
  const jailed = await plan(context, squadId);
  assert.equal(jailed.release?.releaseBlock, context.blocks.jail);
  assert.equal(jailed.release?.jailed, true);
  assert.ok(context.blocks.jail > context.blocks.window);

  // A validator we cannot read may be a jailed one, so the plan says "unknown" rather than
  // promising the earlier date — and Q11 then keeps the retire tap off.
  context.breakValidatorRead();
  const unknown = await plan(context, squadId);
  assert.equal(unknown.release, null);
  assert.deepEqual(unknown.steps.retire, { state: 'waiting' });
});

test('Q11 retire waits for the chain, then opens, and withdraw waits for the retired balance (Q12)', async () => {
  const { context, squadId } = await setup();
  context.setStaker(staker(100_000_000, { address: ADDRESSES.alice, inactiveBalance: SHARE }));
  context.setTransaction(transaction({ hash: UNSTAKE_HASH, blockNumber: INCLUSION_BLOCK }));
  context.track({ hash: UNSTAKE_HASH, address: ADDRESSES.alice, squadId, kind: 'unstake',
    expected: { valueLuna: SHARE }, state: 'INCLUDED_OK', checkedAt: context.at() });

  const waiting = await plan(context, squadId);
  assert.deepEqual(waiting.steps.start, { state: 'done', hash: UNSTAKE_HASH });
  assert.deepEqual(waiting.steps.retire, { state: 'waiting' });
  assert.deepEqual(waiting.steps.withdraw, { state: 'locked' });
  // Mode B has nobody to pay, so there is no fourth step and no roster at all (PRD §4).
  assert.equal(waiting.steps.pay, null);
  assert.equal(waiting.roster, null);

  // One block short of the release block is still short.
  context.setHead(context.blocks.window - 1);
  assert.deepEqual((await plan(context, squadId)).steps.retire, { state: 'waiting' });
  // Exactly at it, the chain has released the stake and the tap opens.
  context.setHead(context.blocks.window);
  const releasable = await plan(context, squadId);
  assert.deepEqual(releasable.steps.retire, { state: 'available' });
  assert.equal(releasable.release?.remainingBlocks, 0);

  // Once the retire has landed the chain shows a retired balance: withdraw opens, and the
  // amount it will send is that fresh balance, not a remembered one (Q12).
  context.setStaker(staker(100_000_000, { address: ADDRESSES.alice, retiredBalance: 199_999_700 }));
  const retired = await plan(context, squadId);
  assert.deepEqual(retired.steps.retire, { state: 'done', hash: null });
  assert.deepEqual(retired.steps.withdraw, { state: 'available' });
  assert.equal(retired.stake?.retiredLuna, 199_999_700);
});

test('§7.5 the plan hands over the viewer’s own commitments and the leave-by dates', async () => {
  const { context, squadId } = await setup();
  const other = await context.squads.create(ADDRESSES.alice, { mode: 'B', name: 'New laptop',
    goalAt: context.at() + 40 * DAY, personalTargetLuna: 150_000_000 });
  assert.ok(other.ok);
  context.commit(other.id, ADDRESSES.alice, 150_000_000);
  context.setStaker(staker(350_000_000, { address: ADDRESSES.alice }));

  const view = await plan(context, squadId);
  assert.equal(view.shareLuna, SHARE);
  // Both squads, with names, so the client's own planLeaving can name what would go short.
  assert.deepEqual([...view.commitments].map((entry) => entry.committedLuna).sort((a, b) => a - b),
    [150_000_000, SHARE]);
  assert.equal(view.leaveBy, view.squad.goalAt - 26 * 3_600_000);
  assert.equal(view.showFrom, view.leaveBy - 3 * DAY);
  // Nothing has been inactivated, so step one is the only one offered.
  assert.deepEqual(view.steps.start, { state: 'available' });
  assert.deepEqual(view.steps.retire, { state: 'locked' });
});

test('§7.6 a verified payment finishes the plan; a short one is a failure with its code', async () => {
  const { context, squadId } = await setup({ mode: 'A' });
  context.setStaker(staker(100_000_000, { address: ADDRESSES.alice }));
  const payment = (value: number) => transaction({ hash: PAY_HASH, from: ADDRESSES.bob,
    to: ADDRESSES.carol, value, recipientData: paymentDataHex('k3m9p2qr'),
    executionResult: true, blockNumber: 14_819_400, confirmations: 60 });

  // Nothing in the exit pipeline: the member can pay from NIM they already hold.
  const before = await plan(context, squadId);
  assert.deepEqual(before.steps.pay, { state: 'available' });
  assert.deepEqual(before.roster, { paid: 0, owing: 1 });
  assert.equal(before.payment, null);

  context.track({ hash: PAY_HASH, address: ADDRESSES.alice, squadId, kind: 'pay',
    expected: { valueLuna: SHARE, recipient: ADDRESSES.carol, data: 'sq:k3m9p2qr' },
    state: 'INCLUDED_OK', checkedAt: context.at() });
  // A payment one luna short of the share is refused, and the plan says why rather than
  // pretending the member still has not paid.
  context.setTransaction(payment(SHARE - 1));
  const short = await plan(context, squadId);
  assert.deepEqual(short.payment, { hash: PAY_HASH, verified: false, code: 'PAYMENT_SHORT' });
  assert.deepEqual(short.steps.pay, { state: 'failed', hash: PAY_HASH });
  assert.deepEqual(short.roster, { paid: 0, owing: 1 });

  // The sender is bob throughout — a cosigned HTLC, never the member (AGENTS.md 7).
  context.setTransaction(payment(SHARE));
  const paid = await plan(context, squadId);
  assert.deepEqual(paid.payment, { hash: PAY_HASH, verified: true, code: null });
  assert.deepEqual(paid.steps.pay, { state: 'done', hash: PAY_HASH });
  assert.deepEqual(paid.roster, { paid: 1, owing: 1 });
});

test('§7.5 a non-member and an unknown squad get no plan at all', async () => {
  const { context, squadId } = await setup();
  assert.deepEqual(await leavePlan(squadId, ADDRESSES.bob, context.deps),
    { ok: false, code: 'NOT_A_MEMBER' });
  // A member who has left keeps no plan either: they have no commitment left to unwind.
  context.leave(squadId, ADDRESSES.alice, context.at());
  assert.deepEqual(await leavePlan(squadId, ADDRESSES.alice, context.deps),
    { ok: false, code: 'NOT_A_MEMBER' });
  assert.deepEqual(await leavePlan('11111111-1111-4111-8111-111111111111', ADDRESSES.alice,
    context.deps), { ok: false, code: 'SQUAD_NOT_FOUND' });
});

test('§7.5 an unreadable chain leaves every amount unread instead of guessing one', async () => {
  const { context, squadId } = await setup();
  // No staker record at all: nothing to leave, and nothing claimed about a balance.
  const view = await plan(context, squadId);
  assert.equal(view.stake, null);
  assert.deepEqual(view.steps.start, { state: 'locked' });
  assert.equal(view.release, null);
  assert.equal(view.chainUnavailable, false);
});
