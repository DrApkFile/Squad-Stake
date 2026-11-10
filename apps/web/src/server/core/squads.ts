import { GOAL_MIN_AHEAD_MS } from '../../config/constants';
import { createSquadInput, joinSquadInput, type TxKind, type TxState } from '../../core/squad-contract';

export type SquadState = 'OPEN' | 'SAVING' | 'LEAVING' | 'SETTLING' | 'COMPLETED' | 'CANCELLED';
/** States in which a commitment still counts against the member's stake (PRD §8). */
export const ACTIVE_SQUAD_STATES = ['OPEN', 'SAVING', 'LEAVING', 'SETTLING'] as const;
/**
 * States a squad is still shown on "My squads" in. A COMPLETED squad binds no stake any more
 * (§7.6: everyone paid), but it is the end of the story the member came for, so it stays on
 * their list instead of vanishing the moment it succeeds.
 */
export const LISTED_SQUAD_STATES = [...ACTIVE_SQUAD_STATES, 'COMPLETED'] as const;

export interface Squad {
  id: string; shortId: string; name: string; mode: 'A' | 'B';
  targetLuna: number | null; recipient: string | null;
  goalAt: number; organiser: string; state: SquadState;
  /** The plaintext invite token, so a member can share the link again (migration 003).
   * Null for squads created before that migration. */
  inviteToken: string | null;
}
export interface Membership {
  squadId: string; address: string; personalTargetLuna: number | null;
  committedLuna: number;
  /** When this membership started (migration 002 `joined_at`). "Earned since joining"
   * measures from it, and the roster is ordered by it. */
  joinedAt: number;
  leftAt: number | null;
}
export interface NewMembership { squadId: string; address: string; personalTargetLuna: number | null }
/**
 * `expected` is what the wallet was *asked* for: an audit trail, never an input to a decision.
 * The column can also carry a recipient and the `sq:<short_id>` marker (ARCHITECTURE:
 * "expected jsonb — recipient/value/data for checks"), but nothing reads them: the tracker
 * records `valueLuna` alone, and the §7.6 verdict compares the chain's own copy of the
 * transaction against the squad row's recipient and short id, from a fresh read every time.
 */
export interface TxExpectation {
  valueLuna: number; recipient?: string | undefined; data?: string | undefined;
}
export interface TrackedTx {
  hash: string; address: string; squadId: string; kind: TxKind;
  expected: TxExpectation; state: TxState; checkedAt: number | null;
}
export interface Commitment { squadId: string; committedLuna: number }
/** One row of "My squads": the squad, what the viewer committed, and the squad's own totals.
 * The totals are our record of commitments, not a chain read — only the squad page says
 * "backed", and only after reading the chain. */
export interface SquadSummary {
  squad: Squad;
  committedLuna: number;
  memberCount: number;
  squadCommittedLuna: number;
}

/** The member's rows, already locked for the life of one database transaction. */
export interface LockedMember {
  commitments(): Promise<readonly Commitment[]>;
  setCommitment(squadId: string, committedLuna: number): Promise<boolean>;
}
export interface SquadStore {
  /** One transaction: a squad without its organiser's membership would be unusable. */
  insertSquad(squad: Squad & { inviteTokenHash: string }, organiser: NewMembership): Promise<void>;
  getSquad(id: string): Promise<Squad | null>;
  getSquadByInviteHash(inviteTokenHash: string): Promise<Squad | null>;
  getMembership(squadId: string, address: string): Promise<Membership | null>;
  /** Joins or re-joins; a re-join starts from a zero commitment (§7.8 removed it). */
  joinMembership(membership: NewMembership): Promise<boolean>;
  markLeft(squadId: string, address: string, at: number): Promise<boolean>;
  getSquadByShortId(shortId: string): Promise<Squad | null>;
  /** Read-only views for screens; the invariant uses withMemberLock instead. */
  countActiveMembers(squadId: string): Promise<number>;
  activeCommitments(address: string): Promise<readonly Commitment[]>;
  /** The roster, members who left included: PRD §7.4 lists LEFT as a status. */
  listMembers(squadId: string): Promise<readonly Membership[]>;
  squadsForAddress(address: string): Promise<readonly SquadSummary[]>;
  /** This member's most recent transaction for this squad that has no verdict yet, so the
   * roster can say "pending" instead of implying the commitment is settled (Q10). */
  latestOpenTrackedTx(squadId: string, address: string): Promise<TrackedTx | null>;
  /** One member's tracked transactions for one squad, oldest first: the planner reads the
   * last of each kind to decide which leaving step they are on (§7.5). */
  listTrackedTxs(squadId: string, address: string): Promise<readonly TrackedTx[]>;
  /** Every member's transactions of one kind in a squad, for the paid roster (§7.6). */
  listSquadTrackedTxs(squadId: string, kind: TxKind): Promise<readonly TrackedTx[]>;
  /** One address's tracked transactions across every squad. Stake is per address, not per
   * squad, so "earned since joining" (§9.12) can only subtract deposits if it sees them all. */
  trackedTxsForAddress(address: string): Promise<readonly TrackedTx[]>;
  /** Distinct addresses with a current membership, ordered, capped by `limit`: the §7.7 spread
   * counts how many of this app's members each validator already has. */
  activeMemberAddresses(limit: number): Promise<readonly string[]>;
  /** The viewer's commitments in squads that still bind their stake, with squad names, so the
   * leaving screen can name the squads that would go short. */
  namedCommitments(address: string): Promise<readonly { squadId: string; name: string; committedLuna: number }[]>;
  /** Conditional, like every other state move: 0 rows means someone else got there first. */
  setSquadState(squadId: string, from: SquadState, to: SquadState): Promise<boolean>;
  withMemberLock<T>(address: string, run: (locked: LockedMember) => Promise<T>): Promise<T>;
  insertTrackedTx(tx: TrackedTx): Promise<boolean>;
  getTrackedTx(hash: string): Promise<TrackedTx | null>;
  setTrackedTxState(hash: string, from: TxState, to: TxState, checkedAt: number): Promise<boolean>;
}
export interface SquadDeps {
  store: SquadStore;
  now(): number;
  uuid(): string;
  shortId(): string;
  inviteToken(): string;
  hash(value: string): string;
}

