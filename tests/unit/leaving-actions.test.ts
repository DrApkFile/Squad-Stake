import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STAKING_FEES_LUNA } from '../../apps/web/src/config/constants';
import { leaveBy, leaveByShowFrom } from '../../apps/web/src/core/leave-by';
import {
  planLeaving, planPayment, planRemove, planRetire, paymentData,
} from '../../apps/web/src/core/staking-actions';
import { countdown, formatMoment, zoneLabel } from '../../packages/ui/format';
import { ADDRESSES } from '../support/squads';

const goalAt = Date.parse('2026-12-18T00:00:00Z');
const squadId = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const commitments = [
  { squadId, name: 'Lisbon in April', committedLuna: 200_000_000 },
  { squadId: other, name: 'Winter buffers', committedLuna: 150_000_000 },
];

test('Q08 the banner window opens three days before the deadline and reads in the local zone', () => {
  const deadline = leaveBy(goalAt);
  assert.equal(leaveByShowFrom(goalAt), deadline - 3 * 86_400_000);
  // The deadline is 26 h before the goal, so the notice starts a little over four days out —
  // earlier than "three days before the goal", which is the safe direction to be wrong in.
  assert.ok(leaveByShowFrom(goalAt) < goalAt - 4 * 86_400_000);

  // 2026-12-16T22:00Z is 23:00 in UTC+1 on the same day, and 17:00 the day before in UTC-5.
  assert.equal(formatMoment(deadline, 0), '16 Dec 2026, 22:00 UTC');
  assert.equal(formatMoment(deadline, 60), '16 Dec 2026, 23:00 UTC+1');
  assert.equal(formatMoment(deadline, -300), '16 Dec 2026, 17:00 UTC-5');
  // A zone that is not a whole hour still reads correctly (India, Nepal).
  assert.equal(zoneLabel(330), 'UTC+5:30');
  assert.equal(formatMoment(deadline, 345), '17 Dec 2026, 03:45 UTC+5:45');

  assert.equal(countdown(2 * 86_400_000 + 4 * 3_600_000), '2 d 4 h');
  assert.equal(countdown(4 * 3_600_000 + 12 * 60_000), '4 h 12 min');
  assert.equal(countdown(12 * 60_000), '12 min');
  assert.equal(countdown(30_000), 'under a minute');
  // Never a negative countdown: the chain gives the permission, not the clock (Q11).
  assert.equal(countdown(-5_000), 'any moment now');
});

test('§7.5 starting to leave sends the resulting active balance and names the squads it costs', () => {
  const plan = planLeaving({ activeBalanceLuna: 350_000_000, commitments, squadId,
    amountLuna: 200_000_000 });
  assert.equal(plan.kind, 'set-active-stake');
  assert.ok(plan.kind === 'set-active-stake');
  // The provider takes the balance that should remain, not the amount removed.
  assert.equal(plan.newActiveBalanceLuna, 150_000_000);
  assert.equal(plan.feeLuna, STAKING_FEES_LUNA.unstake);
  // 150,000,000 left against 350,000,000 committed in total: short by 200,000,000, and the
  // other squad is the one that would start saying so.
  assert.equal(plan.shortfallLuna, 200_000_000);
  assert.deepEqual(plan.affected, [commitments[1]]);

  // Enough spare stake to cover everything: no warning and no squad named.
  const spare = planLeaving({ activeBalanceLuna: 600_000_000, commitments, squadId,
    amountLuna: 200_000_000 });
  assert.ok(spare.kind === 'set-active-stake');
  assert.equal(spare.shortfallLuna, 0);
  assert.deepEqual(spare.affected, []);
});

