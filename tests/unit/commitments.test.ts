import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setCommitment } from '../../apps/web/src/server/core/commitments';
import { ADDRESSES, HASHES, harness, transaction } from '../support/squads';

const GOAL = Date.parse('2026-12-18T00:00:00Z');
async function squadFor(h: ReturnType<typeof harness>, name = 'Lisbon in April') {
  const created = await h.squads.create(ADDRESSES.alice, {
    mode: 'A', name, goalAt: GOAL, targetLuna: 1_200_000_000, recipient: ADDRESSES.bob });
  assert.ok(created.ok);
  return created.id;
}

test('Q03 a commitment is allowed up to the active balance and refused one luna above it', async () => {
  const h = harness({ balance: 300_000_000 });
  const squadId = await squadFor(h);
  const exact = await setCommitment(ADDRESSES.alice, squadId, { amountLuna: 300_000_000 }, h.commitDeps);
  assert.ok(exact.ok);
  assert.equal(exact.committedLuna, 300_000_000);
  assert.equal(exact.freeLuna, 0);
  assert.equal(exact.readAt, h.at());

  const tooMuch = await setCommitment(ADDRESSES.alice, squadId, { amountLuna: 300_000_001 }, h.commitDeps);
  assert.ok(!tooMuch.ok);
  assert.equal(tooMuch.code, 'OVER_COMMITTED');
  assert.equal(tooMuch.freeLuna, 300_000_000);
  assert.equal(tooMuch.shortfallLuna, 1);
  // The refused amount must not have been written.
  assert.equal(h.memberships.get(`${squadId}|${ADDRESSES.alice}`)?.committedLuna, 300_000_000);
});

test('Q03 commitments in the member’s other squads count against the same stake', async () => {
  const h = harness({ balance: 300_000_000 });
  const first = await squadFor(h, 'Lisbon in April');
  const second = await squadFor(h, 'Winter buffers');
  assert.ok((await setCommitment(ADDRESSES.alice, first, { amountLuna: 200_000_000 }, h.commitDeps)).ok);

  const overflow = await setCommitment(ADDRESSES.alice, second, { amountLuna: 150_000_000 }, h.commitDeps);
  assert.ok(!overflow.ok);
  assert.equal(overflow.code, 'OVER_COMMITTED');
  assert.equal(overflow.freeLuna, 100_000_000);

  const fits = await setCommitment(ADDRESSES.alice, second, { amountLuna: 100_000_000 }, h.commitDeps);
  assert.ok(fits.ok);
  assert.equal(fits.freeLuna, 0);

  // Leaving the first squad frees its commitment for the second (§7.8).
  assert.ok((await h.squads.leave(ADDRESSES.alice, first)).ok);
  const after = await setCommitment(ADDRESSES.alice, second, { amountLuna: 300_000_000 }, h.commitDeps);
  assert.ok(after.ok);
});

test('Q03 the stake is read fresh inside the lock, never from the 60 s cache', async () => {
  const h = harness({ balance: 300_000_000 });
  const squadId = await squadFor(h);
  assert.ok((await setCommitment(ADDRESSES.alice, squadId, { amountLuna: 100_000_000 }, h.commitDeps)).ok);
  assert.equal(h.freshReads(), 1);
  assert.equal(h.cachedReads(), 0);

  // A stake that left the wallet between requests must change the answer immediately.
  h.setBalance(50_000_000);
  const refused = await setCommitment(ADDRESSES.alice, squadId, { amountLuna: 100_000_000 }, h.commitDeps);
  assert.ok(!refused.ok);
  assert.equal(refused.code, 'OVER_COMMITTED');
  assert.equal(h.freshReads(), 2);
  assert.equal(h.cachedReads(), 0);
});

test('Q03 Q10 a commitment that needed a staking transaction waits for INCLUDED_OK', async () => {
  const h = harness({ balance: 300_000_000, transaction: transaction({ confirmations: 2 }) });
  const squadId = await squadFor(h);
  assert.ok((await h.tracker.record(ADDRESSES.alice, {
    hash: HASHES.create, kind: 'create', squadId, valueLuna: 10_000_000 })).ok);

  const submitted = await setCommitment(ADDRESSES.alice, squadId,
    { amountLuna: 100_000_000, txHash: HASHES.create }, h.commitDeps);
  assert.ok(!submitted.ok);
  assert.equal(submitted.code, 'TX_NOT_CONFIRMED');
  assert.equal(h.memberships.get(`${squadId}|${ADDRESSES.alice}`)?.committedLuna, 0);

  // Included and successful but short of finality: the commitment stays unsaved.
  const checked = await h.tracker.check(HASHES.create);
  assert.ok(checked.ok);
  assert.equal(checked.state, 'SUBMITTED');
  assert.equal(checked.confirmations, 2);
  const pending = await setCommitment(ADDRESSES.alice, squadId,
    { amountLuna: 100_000_000, txHash: HASHES.create }, h.commitDeps);
  assert.ok(!pending.ok);
  assert.equal(pending.code, 'TX_NOT_CONFIRMED');

  h.trackedTxs.set(HASHES.create, {
    ...(h.trackedTxs.get(HASHES.create) ?? { hash: HASHES.create, address: ADDRESSES.alice, squadId,
      kind: 'create' as const, expected: { valueLuna: 10_000_000 }, checkedAt: null }),
    state: 'INCLUDED_OK',
  });
  const saved = await setCommitment(ADDRESSES.alice, squadId,
    { amountLuna: 100_000_000, txHash: HASHES.create }, h.commitDeps);
  assert.ok(saved.ok);
  assert.equal(h.memberships.get(`${squadId}|${ADDRESSES.alice}`)?.committedLuna, 100_000_000);
});

test('Q03 a member who is not staking cannot commit, and the chain decides, not the client', async () => {
  const h = harness({ balance: null });
  const squadId = await squadFor(h);
  const refused = await setCommitment(ADDRESSES.alice, squadId, { amountLuna: 100_000_000 }, h.commitDeps);
  assert.ok(!refused.ok);
  assert.equal(refused.code, 'NOT_STAKING');
  assert.equal(refused.freeLuna, 0);
});