export type CreateFailure = 'INVALID_INPUT' | 'GOAL_TOO_SOON' | 'UNAVAILABLE';
export type JoinFailure = 'INVALID_INPUT' | 'INVITE_INVALID' | 'SQUAD_CLOSED' | 'UNAVAILABLE';
export type LeaveFailure = 'SQUAD_NOT_FOUND' | 'NOT_A_MEMBER' | 'LEAVE_BLOCKED';
type CreateResult = { ok: true; id: string; shortId: string; inviteToken: string } | { ok: false; code: CreateFailure };
type JoinResult = { ok: true; id: string; alreadyMember: boolean } | { ok: false; code: JoinFailure };
type LeaveResult = { ok: true; left: true } | { ok: false; code: LeaveFailure };

export function isActive(squad: Squad) {
  return (ACTIVE_SQUAD_STATES as readonly SquadState[]).includes(squad.state);
}

export function createSquadService(deps: SquadDeps) {
  return {
    async create(organiser: string, body: unknown): Promise<CreateResult> {
      const parsed = createSquadInput.safeParse(body);
      if (!parsed.success) return { ok: false, code: 'INVALID_INPUT' };
      const input = parsed.data;
      // PRD §7.2: a squad nobody can save into is not worth creating.
      if (input.goalAt - deps.now() < GOAL_MIN_AHEAD_MS) return { ok: false, code: 'GOAL_TOO_SOON' };
      const inviteToken = deps.inviteToken();
      const squad: Squad & { inviteTokenHash: string } = {
        id: deps.uuid(), shortId: deps.shortId(), name: input.name, mode: input.mode,
        targetLuna: input.mode === 'A' ? input.targetLuna : null,
        recipient: input.mode === 'A' ? input.recipient : null,
        goalAt: input.goalAt, organiser, state: 'OPEN',
        inviteToken,
        inviteTokenHash: deps.hash(inviteToken),
      };
      await deps.store.insertSquad(squad, {
        squadId: squad.id, address: organiser,
        personalTargetLuna: input.mode === 'B' ? input.personalTargetLuna : null,
      });
      // Returned here for the share step, and kept so a member can share it again later
      // (migration 003 explains why that is safe for an invite token).
      return { ok: true, id: squad.id, shortId: squad.shortId, inviteToken };
    },

    async join(address: string, squadId: string, body: unknown): Promise<JoinResult> {
      const parsed = joinSquadInput.safeParse(body);
      if (!parsed.success) return { ok: false, code: 'INVALID_INPUT' };
      const squad = await deps.store.getSquadByInviteHash(deps.hash(parsed.data.token));
      // The token authorises the join; the path id must agree with it (ARCHITECTURE endpoints).
      if (!squad || squad.id !== squadId) return { ok: false, code: 'INVITE_INVALID' };
      if (!isActive(squad)) return { ok: false, code: 'SQUAD_CLOSED' };
      const existing = await deps.store.getMembership(squad.id, address);
      if (existing && existing.leftAt === null) return { ok: true, id: squad.id, alreadyMember: true };
      const joined = await deps.store.joinMembership({
        squadId: squad.id, address,
        personalTargetLuna: squad.mode === 'B' ? parsed.data.personalTargetLuna ?? null : null,
      });
      // The insert is conditional (`WHERE left_at IS NOT NULL`), so a false verdict means it
      // matched no row — which can only be a join that landed between the read above and this
      // write. Re-read rather than guess: a current membership is the same success the other
      // caller got, and anything else is a write we cannot account for, so it is not reported
      // as success (docs/AUDIT.md, n-4).
      if (!joined) {
        const now = await deps.store.getMembership(squad.id, address);
        if (now === null || now.leftAt !== null) return { ok: false, code: 'UNAVAILABLE' };
        return { ok: true, id: squad.id, alreadyMember: true };
      }
      return { ok: true, id: squad.id, alreadyMember: false };
    },

    async leave(address: string, squadId: string): Promise<LeaveResult> {
      const squad = await deps.store.getSquad(squadId);
      if (!squad) return { ok: false, code: 'SQUAD_NOT_FOUND' };
      const membership = await deps.store.getMembership(squadId, address);
      if (!membership || membership.leftAt !== null) return { ok: false, code: 'NOT_A_MEMBER' };
      // §7.8: the commitment goes; nothing on-chain moves unless the member unstakes.
      // `markLeft` is conditional on `left_at IS NULL`, so false means another request left
      // first or the row is gone. Reporting success would tell the member their commitment was
      // released on the strength of a write that did not happen; `LEAVE_BLOCKED` is retryable
      // and says the stake is untouched, which is true either way (docs/AUDIT.md, n-1, n-4).
      if (!await deps.store.markLeft(squadId, address, deps.now())) {
        return { ok: false, code: 'LEAVE_BLOCKED' };
      }
      return { ok: true, left: true };
    },
  };
}
export type SquadService = ReturnType<typeof createSquadService>;
