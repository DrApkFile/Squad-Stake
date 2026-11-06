import { GOAL_MIN_AHEAD_MS } from '../../config/constants';
import { createSquadInput, joinSquadInput, type TxKind, type TxState } from '../../core/squad-contract';

export type SquadState = 'OPEN' | 'SAVING' | 'LEAVING' | 'SETTLING' | 'COMPLETED' | 'CANCELLED';
/** States in which a commitment still counts against the member's stake (PRD §8). */
export const ACTIVE_SQUAD_STATES = ['OPEN', 'SAVING', 'LEAVING', 'SETTLING'] as const;

export interface Squad {
  id: string; shortId: string; name: string; mode: 'A' | 'B';
  targetLuna: number | null; recipient: string | null;
  goalAt: number; organiser: string; state: SquadState;
}
export interface Membership {
  squadId: string; address: string; personalTargetLuna: number | null;
  committedLuna: number; leftAt: number | null;
}
export interface NewMembership { squadId: string; address: string; personalTargetLuna: number | null }
export interface TrackedTx {
  hash: string; address: string; squadId: string; kind: TxKind;
  expected: { valueLuna: number }; state: TxState; checkedAt: number | null;
}
export interface Commitment { squadId: string; committedLuna: number }

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
  /** Read-only views for screens; the invariant uses withMemberLock instead. */
  countActiveMembers(squadId: string): Promise<number>;
  activeCommitments(address: string): Promise<readonly Commitment[]>;
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
export type JoinFailure = 'INVALID_INPUT' | 'INVITE_INVALID' | 'SQUAD_CLOSED';
export type LeaveFailure = 'SQUAD_NOT_FOUND' | 'NOT_A_MEMBER';
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
        inviteTokenHash: deps.hash(inviteToken),
      };
      await deps.store.insertSquad(squad, {
        squadId: squad.id, address: organiser,
        personalTargetLuna: input.mode === 'B' ? input.personalTargetLuna : null,
      });
      // The raw invite token is returned once and never stored (FAILURE_MODES).
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
      await deps.store.joinMembership({
        squadId: squad.id, address,
        personalTargetLuna: squad.mode === 'B' ? parsed.data.personalTargetLuna ?? null : null,
      });
      return { ok: true, id: squad.id, alreadyMember: false };
    },

    async leave(address: string, squadId: string): Promise<LeaveResult> {
      const squad = await deps.store.getSquad(squadId);
      if (!squad) return { ok: false, code: 'SQUAD_NOT_FOUND' };
      const membership = await deps.store.getMembership(squadId, address);
      if (!membership || membership.leftAt !== null) return { ok: false, code: 'NOT_A_MEMBER' };
      // §7.8: the commitment goes; nothing on-chain moves unless the member unstakes.
      await deps.store.markLeft(squadId, address, deps.now());
      return { ok: true, left: true };
    },
  };
}
export type SquadService = ReturnType<typeof createSquadService>;
