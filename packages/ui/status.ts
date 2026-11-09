import { DEFAULT_LANG, strings, type Lang } from './i18n';
import type { SquadStatusTone } from './StatusDot';

/**
 * The statuses a member can be in. Six are derived from the chain on every read
 * (apps/web/src/server/core/member-status.ts, PRD Q04-Q07); LEFT comes from the membership row.
 *
 * WITHDRAWN and PAID (PRD §7.4) are the two that no staker record can show: once stake has left
 * the staking contract there is nothing on it to read. They are composed above the chain status
 * in apps/web/src/server/core/squad-detail.ts, from a `remove` transaction tracked to
 * INCLUDED_OK and from a payment that passed the §7.6 check — both still chain-checked facts.
 */
export type MemberStatusView =
  | { status: 'BACKED' | 'RELEASABLE' | 'RETIRED' | 'NOT_STAKING' | 'LEFT' | 'WITHDRAWN' | 'PAID' }
  /** `shortBy` is null for anyone but the viewer: the gap reveals a balance, and the squad sees
   * commitments and backed/short, not balances (briefing/FAILURE_MODES.md, "Privacy"). */
  | { status: 'SHORT'; shortBy: number | null }
  | { status: 'UNSTAKING'; releaseBlock: number | null };

export type MemberStatusName = MemberStatusView['status'];

/**
 * The word beside the dot, in the viewer's language (packages/ui/i18n).
 *
 * `technical` picks the chain's own vocabulary — "Backed", "Unstaking", "Ready to retire" —
 * which the public proof view keeps, because its reader is checking a staking contract. Every
 * other screen gets the words a member would use for the same fact: "Saved", "Leaving".
 */
export function statusLabel(
  status: MemberStatusName, lang: Lang = DEFAULT_LANG, technical = false,
) {
  const set = strings(lang);
  return technical ? set.status[status] : set.statusPlain[status];
}

const TONES: Record<MemberStatusName, SquadStatusTone> = {
  BACKED: 'BACKED',
  SHORT: 'SHORT',
  UNSTAKING: 'UNSTAKING',
  RELEASABLE: 'READY',
  RETIRED: 'READY',
  NOT_STAKING: 'NEUTRAL',
  LEFT: 'NEUTRAL',
  WITHDRAWN: 'READY',
  // Vault Green is "transaction success" in Nimiq's own palette, which is exactly what a
  // settled share is. No new hue for it: the design is calm on money, the word is always
  // beside the dot, and RELEASABLE/RETIRED already share a tone the same way.
  PAID: 'BACKED',
};

export function statusTone(status: MemberStatusName): SquadStatusTone {
  return TONES[status];
}
