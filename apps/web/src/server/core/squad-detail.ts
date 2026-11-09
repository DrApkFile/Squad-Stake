import { leaveBy } from '../../core/leave-by';
import type {
  MemberStatusWire, PendingWire, SquadMemberWire, SquadView, YourExit,
} from '../../core/view-contract';
import type { RpcResult, Staker, StakerState } from './chain';
import { memberEarned, type EarnedDeps } from './member-earned';
import { memberRelease, type MemberRelease, type MemberReleaseRpc } from './member-release';
import { deriveMemberStatus } from './member-status';
import type { MemberStatus } from './member-status';
import { pendingView, stakeEffectSeen } from './pending-view';
import { paidRoster, type PaidRoster, type RosterStore, type SettleRpc } from './settle';
import type { Membership, Squad, TrackedTx } from './squads';
import { exitStageOf, stageTotals } from './squad-stages';
import type { TrackResult } from './tx-tracker';

/**
 * Screen 5 and screen 10, read on the server (PRD §7.4): every member's commitment, the status
 * the chain says it is in, and when that read happened. Nothing here is stored as truth.
 *
 * This module is a pure core: the store, the chain and the clock come in as dependencies.
 */
export interface DetailRpc extends SettleRpc, MemberReleaseRpc {
  getBlockNumber(): Promise<RpcResult<number>>;
  getStakerByAddress(address: string): Promise<RpcResult<StakerState>>;
}
export interface DetailStore extends RosterStore {
  getSquadByShortId(shortId: string): Promise<Squad | null>;
  activeCommitments(address: string): Promise<readonly { squadId: string; committedLuna: number }[]>;
  latestOpenTrackedTx(squadId: string, address: string): Promise<TrackedTx | null>;
  /** This member's tracked transactions for this squad: a finished `remove` is what turns a
   * chain-derived status into WITHDRAWN (PRD §7.4, which lists it). */
  listTrackedTxs(squadId: string, address: string): Promise<readonly TrackedTx[]>;
}
export interface DetailDeps {
  store: DetailStore;
  rpc: DetailRpc;
  now(): number;
  /**
   * The tracker, so an open transaction on this page is actually checked against the chain.
   * Without it a tracked row stays SUBMITTED for ever and the page contradicts the staker
   * record it shows beside it — the defect found on testnet (docs/PROGRESS.md 2026-11-09).
   * Advancing the row here is also what makes WITHDRAWN reachable, since `overlay` below wants
   * a `remove` settled as INCLUDED_OK.
   *
   * Optional so the pure-core tests can leave it out; `squad-view.ts` always supplies it.
   */
  tracker?: { check(hash: string): Promise<TrackResult> } | undefined;
  /**
   * PRD §9.12, optional: when present, the row of the member looking at the page carries what
   * their stake has earned since joining. Nobody else's row does — earned growth plus the
   * deposits it was measured against is their active balance (see `member-earned.ts`).
   */
  earned?: EarnedDeps | undefined;
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

/**
 * What an open tracked transaction may say on this page. The verdict and the count come from
 * the tracker's own read of that transaction; the effect comes from the staker record this row
 * already holds. `pending-view.ts` then refuses to pair "nothing confirmed" with an effect the
 * chain is already showing.
 */
async function pendingFor(
  openTx: TrackedTx | null,
  txs: readonly TrackedTx[],
  staker: Staker | null,
  deps: DetailDeps,
): Promise<{ pending: PendingWire | null; settledState: TrackedTx['state'] | null }> {
  if (openTx === null) return { pending: null, settledState: null };
  const checked = deps.tracker === undefined ? null : await deps.tracker.check(openTx.hash);
  const settled = checked !== null && checked.ok ? checked : null;
  const pending = pendingView({
    state: settled?.state ?? openTx.state,
    confirmations: settled?.confirmations ?? null,
    effectSeen: stakeEffectSeen({
      kind: openTx.kind,
      staker,
      retiredEarlier: txs.some((tx) => tx.kind === 'retire' && tx.state === 'INCLUDED_OK'),
    }),
  });
  // The settled verdict goes back to the caller, not only into `pending`: `txs` was read
  // before this check, so `overlay` would otherwise judge WITHDRAWN on the row's *previous*
  // state and only grant it on the next page load. Found against real Postgres on
  // 2026-11-09: a `remove` settling to INCLUDED_OK left the member NOT_STAKING for one load.
  return { pending, settledState: settled?.state ?? null };
}

async function memberRow(
  squad: Squad,
  membership: Membership,
  viewer: string | null,
  headBlock: number | null,
  paid: PaidRoster | null,
  deps: DetailDeps,
): Promise<{ wire: SquadMemberWire; release: MemberRelease | null }> {
  const isYou = viewer !== null && membership.address === viewer;
  const base = { address: membership.address, committedLuna: membership.committedLuna, isYou,
    earned: null };
  // A member who left keeps no commitment and needs no chain read (PRD §7.4 lists LEFT).
  if (membership.leftAt !== null) {
    return { wire: { ...base, status: { status: 'LEFT' }, readAt: membership.leftAt, pending: null },
      release: null };
  }
  if (headBlock === null) {
    return { wire: { ...base, status: null, readAt: null, pending: null }, release: null };
  }

  const [staker, commitments, openTx, txs] = await Promise.all([
    deps.rpc.getStakerByAddress(membership.address),
    deps.store.activeCommitments(membership.address),
    deps.store.latestOpenTrackedTx(squad.id, membership.address),
    deps.store.listTrackedTxs(squad.id, membership.address),
  ]);
  const record = staker.ok && staker.data.status === 'STAKING' ? staker.data.staker : null;
  const { pending, settledState } = await pendingFor(openTx, txs, record, deps);
  // The tracked rows as they stand *after* that check, so the overlay below sees the verdict
  // this request just established rather than the one the page was loaded with.
  const settledTxs = settledState === null || openTx === null ? txs
    : txs.map((tx) => (tx.hash === openTx.hash ? { ...tx, state: settledState } : tx));
  /**
   * The release is derived for the member looking at the page only. It costs several chain
   * reads (the inactivation's inclusion block, the election and reporting-window policies, and
   * the validator if the stake is delegated), and it is their own banner and their own
   * countdown that need it. Every other row keeps `releaseBlock: null` and says the release
   * time is unknown, exactly as before — honest, and the page stays one read per member.
   */
  const release = isYou && record !== null && record.inactiveBalance > 0
    ? await memberRelease({
      unstakeHash: txs.filter((tx) => tx.kind === 'unstake').at(-1)?.hash,
      headBlock,
      delegation: record.delegation,
    }, deps)
    : null;
  const earned = isYou && deps.earned !== undefined
    ? await memberEarned({
      address: membership.address,
      joinedAt: membership.joinedAt,
      stake: staker.ok && staker.data.status === 'STAKING'
        ? { activeLuna: staker.data.staker.balance,
          delegation: staker.data.staker.delegation }
        : null,
      chainRead: staker.ok,
    }, deps.earned)
    : null;
  if (!staker.ok) {
    return { wire: { ...base, earned, status: null, readAt: null, pending }, release: null };
  }

  const status = deriveMemberStatus({
    staker: staker.data.status === 'STAKING' ? staker.data.staker : null,
    commitments: commitments.map((commitment) => commitment.committedLuna),
    headBlock,
    // A staker's `inactiveFrom` is never used here: it is already an effective election block
    // and must not be fed to calculateRelease as an inclusion block (confirmed live on testnet
    // 2026-11-09, where it read 43,167 blocks after the inactivation's own block). The block
    // below comes from `member-release.ts`, which counts from the inactivation transaction —
    // and it is null for everyone but the viewer, so their row still says "unknown" rather
    // than a guess (docs/PROGRESS.md 2026-11-06).
    releaseBlock: release?.releaseBlock ?? null,
  });
  return {
    wire: { ...base, earned, status: overlay(status, isYou, settledTxs, paid, membership.address),
      readAt: staker.readAt, pending },
    release,
  };
}

/**
 * PRD §7.4 lists WITHDRAWN and PAID beside the six chain-derived statuses. Neither can come
 * out of `deriveMemberStatus`, which only ever sees a staker record: once stake has left the
 * staking contract there is nothing on it to read, and a Mode A payment is a plain transfer to
 * a third party. So they are composed *above* the chain status, from facts that are themselves
 * chain-checked — a `remove` transaction tracked to INCLUDED_OK, and a payment that passed
 * §7.6 — rather than by loosening the one function the whole product's honesty rests on.
 *
 * PAID wins over WITHDRAWN: it is the later stage of the same journey (PRD §8).
 */
function overlay(
  status: MemberStatus,
  isViewer: boolean,
  txs: readonly { kind: string; state: string }[],
  paid: PaidRoster | null,
  address: string,
): MemberStatusWire {
  if (paid?.rows.some((row) => row.address === address && row.verified)) return { status: 'PAID' };
  const withdrawn = txs.some((tx) => tx.kind === 'remove' && tx.state === 'INCLUDED_OK');
  if (withdrawn) return { status: 'WITHDRAWN' };
  return toWire(status, isViewer);
}

async function buildView(squad: Squad, viewer: string | null, deps: DetailDeps): Promise<SquadView> {
  const head = await deps.rpc.getBlockNumber();
  const headBlock = head.ok ? head.data : null;
  const memberships = await deps.store.listMembers(squad.id);
  // Mode A only; `paidRoster` answers null for Mode B, where nobody pays anybody (PRD §4).
  const paid = await paidRoster(squad.id, { store: deps.store, rpc: deps.rpc });
  const members: SquadMemberWire[] = [];
  let yourRelease: MemberRelease | null = null;
  for (const membership of memberships) {
    const row = await memberRow(squad, membership, viewer, headBlock, paid, deps);
    members.push(row.wire);
    if (row.wire.isYou) yourRelease = row.release;
  }
  const active = members.filter((member) => member.status?.status !== 'LEFT');
  const reads = active.map((member) => member.readAt).filter((at): at is number => at !== null);
  const backedReads = active.filter((member) => member.status !== null);
  const you = members.find((member) => member.isYou && member.status?.status !== 'LEFT');
  return {
    yourExit: you === undefined ? null : {
      stage: exitStageOf(you.status),
      committedLuna: you.committedLuna,
      release: yourRelease,
      headBlock,
    } satisfies YourExit,
    stages: stageTotals(members),
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
    state: squad.state,
    payments: paid === null || squad.recipient === null
      ? null
      : { recipient: squad.recipient, owing: paid.owing, paid: paid.paid, rows: paid.rows },
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
