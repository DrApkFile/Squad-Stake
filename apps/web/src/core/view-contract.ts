/** Shape the server reads for the join/commit sheet; shared so the client never imports it. */
export interface JoinView {
  squadId: string;
  squad: { name: string; mode: 'A' | 'B'; targetLuna: number | null; goalAt: number; memberCount: number };
  /** null until the viewer is signed in, or when the chain read failed. */
  member: { activeBalanceLuna: number | null; otherCommitmentsLuna: number; readAt: number } | null;
  delegation: string | null;
  minimumLuna: number;
  /**
   * PRD §7.7: the pool the chosen validator runs, shown before the Nimiq Pay approval that
   * creates the staker. Null when no validator was chosen (nothing to show yet, or nothing
   * eligible). `fallback: true` means Nimiq's Validators API could not be read, so the
   * choice came from chain data alone and the sheet says so instead of implying a vetted pool.
   */
  pool: PoolWire | null;
}

export interface PoolWire {
  address: string;
  name: string | null;
  /** A fraction of the reward (0.05 = 5%), or null when the pool publishes no fee. */
  feeFraction: number | null;
  payout: 'restake' | 'direct' | 'none' | null;
  payoutSchedule: string | null;
  fallback: boolean;
}

/**
 * A member's status as it crosses the wire. The server derives it from the chain on every read
 * (PRD §7.4); `shortBy` is present only for the member looking at the page, because the gap
 * between a commitment and an active balance reveals that balance, and a squad sees
 * backed-or-short, not balances (briefing/FAILURE_MODES.md, "Privacy").
 */
export type MemberStatusWire =
  | { status: 'BACKED' | 'RELEASABLE' | 'RETIRED' | 'NOT_STAKING' | 'LEFT' | 'WITHDRAWN' | 'PAID' }
  | { status: 'SHORT'; shortBy: number | null }
  | { status: 'UNSTAKING'; releaseBlock: number | null };

export interface SquadMemberWire {
  address: string;
  committedLuna: number;
  /** Null when the chain could not be read for this member; the UI then shows "—". */
  status: MemberStatusWire | null;
  readAt: number | null;
  isYou: boolean;
  /** A tracked transaction with no verdict yet. A hash is not success (PRD Q10). */
  pending: { confirmations: number | null; requiredConfirmations: number } | null;
  /** PRD §9.12: what this member's stake has earned since joining, measured on the chain,
   * or the reason it cannot be measured. */
  earned: EarnedWire | null;
}

/** The wire twin of `server/core/earned.ts`'s result; `EarnedView` in packages/ui words it. */
export type EarnedWire =
  | { known: true; luna: number; basis: { kind: 'restake'; depositsLuna: number } | { kind: 'direct'; payouts: number } }
  | { known: false; reason: EarnedReasonWire };
export type EarnedReasonWire = 'NOT_STAKING' | 'NO_POOL_DATA' | 'PAYOUT_ADDRESS_UNKNOWN'
  | 'PAYS_NOTHING' | 'OUTSIDE_STAKE' | 'UNTRACKED_DEPOSIT' | 'LEAVING' | 'CHAIN_UNAVAILABLE';

export interface SquadView {
  squadId: string;
  squad: {
    name: string; shortId: string; mode: 'A' | 'B';
    targetLuna: number | null; recipient: string | null; goalAt: number;
  };
  members: readonly SquadMemberWire[];
  /** Active members only; the roster also carries those who left. */
  memberCount: number;
  /** Σ commitments on record. */
  committedLuna: number;
  /** Σ commitments the chain currently backs — PRD §7.4 "Squad total = Σ backed amounts".
   * Null when no member could be read. */
  backedLuna: number | null;
  /** The oldest chain read behind this page, so the age shown is the worst case. */
  readAt: number | null;
  /** PRD §7.5: goal − 26 h. */
  leaveBy: number;
  /** Set when a chain read failed, so the screen can say so instead of implying a fresh read. */
  chainUnavailable: boolean;
  /** Null for squads created before migration 003, whose token cannot be recovered. */
  inviteToken: string | null;
  /** True when the viewer is a current member. */
  youAreMember: boolean;
  /** PRD §8: COMPLETED once everyone who committed has paid (Mode A). */
  state: string;
  /** Mode A only (null for Mode B): the settlement roster, "4 of 6 paid". Every hash is public
   * so a reader can re-check it on an explorer (briefing/PROOF_PLAN.md). */
  payments: {
    recipient: string;
    owing: number;
    paid: number;
    rows: readonly { address: string; hash: string | null; verified: boolean; code: string | null }[];
  } | null;
}