test('§7.5 an impossible leaving amount is refused before the wallet is opened', () => {
  const cases = [
    { input: { activeBalanceLuna: null, amountLuna: 1_000 }, reason: 'NOT_STAKING' },
    { input: { activeBalanceLuna: 100, amountLuna: 0 }, reason: 'INVALID_AMOUNT' },
    { input: { activeBalanceLuna: 100, amountLuna: -5 }, reason: 'INVALID_AMOUNT' },
    { input: { activeBalanceLuna: 100, amountLuna: 1.5 }, reason: 'INVALID_AMOUNT' },
    { input: { activeBalanceLuna: 100, amountLuna: Number.MAX_VALUE }, reason: 'INVALID_AMOUNT' },
    { input: { activeBalanceLuna: 100, amountLuna: 101 }, reason: 'AMOUNT_EXCEEDS_STAKE' },
  ] as const;
  for (const { input, reason } of cases) {
    assert.deepEqual(planLeaving({ ...input, commitments, squadId }), { kind: 'blocked', reason },
      `${input.amountLuna}`);
  }
});

test('Q11 retire is refused until the chain has released the stake, and never guesses', () => {
  const releaseBlock = 16_250_000;
  const inactiveBalanceLuna = 200_000_000;
  // One block short is still short.
  assert.deepEqual(planRetire({ inactiveBalanceLuna, headBlock: releaseBlock - 1, releaseBlock }),
    { kind: 'blocked', reason: 'NOT_RELEASABLE' });
  // An unknown release block counts as "not yet": offering the tap would cost a fee for a
  // transaction the staking contract rejects.
  assert.deepEqual(planRetire({ inactiveBalanceLuna, headBlock: releaseBlock + 999, releaseBlock: null }),
    { kind: 'blocked', reason: 'NOT_RELEASABLE' });
  assert.deepEqual(planRetire({ inactiveBalanceLuna: 0, headBlock: releaseBlock, releaseBlock }),
    { kind: 'blocked', reason: 'NOTHING_TO_RETIRE' });
  // Exactly at the release block it is allowed, and it retires the whole fresh inactive balance.
  assert.deepEqual(planRetire({ inactiveBalanceLuna, headBlock: releaseBlock, releaseBlock }),
    { kind: 'retire-stake', retireStakeLuna: inactiveBalanceLuna, feeLuna: STAKING_FEES_LUNA.retire });
});

test('Q12 withdraw sends the whole fresh retired balance with a zero fee', () => {
  assert.deepEqual(planRemove({ retiredBalanceLuna: 200_000_000 }),
    { kind: 'remove-stake', valueLuna: 200_000_000, feeLuna: 0 });
  // The fee is 0 because the staking contract takes it out of the retired balance: asking for
  // the balance *plus* a fee never lands (AGENTS.md 6, NimJar's pattern).
  assert.equal(STAKING_FEES_LUNA.remove, 0);
  // A different, later read is a different amount: nothing here remembers an earlier one.
  assert.deepEqual(planRemove({ retiredBalanceLuna: 199_999_700 }),
    { kind: 'remove-stake', valueLuna: 199_999_700, feeLuna: 0 });
  assert.deepEqual(planRemove({ retiredBalanceLuna: 0 }),
    { kind: 'blocked', reason: 'NOTHING_TO_WITHDRAW' });
});

test('§7.6 a payment carries the squad marker, the share and the fixed recipient', () => {
  assert.equal(paymentData('q7m2bt4h'), 'sq:q7m2bt4h');
  assert.deepEqual(planPayment({ recipient: ADDRESSES.bob, shareLuna: 200_000_000,
    shortId: 'q7m2bt4h' }),
  { kind: 'pay', recipient: ADDRESSES.bob, valueLuna: 200_000_000, data: 'sq:q7m2bt4h' });
  // Together goals has no recipient at all, so there is nothing to send.
  assert.deepEqual(planPayment({ recipient: null, shareLuna: 1, shortId: 'q7m2bt4h' }),
    { kind: 'blocked', reason: 'NO_RECIPIENT' });
  assert.deepEqual(planPayment({ recipient: ADDRESSES.bob, shareLuna: 0, shortId: 'q7m2bt4h' }),
    { kind: 'blocked', reason: 'INVALID_AMOUNT' });
});
