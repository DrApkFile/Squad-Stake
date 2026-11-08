import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEAVE_BY_LEAD_MS, LEAVE_BY_WARNING_MS } from '../../apps/web/src/config/constants';
import { leaveBy, leaveByIsNear } from '../../apps/web/src/core/leave-by';

const HOUR = 3_600_000;
const goalAt = Date.parse('2026-12-18T00:00:00Z');

test('Q08 the leave-by deadline is the goal minus a day of unstaking plus two hours of margin', () => {
  assert.equal(LEAVE_BY_LEAD_MS, 26 * HOUR);
  assert.equal(leaveBy(goalAt), goalAt - 26 * HOUR);
  assert.equal(new Date(leaveBy(goalAt)).toISOString(), '2026-12-16T22:00:00.000Z');
  // It is a planning floor, never later than the goal itself.
  assert.ok(leaveBy(goalAt) < goalAt);
});

test('Q08 the banner appears three days before the deadline, not three days before the goal', () => {
  assert.equal(LEAVE_BY_WARNING_MS, 3 * 24 * HOUR);
  const deadline = leaveBy(goalAt);
  assert.equal(leaveByIsNear(goalAt, deadline - LEAVE_BY_WARNING_MS - 1), false);
  assert.equal(leaveByIsNear(goalAt, deadline - LEAVE_BY_WARNING_MS), true);
  assert.equal(leaveByIsNear(goalAt, deadline), true);
  // Past the deadline it stays on: the member needs to know they are late, not lose the notice.
  assert.equal(leaveByIsNear(goalAt, deadline + 10 * HOUR), true);
});
