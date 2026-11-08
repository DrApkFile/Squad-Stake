import { FINALITY_CONFIRMATIONS } from '../../config/constants';
import { leaveBy } from '../../core/leave-by';
import type { MemberStatusWire, SquadMemberWire, SquadView } from '../../core/view-contract';
import type { RpcResult, StakerState } from './chain';
import { deriveMemberStatus } from './member-status';
import type { MemberStatus } from './member-status';
import type { Membership, Squad } from './squads';

/**
 * Screen 5 and screen 10, read on the server (PRD §7.4): every member's commitment, the status
 * the chain says it is in, and when that read happened. Nothing here is stored as truth.
 *
 * This module is a pure core: the store, the chain and the clock come in as dependencies.
 */
export interface DetailRpc {
  getBlockNumber(): Promise<RpcResult<number>>;
  getStakerByAddress(address: string): Promise<RpcResult<StakerState>>;
}
export interface DetailStore {
  getSquad(id: string): Promise<Squad | null>;
  getSquadByShortId(shortId: string): Promise<Squad | null>;
  listMembers(squadId: string): Promise<readonly Membership[]>;
  activeCommitments(address: string): Promise<readonly { squadId: string; committedLuna: number }[]>;
  latestOpenTrackedTx(squadId: string, address: string): Promise<{ state: string } | null>;
}
export interface DetailDeps {
  store: DetailStore;
  rpc: DetailRpc;
  now(): number;
}

export type DetailFailure = 'SQUAD_NOT_FOUND' | 'NOT_A_MEMBER';
export type DetailResult = { ok: true; view: SquadView } | { ok: false; code: DetailFailure };

/**
 * Another member's `shortBy` is removed: it equals (their commitments − their active balance),
 * so publishing it publishes a balance (briefing/FAILURE_MODES.md, "Privacy"). The status word
 * itself is the squad's business — that is the point of the product.
 */
function toWire(status: MemberStatus, isViewer: boolean): MemberStatusWire {
  if (status.status !== 'SHORT') return status;
  return { status: 'SHORT', shortBy: isViewer ? status.shortBy : null };
}

async function memberRow(
  squad: Squad,
  membership: Membership,
  viewer: string | null,
  headBlock: number | null,
  deps: DetailDeps,
): Promise<SquadMemberWire> {
  const isYou = viewer !== null && membership.address === viewer;
  const base = { address: membership.address, committedLuna: membership.committedLuna, isYou };
  // A member who left keeps no commitment and needs no chain read (PRD §7.4 lists LEFT).
  if (membership.leftAt !== null) {
    return { ...base, status: { status: 'LEFT' }, readAt: membership.leftAt, pending: null };
  }
  if (headBlock === null) return { ...base, status: null, readAt: null, pending: null };

  const [staker, commitments, openTx] = await Promise.all([
    deps.rpc.getStakerByAddress(membership.address),
    deps.store.activeCommitments(membership.address),
    deps.store.latestOpenTrackedTx(squad.id, membership.address),
  ]);
  const pending = openTx === null
    ? null
    : { confirmations: null, requiredConfirmations: FINALITY_CONFIRMATIONS };
  if (!staker.ok) return { ...base, status: null, readAt: null, pending };

  const status = deriveMemberStatus({
    staker: staker.data.status === 'STAKING' ? staker.data.staker : null,
    commitments: commitments.map((commitment) => commitment.committedLuna),
    headBlock,
    // The release block is not derived here. A staker's `inactiveFrom` is already an effective
    // election block, so it must not be fed to calculateRelease as an inclusion block, and
    // guessing is worse than saying nothing: unknown release stays UNSTAKING (docs/PROGRESS.md,
    // 2026-11-06). The planner (PRD §7.5) computes it from the inactivation transaction.
    releaseBlock: null,
  });
  return { ...base, status: toWire(status, isYou), readAt: staker.readAt, pending };
}

async function buildView(squad: Squad, viewer: string | null, deps: DetailDeps): Promise<SquadView> {
  const head = await deps.rpc.getBlockNumber();
  const headBlock = head.ok ? head.data : null;
  const memberships = await deps.store.listMembers(squad.id);
  const members: SquadMemberWire[] = [];
  for (const membership of memberships) {
    members.push(await memberRow(squad, membership, viewer, headBlock, deps));
  }
  const active = members.filter((member) => member.status?.status !== 'LEFT');
  const reads = active.map((member) => member.readAt).filter((at): at is number => at !== null);
  const backedReads = active.filter((member) => member.status !== null);
  return {
    squadId: squad.id,
    squad: {
      name: squad.name, shortId: squad.shortId, mode: squad.mode,
      targetLuna: squad.targetLuna, recipient: squad.recipient, goalAt: squad.goalAt,
    },
    members,
    memberCount: active.length,
    committedLuna: active.reduce((total, member) => total + member.committedLuna, 0),
    backedLuna: backedReads.length === 0
      ? null
      : backedReads
        .filter((member) => member.status?.status === 'BACKED')
        .reduce((total, member) => total + member.committedLuna, 0),
    readAt: reads.length === 0 ? null : Math.min(...reads),
    leaveBy: leaveBy(squad.goalAt),
    chainUnavailable: headBlock === null || backedReads.length < active.length,
    inviteToken: squad.inviteToken,
    youAreMember: memberships.some(
      (membership) => membership.address === viewer && membership.leftAt === null,
    ),
  };
}

/** The squad's own page. Members only: a stranger gets NOT_A_MEMBER and is offered the public
 * proof view instead. */
export async function squadDetail(
  squadId: string,
  viewer: string,
  deps: DetailDeps,
): Promise<DetailResult> {
  const squad = await deps.store.getSquad(squadId);
  if (squad === null) return { ok: false, code: 'SQUAD_NOT_FOUND' };
  const view = await buildView(squad, viewer, deps);
  if (!view.youAreMember) return { ok: false, code: 'NOT_A_MEMBER' };
  return { ok: true, view };
}

/** The public proof view: no session, no viewer, so every `shortBy` is masked and no invite
 * token is handed out. */
export async function squadProof(id: string, deps: DetailDeps): Promise<DetailResult> {
  const squad = (await deps.store.getSquadByShortId(id)) ?? (await deps.store.getSquad(id));
  if (squad === null) return { ok: false, code: 'SQUAD_NOT_FOUND' };
  const view = await buildView(squad, null, deps);
  return { ok: true, view: { ...view, inviteToken: null } };
}
