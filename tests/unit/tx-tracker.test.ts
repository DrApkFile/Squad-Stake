import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FINALITY_CONFIRMATIONS } from '../../apps/web/src/config/constants';
import { ADDRESSES, HASHES, harness, transaction } from '../support/squads';

const GOAL = Date.parse('2026-12-18T00:00:00Z');
async function squadFor(h: ReturnType<typeof harness>) {
  const created = await h.squads.create(ADDRESSES.alice, {
    mode: 'B', name: 'Winter buffers', goalAt: GOAL, personalTargetLuna: 200_000_000 });
  assert.ok(created.ok);
  return created.id;
}

test('Q10 a recorded hash is SUBMITTED, and only execution plus finality makes it INCLUDED_OK', async () => {
  const h = harness({ balance: 300_000_000, transaction: transaction({ confirmations: FINALITY_CONFIRMATIONS }) });
  const squadId = await squadFor(h);
  const recorded = await h.tracker.record(ADDRESSES.alice, {
    hash: HASHES.create, kind: 'create', squadId, valueLuna: 10_000_000 });
  assert.ok(recorded.ok);
  assert.equal(recorded.state, 'SUBMITTED');
  assert.equal(recorded.requiredConfirmations, FINALITY_CONFIRMATIONS);
  // The recorded value is an audit trail only.
  assert.deepEqual(h.trackedTxs.get(HASHES.create)?.expected, { valueLuna: 10_000_000 });

  const checked = await h.tracker.check(HASHES.create);
  assert.ok(checked.ok);
  assert.equal(checked.state, 'INCLUDED_OK');
  assert.equal(h.trackedTxs.get(HASHES.create)?.state, 'INCLUDED_OK');
  assert.equal(h.trackedTxs.get(HASHES.create)?.checkedAt, h.at());

  // The same hash twice must not be tracked twice (one tracked hash per action, Q13).
  const again = await h.tracker.record(ADDRESSES.alice, {
    hash: HASHES.create, kind: 'create', squadId, valueLuna: 10_000_000 });
  assert.ok(!again.ok);
  assert.equal(again.code, 'DUPLICATE_HASH');
});

test('Q10 an included transaction that failed is INCLUDED_FAILED, never done', async () => {
  const h = harness({ balance: 300_000_000,
    transaction: transaction({ executionResult: false, confirmations: FINALITY_CONFIRMATIONS }) });
  const squadId = await squadFor(h);
  assert.ok((await h.tracker.record(ADDRESSES.alice, {
    hash: HASHES.add, kind: 'add', squadId, valueLuna: 50_000_000 })).ok);
  const checked = await h.tracker.check(HASHES.add);
  assert.ok(checked.ok);
  assert.equal(checked.state, 'INCLUDED_FAILED');
  assert.notEqual(checked.state, 'INCLUDED_OK');
});

test('Q10 an unknown transaction stays UNKNOWN however much time passes', async () => {
  const h = harness({ balance: 300_000_000, transaction: null });
  const squadId = await squadFor(h);
  assert.ok((await h.tracker.record(ADDRESSES.alice, {
    hash: HASHES.other, kind: 'add', squadId, valueLuna: 50_000_000 })).ok);

  for (const wait of [0, 60_000, 7 * 86_400_000]) {
    h.advance(wait);
    const checked = await h.tracker.check(HASHES.other);
    assert.ok(checked.ok);
    assert.equal(checked.state, 'UNKNOWN');
    assert.equal(checked.confirmations, null);
  }
  // Still re-checkable: UNKNOWN is not terminal and never decays into a failure.
  assert.equal(h.trackedTxs.get(HASHES.other)?.state, 'UNKNOWN');
});

test('Q10 an untracked hash is refused, and a non-member cannot record one', async () => {
  const h = harness({ balance: 300_000_000, transaction: transaction() });
  const squadId = await squadFor(h);
  const missing = await h.tracker.check(HASHES.other);
  assert.ok(!missing.ok);
  assert.equal(missing.code, 'NOT_TRACKED');

  const stranger = await h.tracker.record(ADDRESSES.bob, {
    hash: HASHES.add, kind: 'add', squadId, valueLuna: 50_000_000 });
  assert.ok(!stranger.ok);
  assert.equal(stranger.code, 'NOT_A_MEMBER');
});
