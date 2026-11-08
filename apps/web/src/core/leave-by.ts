import { LEAVE_BY_LEAD_MS, LEAVE_BY_WARNING_MS } from '../config/constants';

/**
 * PRD §7.5 / Q08: `leaveBy = goalTime − 24 h − 2 h margin`.
 *
 * The 24 h is the worst case for an unstake to clear: `setActiveStake` takes effect at the next
 * election block and the stake is only released after the reporting window that follows it
 * (briefing/knowledge/staking.md). The extra 2 h is margin for the member to notice and tap.
 * A jailed validator pushes the real release later still, which the planner reads from the
 * chain; this deadline is the planning floor, not a promise.
 */
export function leaveBy(goalAt: number) {
  return goalAt - LEAVE_BY_LEAD_MS;
}

/** True once the deadline is within three days, when the banner has to be on every screen. */
export function leaveByIsNear(goalAt: number, now: number) {
  return leaveBy(goalAt) - now <= LEAVE_BY_WARNING_MS;
}
