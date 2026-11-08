import assert from 'node:assert/strict';
import { test } from 'node:test';
import { paymentDataHex } from '../../apps/web/src/server/core/payment-check';
import { paidRoster, settlePayment } from '../../apps/web/src/server/core/settle';
import { ADDRESSES, planHarness, transaction } from '../support/squads';

const DAY = 86_400_000;
const SHARE = 200_000_000;
const HASHES = { alice: '3'.repeat(64), bob: '4'.repeat(64), carol: '5'.repeat(64) } as const;

async function sharedGoal(options: { mode?: 'A' | 'B' } = {}) {
  const context = planHarness();
  const created = options.mode === 'B'
    ? await context.squads.create(ADDRESSES.alice, { mode: 'B', name: 'Winter buffers',
      goalAt: context.at() + 30 * DAY, personalTargetLuna: SHARE })
    : await context.squads.create(ADDRESSES.alice, { mode: 'A', name: 'Lisbon in April',
      goalAt: context.at() + 30 * DAY, targetLuna: 600_000_000, recipient: ADDRESSES.carol });
  assert.ok(created.ok);
  context.commit(created.id, ADDRESSES.alice, SHARE);
  context.commit(created.id, ADDRESSES.bob, SHARE);
  return { context, squadId: created.id };
}

/** A real §7.6 payment: the fixed recipient, the share, the squad's marker, final. The sender
 * is deliberately nobody in particular — Nimiq Pay pays from a cosigned HTLC. */
const payment = (hash: string, rest: Parameters<typeof transaction>[0] = {}) => transaction({
  hash, from: ADDRESSES.alice, to: ADDRESSES.carol, value: SHARE,
  recipientData: paymentDataHex('k3m9p2qr'), executionResult: true,
  blockNumber: 14_819_400, confirmations: 60, ...rest });

test('§7.6 the roster counts only members who still owe a share, and only verified payments', async () => {
  const { context, squadId } = await sharedGoal();
  const empty = await paidRoster(squadId, context.settleDeps);
  assert.deepEqual(empty, { rows: [
    { address: ADDRESSES.alice, hash: null, verified: false, code: null },
    { address: ADDRESSES.bob, hash: null, verified: false, code: null },
  ], owing: 2, paid: 0 });

  // Alice pays properly; bob's attempt goes to the wrong address.
  context.setTransaction(payment(HASHES.alice));
  context.setTransaction(payment(HASHES.bob, { to: ADDRESSES.bob }));
  for (const [address, hash] of [[ADDRESSES.alice, HASHES.alice], [ADDRESSES.bob, HASHES.bob]] as const) {
    context.track({ hash, address, squadId, kind: 'pay',
      expected: { valueLuna: SHARE, recipient: ADDRESSES.carol, data: 'sq:k3m9p2qr' },
      state: 'INCLUDED_OK', checkedAt: context.at() });
  }
  const half = await paidRoster(squadId, context.settleDeps);
  assert.equal(half?.paid, 1);
  assert.equal(half?.owing, 2);
  assert.deepEqual(half?.rows.find((row) => row.address === ADDRESSES.bob),
    { address: ADDRESSES.bob, hash: HASHES.bob, verified: false, code: 'WRONG_RECIPIENT' });
  // The hash is public either way: a reader can check the refusal on an explorer too.
  assert.equal(half?.rows.find((row) => row.address === ADDRESSES.alice)?.hash, HASHES.alice);

  // A member who has left owes nothing, so the roster shrinks rather than counting them unpaid.
  context.leave(squadId, ADDRESSES.bob, context.at());
  const alone = await paidRoster(squadId, context.settleDeps);
  assert.deepEqual(alone?.owing, 1);
  assert.deepEqual(alone?.paid, 1);
});

test('§7.6 a second attempt after a refused one settles the member', async () => {
  const { context, squadId } = await sharedGoal();
  context.leave(squadId, ADDRESSES.bob, context.at());
  // Oldest first: the failed attempt, then the good one. The roster keeps looking after a
  // refusal, so one bad attempt never locks a member out of settling.
  context.setTransaction(payment(HASHES.bob, { executionResult: false }));
  context.setTransaction(payment(HASHES.alice));
  for (const hash of [HASHES.bob, HASHES.alice]) {
    context.track({ hash, address: ADDRESSES.alice, squadId, kind: 'pay',
      expected: { valueLuna: SHARE, recipient: ADDRESSES.carol, data: 'sq:k3m9p2qr' },
      state: 'INCLUDED_OK', checkedAt: context.at() });
  }
  const roster = await paidRoster(squadId, context.settleDeps);
  assert.equal(roster?.paid, 1);
  assert.equal(roster?.rows[0]?.hash, HASHES.alice);
});

