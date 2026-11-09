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
  /**
   * A tracked transaction that has not settled yet. A hash is not success (PRD Q10).
   * `phase` carries what the row may say: `INCLUDED_CONFIRMING` means the chain already shows
   * the transaction's effect, so the row can never claim a zero count
   * (`src/server/core/pending-view.ts`). A null `confirmations` means "not read" and must be
   * worded, never printed as a digit.
   */
  pending: PendingWire | null;
  /** PRD §9.12: what this member's stake has earned since joining, measured on the chain,
   * or the reason it cannot be measured. */
  earned: EarnedWire | null;
}

/** The wire twin of `server/core/pending-view.ts`'s result. */
export interface PendingWire {
  phase: 'FINAL' | 'INCLUDED_CONFIRMING' | 'FAILED' | 'SUBMITTED' | 'UNKNOWN';
  confirmations: number | null;
  requiredConfirmations: number;
}

/** The wire twin of `server/core/earned.ts`'s result; `EarnedView` in packages/ui words it. */
export type EarnedWire =
  | { known: true; luna: number; basis: { kind: 'restake'; depositsLuna: number } | { kind: 'direct'; payouts: number } }
  | { known: false; reason: EarnedReasonWire };
export type EarnedReasonWire = 'NOT_STAKING' | 'NO_POOL_DATA' | 'PAYOUT_ADDRESS_UNKNOWN'
  | 'PAYS_NOTHING' | 'OUTSIDE_STAKE' | 'UNTRACKED_DEPOSIT' | 'LEAVING' | 'CHAIN_UNAVAILABLE';

/**
 * Every member's share counted once, under the stage the chain says it has reached. The stages
 * are a journey, not a success/failure pair: `backed` (saved), `leaving` (inactivating),
 * `ready` (released or retired, waiting to be withdrawn), `withdrawn`, `paid`.
 */
export interface StageTotals {
  backedLuna: number;
  leavingLuna: number;
  readyLuna: number;
  withdrawnLuna: number;
  paidLuna: number;
  /** SHORT or not staking: the only shares that are genuinely absent. */
  missingLuna: number;
  /** Members whose chain read failed. Not counted as missing — nobody read them. */
  unreadLuna: number;
  /** backed + leaving + ready + withdrawn + paid. */
  coveredLuna: number;
}

export type ExitStage = 'none' | 'leaving' | 'ready' | 'withdrawn' | 'paid';

export interface YourExit {
  stage: ExitStage;
  /** The viewer's own commitment: what is in the exit, and what the countdown is about. */
  committedLuna: number;
  /**
   * Derived from the inactivation's inclusion block (`server/core/member-release.ts`), never
   * from the staker's `inactiveFrom`. Null while it cannot be derived, and the screen then
   * says the release time is unknown rather than guessing one.
   */
  release: { releaseBlock: number; remainingBlocks: number; estimatedReleaseAt: number;
    jailed: boolean } | null;
  headBlock: number | null;
}

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
  /**
   * The same commitments, split by the stage each member's share has reached, so a member who
   * is leaving on schedule is not reported as a failure. Null when no member could be read.
   *
   * `coveredLuna` is every stage except `missing` and `unread`: a share only counts as missing
   * when the member is actually short of it (SHORT, or not staking at all).
   */
  stages: StageTotals | null;
  /**
   * The viewer's own exit, for the leave-by banner (PRD §7.5). Null for a non-member;
   * `stage: 'none'` is the only stage that may be offered "Start leaving".
   */
  yourExit: YourExit | null;
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
