import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commitInput } from '../../apps/web/src/core/squad-contract';
import { setCommitment } from '../../apps/web/src/server/core/commitments';
import { ADDRESSES, HASHES, harness } from '../support/squads';

const GOAL = Date.parse('2026-12-18T00:00:00Z');
async function squadFor(h: ReturnType<typeof harness>, name: string) {
  const created = await h.squads.create(ADDRESSES.alice, {
    mode: 'A', name, goalAt: GOAL, targetLuna: 1_200_000_000, recipient: ADDRESSES.bob });
  assert.ok(created.ok);
  return created.id;
}

test('Q03 two concurrent commits that only fit one at a time cannot both succeed', async () => {
  const h = harness({ balance: 300_000_000 });
  const first = await squadFor(h, 'Lisbon in April');
  const second = await squadFor(h, 'Winter buffers');

  // Fired without awaiting in between: the member lock must serialise them, so the
  // second read sees the first commitment (FAILURE_MODES concurrent updates).
  const results = await Promise.all([
    setCommitment(ADDRESSES.alice, first, { amountLuna: 200_000_000 }, h.commitDeps),
    setCommitment(ADDRESSES.alice, second, { amountLuna: 200_000_000 }, h.commitDeps),
  ]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  const refused = results.find((result) => !result.ok);
  assert.ok(refused && !refused.ok);
  assert.equal(refused.code, 'OVER_COMMITTED');
  assert.ok(h.lockWaits() >= 1, 'the second commit must have waited for the lock');

  const committed = [first, second]
    .map((squadId) => h.memberships.get(`${squadId}|${ADDRESSES.alice}`)?.committedLuna ?? 0)
    .reduce((total, amount) => total + amount, 0);
  assert.equal(committed, 200_000_000);
  assert.ok(committed <= 300_000_000);
});

test('Q03 a client-sent balance, status or free amount is rejected outright', async () => {
  const h = harness({ balance: 1 });
  const squadId = await squadFor(h, 'Lisbon in April');
  for (const body of [
    { amountLuna: 100_000_000, balance: 999_000_000 },
    { amountLuna: 100_000_000, status: 'BACKED' },
    { amountLuna: 100_000_000, freeLuna: 999_000_000 },
    { amountLuna: 100_000_000, txHash: HASHES.create, state: 'INCLUDED_OK' },
  ]) {
    assert.equal(commitInput.safeParse(body).success, false, JSON.stringify(body));
    const result = await setCommitment(ADDRESSES.alice, squadId, body, h.commitDeps);
    assert.ok(!result.ok);
    assert.equal(result.code, 'INVALID_INPUT');
  }
  // Nothing was written, and the chain read is still the only source of the balance.
  assert.equal(h.memberships.get(`${squadId}|${ADDRESSES.alice}`)?.committedLuna, 0);
  assert.equal(h.cachedReads(), 0);
});

test('Q03 negative, fractional and absurd amounts never reach the invariant', async () => {
  const h = harness({ balance: 300_000_000 });
  const squadId = await squadFor(h, 'Lisbon in April');
  for (const amountLuna of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2, Number.POSITIVE_INFINITY]) {
    const result = await setCommitment(ADDRESSES.alice, squadId, { amountLuna }, h.commitDeps);
    assert.ok(!result.ok);
    assert.equal(result.code, 'INVALID_INPUT');
  }
  assert.equal(h.freshReads(), 0);
});

test('Q03 a member who left, a stranger and a closed squad cannot commit', async () => {
  const h = harness({ balance: 300_000_000 });
  const squadId = await squadFor(h, 'Lisbon in April');

  const stranger = await setCommitment(ADDRESSES.bob, squadId, { amountLuna: 1_000 }, h.commitDeps);
  assert.ok(!stranger.ok);
  assert.equal(stranger.code, 'NOT_A_MEMBER');

  assert.ok((await h.squads.leave(ADDRESSES.alice, squadId)).ok);
  const left = await setCommitment(ADDRESSES.alice, squadId, { amountLuna: 1_000 }, h.commitDeps);
  assert.ok(!left.ok);
  assert.equal(left.code, 'NOT_A_MEMBER');

  const closed = await squadFor(h, 'Closed squad');
  const squad = h.rows.get(closed);
  assert.ok(squad);
  h.rows.set(closed, { ...squad, state: 'CANCELLED' });
  const refused = await setCommitment(ADDRESSES.alice, closed, { amountLuna: 1_000 }, h.commitDeps);
  assert.ok(!refused.ok);
  assert.equal(refused.code, 'SQUAD_CLOSED');
  assert.equal(h.freshReads(), 0);
});

test('Q10 a commitment cannot borrow another member’s or another squad’s transaction', async () => {
  const h = harness({ balance: 300_000_000 });
  const mine = await squadFor(h, 'Lisbon in April');
  const other = await squadFor(h, 'Winter buffers');
  assert.ok((await h.tracker.record(ADDRESSES.alice, {
    hash: HASHES.create, kind: 'create', squadId: other, valueLuna: 10_000_000 })).ok);
  h.trackedTxs.set(HASHES.create, { ...h.trackedTxs.get(HASHES.create)!, state: 'INCLUDED_OK' });

  const wrongSquad = await setCommitment(ADDRESSES.alice, mine,
    { amountLuna: 100_000_000, txHash: HASHES.create }, h.commitDeps);
  assert.ok(!wrongSquad.ok);
  assert.equal(wrongSquad.code, 'TX_NOT_CONFIRMED');

  const failed = HASHES.add;
  assert.ok((await h.tracker.record(ADDRESSES.alice, {
    hash: failed, kind: 'add', squadId: mine, valueLuna: 10_000_000 })).ok);
  h.trackedTxs.set(failed, { ...h.trackedTxs.get(failed)!, state: 'INCLUDED_FAILED' });
  const onFailure = await setCommitment(ADDRESSES.alice, mine,
    { amountLuna: 100_000_000, txHash: failed }, h.commitDeps);
  assert.ok(!onFailure.ok);
  assert.equal(onFailure.code, 'TX_FAILED');
  assert.equal(h.memberships.get(`${mine}|${ADDRESSES.alice}`)?.committedLuna, 0);
});
