import assert from 'node:assert/strict';
import { test } from 'node:test';
import { earnedSinceJoining, type EarnedInput } from '../../apps/web/src/server/core/earned';

const base: EarnedInput = {
  chainRead: true,
  stake: { activeLuna: 300_000_000 },
  pool: { payout: 'restake', payoutAddress: null },
  txs: [{ kind: 'create', state: 'INCLUDED_OK', valueLuna: 200_000_000 }],
  payouts: null,
};

test('§9.12 a restake pool: earned is the active balance minus the deposits we watched land', () => {
  assert.deepEqual(earnedSinceJoining(base), {
    known: true, luna: 100_000_000, basis: { kind: 'restake', depositsLuna: 200_000_000 },
  });
  // A second deposit counts; a failed one moved nothing, so it does not.
  assert.deepEqual(earnedSinceJoining({ ...base, txs: [
    { kind: 'create', state: 'INCLUDED_OK', valueLuna: 200_000_000 },
    { kind: 'add', state: 'INCLUDED_OK', valueLuna: 50_000_000 },
    { kind: 'add', state: 'INCLUDED_FAILED', valueLuna: 70_000_000 },
  ] }), { known: true, luna: 50_000_000, basis: { kind: 'restake', depositsLuna: 250_000_000 } });
  // Exactly the deposits means nothing has been earned yet — which is a measurement, not "—".
  assert.deepEqual(earnedSinceJoining({ ...base, stake: { activeLuna: 200_000_000 } }), {
    known: true, luna: 0, basis: { kind: 'restake', depositsLuna: 200_000_000 },
  });
});

test('§9.12 every case it cannot measure says which one it is, and none of them guesses', () => {
  const cases: readonly [Partial<EarnedInput>, string][] = [
    [{ chainRead: false }, 'CHAIN_UNAVAILABLE'],
    [{ stake: null }, 'NOT_STAKING'],
    [{ pool: null }, 'NO_POOL_DATA'],
    [{ pool: { payout: 'none', payoutAddress: null } }, 'PAYS_NOTHING'],
    // A deposit with no verdict may or may not have landed (Q10), so the sum is not exact.
    [{ txs: [{ kind: 'create', state: 'INCLUDED_OK', valueLuna: 1 },
      { kind: 'add', state: 'SUBMITTED', valueLuna: 5 }] }, 'UNTRACKED_DEPOSIT'],
    [{ txs: [{ kind: 'create', state: 'UNKNOWN', valueLuna: 1 }] }, 'UNTRACKED_DEPOSIT'],
    // Without the transaction that created the staker, the starting balance is unknown.
    [{ txs: [{ kind: 'add', state: 'INCLUDED_OK', valueLuna: 10_000_000 }] }, 'OUTSIDE_STAKE'],
    [{ txs: [] }, 'OUTSIDE_STAKE'],
    // Less active stake than was deposited: something we never watched moved it.
    [{ stake: { activeLuna: 100_000_000 } }, 'OUTSIDE_STAKE'],
    // Once stake starts leaving, the active balance is no longer deposits plus rewards.
    [{ txs: [{ kind: 'create', state: 'INCLUDED_OK', valueLuna: 200_000_000 },
      { kind: 'unstake', state: 'INCLUDED_OK', valueLuna: 100_000_000 }] }, 'LEAVING'],
    [{ txs: [{ kind: 'create', state: 'INCLUDED_OK', valueLuna: 200_000_000 },
      { kind: 'retire', state: 'SUBMITTED', valueLuna: 0 }] }, 'LEAVING'],
    // A direct pool pays out of a wallet, and Nimiq's data publishes no payout address.
    [{ pool: { payout: 'direct', payoutAddress: null } }, 'PAYOUT_ADDRESS_UNKNOWN'],
    [{ pool: { payout: 'direct', payoutAddress: 'NQ01 PAYS' }, payouts: null },
      'CHAIN_UNAVAILABLE'],
  ];
  for (const [patch, reason] of cases) {
    const result = earnedSinceJoining({ ...base, ...patch });
    assert.deepEqual(result, { known: false, reason }, JSON.stringify(patch));
  }
  // A failed leaving attempt moved nothing, so it does not block the measurement.
  assert.equal(earnedSinceJoining({ ...base, txs: [
    { kind: 'create', state: 'INCLUDED_OK', valueLuna: 200_000_000 },
    { kind: 'retire', state: 'INCLUDED_FAILED', valueLuna: 0 },
  ] }).known, true);
});

test('§9.12 a direct pool is the sum of its payouts, counted, not the balance', () => {
  const result = earnedSinceJoining({
    ...base,
    pool: { payout: 'direct', payoutAddress: 'NQ01 PAYS' },
    payouts: [{ valueLuna: 120_000 }, { valueLuna: 80_000 }, { valueLuna: 50_000 }],
  });
  assert.deepEqual(result,
    { known: true, luna: 250_000, basis: { kind: 'direct', payouts: 3 } });
  // No payouts yet is zero earned, with the count beside it — and the active balance, which
  // for a direct pool says nothing about rewards, is never used.
  assert.deepEqual(earnedSinceJoining({
    ...base, stake: { activeLuna: 9_999_999_999 },
    pool: { payout: 'direct', payoutAddress: 'NQ01 PAYS' }, payouts: [],
  }), { known: true, luna: 0, basis: { kind: 'direct', payouts: 0 } });
});
