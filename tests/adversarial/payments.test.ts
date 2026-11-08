import assert from 'node:assert/strict';
import { test } from 'node:test';
import { payInput, recordTxInput } from '../../apps/web/src/core/squad-contract';
import { setCommitment } from '../../apps/web/src/server/core/commitments';
import { paymentDataHex } from '../../apps/web/src/server/core/payment-check';
import { paidRoster, settlePayment } from '../../apps/web/src/server/core/settle';
import { ADDRESSES, planHarness, transaction } from '../support/squads';

const DAY = 86_400_000;
const SHARE = 200_000_000;
const ALICE_HASH = '7'.repeat(64);
const BOB_HASH = '8'.repeat(64);
const marker = paymentDataHex('k3m9p2qr');

async function sharedGoal() {
  const context = planHarness();
  const created = await context.squads.create(ADDRESSES.alice, { mode: 'A', name: 'Lisbon in April',
    goalAt: context.at() + 30 * DAY, targetLuna: 600_000_000, recipient: ADDRESSES.carol });
  assert.ok(created.ok);
  context.commit(created.id, ADDRESSES.alice, SHARE);
  context.commit(created.id, ADDRESSES.bob, SHARE);
  return { context, squadId: created.id };
}
const good = (hash: string, rest: Parameters<typeof transaction>[0] = {}) => transaction({
  hash, from: ADDRESSES.alice, to: ADDRESSES.carol, value: SHARE, recipientData: marker,
  executionResult: true, blockNumber: 14_819_400, confirmations: 60, ...rest });

test('Q15 a client cannot declare itself paid: the body carries a hash and nothing else', () => {
  // Every shape below is a client trying to supply the verdict, the amount or the recipient.
  for (const body of [
    { hash: ALICE_HASH, verified: true },
    { hash: ALICE_HASH, paid: true },
    { hash: ALICE_HASH, valueLuna: SHARE },
    { hash: ALICE_HASH, recipient: ADDRESSES.bob },
    { hash: ALICE_HASH, confirmations: 60 },
    { verified: true },
    { hash: 'not-a-hash' },
    { hash: `${ALICE_HASH}00` },
  ]) {
    assert.equal(payInput.safeParse(body).success, false, JSON.stringify(body));
  }
  assert.ok(payInput.safeParse({ hash: ALICE_HASH }).success);
  // Hex case is accepted (providers differ), and it costs nothing: the hash still has to be
  // one this member had tracked, matched as stored, or settling refuses it as untracked.
  assert.ok(payInput.safeParse({ hash: 'd'.repeat(64).toUpperCase() }).success);
  // The tracking call is just as narrow: a state or a verdict is not accepted there either.
  assert.equal(recordTxInput.safeParse({ hash: ALICE_HASH, squadId: '11111111-1111-4111-8111-111111111111',
    kind: 'pay', valueLuna: SHARE, state: 'INCLUDED_OK' }).success, false);
});

test('Q15 a borrowed or invented hash settles nobody, and a reused one is refused once', async () => {
  const { context, squadId } = await sharedGoal();
  context.setTransaction(good(ALICE_HASH));
  assert.ok(await context.store.insertTrackedTx({ hash: ALICE_HASH, address: ADDRESSES.alice,
    squadId, kind: 'pay', expected: { valueLuna: SHARE }, state: 'SUBMITTED', checkedAt: null }));

  // Bob pointing at alice's good payment — same squad, same recipient, same amount.
  assert.deepEqual(await settlePayment(ADDRESSES.bob, squadId, ALICE_HASH, context.settleDeps),
    { ok: false, code: 'NOT_TRACKED' });
  // And bob cannot have it tracked as his own either: the hash is taken (DUPLICATE_HASH is
  // what the route answers).
  assert.equal(await context.store.insertTrackedTx({ hash: ALICE_HASH, address: ADDRESSES.bob,
    squadId, kind: 'pay', expected: { valueLuna: SHARE }, state: 'SUBMITTED', checkedAt: null }),
  false);
  // The roster still shows exactly one settled member, and the row names alice.
  const roster = await paidRoster(squadId, context.settleDeps);
  assert.equal(roster?.paid, 1);
  assert.equal(roster?.rows.find((row) => row.address === ADDRESSES.bob)?.hash, null);
});

test('Q15 a real transaction with the right marker but the wrong recipient or amount is refused', async () => {
  const { context, squadId } = await sharedGoal();
  const attempts = [
    // The squad's own marker, sent to the attacker's own address.
    { patch: { to: ADDRESSES.bob }, code: 'WRONG_RECIPIENT' },
    // One luna short, which is a short payment however close it is.
    { patch: { value: SHARE - 1 }, code: 'PAYMENT_SHORT' },
    // Another squad's marker on an otherwise perfect payment.
    { patch: { recipientData: paymentDataHex('q7m2bt4h') }, code: 'PAYMENT_DATA_MISMATCH' },
    // No marker at all: an ordinary transfer to the recipient is not a settlement.
    { patch: { recipientData: '' }, code: 'PAYMENT_DATA_MISMATCH' },
    // Included but failed (NimJar, testnet 12 Sep 2026).
    { patch: { executionResult: false }, code: 'TX_FAILED' },
    // Included, correct, but not yet final.
    { patch: { confirmations: 59 }, code: 'TX_NOT_CONFIRMED' },
  ] as const;
  for (const [index, { patch, code }] of attempts.entries()) {
    // A distinct, valid 64-hex hash per attempt: two attempts may share a refusal code.
    const hash = String(index + 1).repeat(64).slice(0, 64);
    context.setTransaction(good(hash, patch));
    assert.ok(await context.store.insertTrackedTx({ hash, address: ADDRESSES.alice, squadId,
      kind: 'pay', expected: { valueLuna: SHARE }, state: 'SUBMITTED', checkedAt: null }));
    assert.deepEqual(await settlePayment(ADDRESSES.alice, squadId, hash, context.settleDeps),
      { ok: false, code }, code);
    // Not one of them moved the squad on.
    assert.equal((await context.store.getSquad(squadId))?.state, 'OPEN');
  }
});

test('Q03 a completed squad binds no stake and takes no new commitment', async () => {
  const { context, squadId } = await sharedGoal();
  context.setStaker(null);
  for (const [address, hash] of [[ADDRESSES.alice, ALICE_HASH], [ADDRESSES.bob, BOB_HASH]] as const) {
    context.setTransaction(good(hash, { from: address }));
    assert.ok(await context.store.insertTrackedTx({ hash, address, squadId, kind: 'pay',
      expected: { valueLuna: SHARE }, state: 'SUBMITTED', checkedAt: null }));
    await settlePayment(address, squadId, hash, context.settleDeps);
  }
  assert.equal((await context.store.getSquad(squadId))?.state, 'COMPLETED');

  // A finished squad is closed: committing into it is refused outright.
  const refused = await setCommitment(ADDRESSES.alice, squadId, { amountLuna: 1_000 },
    { store: context.store, rpc: context.rpc, now: context.at });
  assert.ok(!refused.ok && refused.code === 'SQUAD_CLOSED', JSON.stringify(refused));
  // The refusal carries no balance figures, because a closed squad was never read against one.
  assert.ok(!refused.ok && refused.freeLuna === null && refused.shortfallLuna === null);
  // And it no longer binds the member's active balance, so another squad is not held short
  // by stake that has already been paid out.
  assert.deepEqual(await context.store.namedCommitments(ADDRESSES.alice), []);
});