test('§4 together goals has no roster to settle', async () => {
  const { context, squadId } = await sharedGoal({ mode: 'B' });
  assert.equal(await paidRoster(squadId, context.settleDeps), null);
  assert.deepEqual(await settlePayment(ADDRESSES.alice, squadId, HASHES.alice, context.settleDeps),
    { ok: false, code: 'NOT_MODE_A' });
});

test('§7.6 the squad is COMPLETED only once everyone who committed has paid', async () => {
  const { context, squadId } = await sharedGoal();
  const track = (address: string, hash: string) => context.track({ hash, address, squadId,
    kind: 'pay', expected: { valueLuna: SHARE, recipient: ADDRESSES.carol, data: 'sq:k3m9p2qr' },
    state: 'INCLUDED_OK', checkedAt: context.at() });

  context.setTransaction(payment(HASHES.alice));
  track(ADDRESSES.alice, HASHES.alice);
  const first = await settlePayment(ADDRESSES.alice, squadId, HASHES.alice, context.settleDeps);
  assert.deepEqual(first, { ok: true, paid: 1, owing: 2, completed: false });
  // One of two paid is not a finished squad.
  assert.equal((await context.store.getSquad(squadId))?.state, 'OPEN');

  context.setTransaction(payment(HASHES.bob));
  track(ADDRESSES.bob, HASHES.bob);
  const second = await settlePayment(ADDRESSES.bob, squadId, HASHES.bob, context.settleDeps);
  assert.deepEqual(second, { ok: true, paid: 2, owing: 2, completed: true });
  assert.equal((await context.store.getSquad(squadId))?.state, 'COMPLETED');

  // Settling again is harmless and does not claim to have completed anything twice: the
  // state move is conditional on the state that was just read.
  const again = await settlePayment(ADDRESSES.bob, squadId, HASHES.bob, context.settleDeps);
  assert.deepEqual(again, { ok: true, paid: 2, owing: 2, completed: true });
  assert.equal((await context.store.getSquad(squadId))?.state, 'COMPLETED');
});

test('§7.6 settling refuses a hash that is not this member’s own tracked payment', async () => {
  const { context, squadId } = await sharedGoal();
  context.setTransaction(payment(HASHES.alice));
  context.track({ hash: HASHES.alice, address: ADDRESSES.alice, squadId, kind: 'pay',
    expected: { valueLuna: SHARE, recipient: ADDRESSES.carol, data: 'sq:k3m9p2qr' },
    state: 'INCLUDED_OK', checkedAt: context.at() });

  // Bob borrowing alice's perfectly good payment settles nothing of his.
  assert.deepEqual(await settlePayment(ADDRESSES.bob, squadId, HASHES.alice, context.settleDeps),
    { ok: false, code: 'NOT_TRACKED' });
  // A hash nobody tracked — read off an explorer — is not a settlement either.
  assert.deepEqual(await settlePayment(ADDRESSES.alice, squadId, HASHES.carol, context.settleDeps),
    { ok: false, code: 'NOT_TRACKED' });
  // A stranger, and a member who has left.
  assert.deepEqual(await settlePayment(ADDRESSES.carol, squadId, HASHES.alice, context.settleDeps),
    { ok: false, code: 'NOT_A_MEMBER' });
  context.leave(squadId, ADDRESSES.alice, context.at());
  assert.deepEqual(await settlePayment(ADDRESSES.alice, squadId, HASHES.alice, context.settleDeps),
    { ok: false, code: 'NOT_A_MEMBER' });
});

test('§7.6 an unreadable payment is "not yet", never a settlement and never a failure', async () => {
  const { context, squadId } = await sharedGoal();
  context.leave(squadId, ADDRESSES.bob, context.at());
  context.track({ hash: HASHES.alice, address: ADDRESSES.alice, squadId, kind: 'pay',
    expected: { valueLuna: SHARE, recipient: ADDRESSES.carol, data: 'sq:k3m9p2qr' },
    state: 'SUBMITTED', checkedAt: null });
  // The transaction is not in the fixture, so the read fails the way the node answers an
  // unknown hash. PRD §8: unknown never becomes failure, and never becomes success.
  assert.deepEqual(await settlePayment(ADDRESSES.alice, squadId, HASHES.alice, context.settleDeps),
    { ok: false, code: 'CHAIN_UNAVAILABLE' });
  const roster = await paidRoster(squadId, context.settleDeps);
  assert.deepEqual(roster?.rows[0],
    { address: ADDRESSES.alice, hash: HASHES.alice, verified: false, code: 'TX_NOT_CONFIRMED' });
  assert.equal((await context.store.getSquad(squadId))?.state, 'OPEN');
});
