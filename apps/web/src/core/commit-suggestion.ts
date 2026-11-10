import { LUNA_PER_NIM } from '../config/constants';

export interface CommitSuggestion { amountLuna: number; basis: 'yours' | 'share' }

/**
 * What to put in the commit sheet's amount field (docs/AUDIT.md, M-4). The member's own
 * commitment if they have one — they are changing it, not inventing it — otherwise an even
 * share of a Mode A target, counted over the members who would then be in the squad, so a
 * newcomer is included in the division. Rounded **down** to whole NIM, because a suggestion
 * that reads 3,333.33333 NIM is not a suggestion anybody wanted. Never a Mode B figure:
 * there is no shared total to divide, and inventing a personal target is inventing a number.
 */
export function commitSuggestion(
  squad: { mode: 'A' | 'B'; targetLuna: number | null }, memberCount: number,
  isMember: boolean, yoursLuna: number,
): CommitSuggestion | null {
  if (yoursLuna > 0) return { amountLuna: yoursLuna, basis: 'yours' };
  if (squad.mode !== 'A' || squad.targetLuna === null) return null;
  const payers = Math.max(1, memberCount + (isMember ? 0 : 1));
  const share = Math.floor(squad.targetLuna / payers / LUNA_PER_NIM) * LUNA_PER_NIM;
  return share > 0 ? { amountLuna: share, basis: 'share' } : null;
}
