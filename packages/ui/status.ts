import type { SquadStatusTone } from './StatusDot';

/**
 * The statuses a member can be in. Six are derived from the chain on every read
 * (apps/web/src/server/core/member-status.ts, PRD Q04-Q07); LEFT comes from the membership row.
 *
 * PRD §7.4 also lists WITHDRAWN and PAID. Neither is here yet: WITHDRAWN needs a tracked
 * `remove` transaction and PAID needs a Mode A payment, and neither of those is implemented, so
 * no read could ever produce them. They arrive with §7.5 and §7.6.
 */
export type MemberStatusView =
  | { status: 'BACKED' | 'RELEASABLE' | 'RETIRED' | 'NOT_STAKING' | 'LEFT' }
  /** `shortBy` is null for anyone but the viewer: the gap reveals a balance, and the squad sees
   * commitments and backed/short, not balances (briefing/FAILURE_MODES.md, "Privacy"). */
  | { status: 'SHORT'; shortBy: number | null }
  | { status: 'UNSTAKING'; releaseBlock: number | null };

export type MemberStatusName = MemberStatusView['status'];

export const STATUS_LABELS: Record<MemberStatusName, string> = {
  BACKED: 'Backed',
  SHORT: 'Short',
  UNSTAKING: 'Unstaking',
  RELEASABLE: 'Ready to retire',
  RETIRED: 'Ready to withdraw',
  NOT_STAKING: 'Not staking',
  LEFT: 'Left the squad',
};

const TONES: Record<MemberStatusName, SquadStatusTone> = {
  BACKED: 'BACKED',
  SHORT: 'SHORT',
  UNSTAKING: 'UNSTAKING',
  RELEASABLE: 'READY',
  RETIRED: 'READY',
  NOT_STAKING: 'NEUTRAL',
  LEFT: 'NEUTRAL',
};

export function statusTone(status: MemberStatusName): SquadStatusTone {
  return TONES[status];
}
