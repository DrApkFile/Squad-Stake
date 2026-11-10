import { leaveBy, leaveByShowFrom } from '../../core/leave-by';
import type { SquadCommitment } from '../../core/staking-actions';
import type { ChainTransaction, ReleaseRpc, RpcResult, StakerState, Validator } from './chain';
import { deriveLeavingSteps, type LeavingSteps } from './leave-steps';
import { memberRelease } from './member-release';
import { checkPayment, type PaymentVerdict } from './payment-check';
import { paidRoster, type RosterStore } from './settle';
import type { Membership, Squad, TrackedTx } from './squads';

/**
 * PRD §7.5 and §7.6, screen 7: where one member stands in their exit, derived from the chain
 * and from the transactions they have had tracked. Pure core — store, rpc and clock injected.
 * Nothing here moves anything; `leave-steps.ts` decides which taps are offered.
 */
export interface PlanRpc extends ReleaseRpc {
  getBlockNumber(): Promise<RpcResult<number>>;
  getStakerByAddress(address: string, options?: { fresh?: boolean }): Promise<RpcResult<StakerState>>;
  getValidatorByAddress(address: string): Promise<RpcResult<Validator>>;
  getTransactionByHash(hash: string, options?: { fresh?: boolean }): Promise<RpcResult<ChainTransaction>>;
}
export interface PlanStore extends RosterStore {
  getMembership(squadId: string, address: string): Promise<Membership | null>;
  /** Oldest first, so the last of a kind is the one the member is waiting on. */
  listTrackedTxs(squadId: string, address: string): Promise<readonly TrackedTx[]>;
  /** The member's commitments in squads that still bind their stake, with names so the
   * warning can say which squads would go short. */
  namedCommitments(address: string): Promise<readonly SquadCommitment[]>;
}
export interface PlanDeps { store: PlanStore; rpc: PlanRpc; now(): number }

export interface LeavePlanView {
  squadId: string;
  squad: { name: string; shortId: string; mode: 'A' | 'B'; recipient: string | null; goalAt: number };
  leaveBy: number;
  /** When the leave-by notice starts showing: three days before the deadline. */
  showFrom: number;
  /** The viewer's own stake — their balances, which is why they may be shown at all. */
  stake: {
    activeLuna: number; inactiveLuna: number; retiredLuna: number;
    delegation: string | null; readAt: number;
  } | null;
  /** The member's commitment here: what step one inactivates and what Mode A pays. */
  shareLuna: number;
  headBlock: number | null;
  release: {
    releaseBlock: number; remainingBlocks: number; estimatedReleaseAt: number; jailed: boolean;
  } | null;
  steps: LeavingSteps;
  /**
   * The viewer's own commitments in squads that still bind their stake, squad names included.
   * Handed over whole rather than pre-digested, so the client decides the consequences of an
   * amount with the same pure `planLeaving` the wallet call uses — the warning on screen and
   * the transaction that follows it can then never disagree. It is the viewer's own data.
   */
  commitments: readonly SquadCommitment[];
  payment: { hash: string; verified: boolean; code: string | null } | null;
  /** Mode A only: how far the squad's settlement has got, for screen 8's "4 of 6 paid". */
  roster: { paid: number; owing: number } | null;
  chainUnavailable: boolean;
}
export type PlanResult =
  | { ok: true; view: LeavePlanView }
  | { ok: false; code: 'SQUAD_NOT_FOUND' | 'NOT_A_MEMBER' };

function latest(txs: readonly TrackedTx[], kind: TrackedTx['kind']) {
  return txs.filter((tx) => tx.kind === kind).at(-1);
}

/** The release derivation itself lives in `member-release.ts`, shared with the squad page's
 * countdown (§7.4) so the two screens cannot disagree about the same member's date. */
const releaseFor = (
  unstakeHash: string | undefined, headBlock: number, delegation: string | null, deps: PlanDeps,
): Promise<LeavePlanView['release']> =>
  memberRelease({ unstakeHash, headBlock, delegation }, deps);

/** One payment, judged against §7.6 from a fresh read of its own transaction. An unreadable
 * transaction is "not confirmed yet", never a failure (PRD §8, UNKNOWN never times out). */
async function verifyPayment(
  pay: TrackedTx | undefined, squad: Squad, shareLuna: number, deps: PlanDeps,
): Promise<{ hash: string; verdict: PaymentVerdict } | null> {
  if (pay === undefined || squad.recipient === null) return null;
  const transaction = await deps.rpc.getTransactionByHash(pay.hash);
  if (!transaction.ok) return { hash: pay.hash, verdict: { ok: false, code: 'TX_NOT_CONFIRMED' } };
  return { hash: pay.hash, verdict: checkPayment(transaction.data, {
    recipient: squad.recipient, shortId: squad.shortId, shareLuna }) };
}

export async function leavePlan(
  squadId: string, address: string, deps: PlanDeps,
): Promise<PlanResult> {
  const squad = await deps.store.getSquad(squadId);
  if (squad === null) return { ok: false, code: 'SQUAD_NOT_FOUND' };
  const membership = await deps.store.getMembership(squadId, address);
  if (membership === null || membership.leftAt !== null) return { ok: false, code: 'NOT_A_MEMBER' };

  const [head, commitments, txs] = await Promise.all([
    deps.rpc.getBlockNumber(),
    deps.store.namedCommitments(address),
    deps.store.listTrackedTxs(squadId, address),
  ]);
  // The planner feeds wallet arguments, so its staker read bypasses the 60 s display cache:
  // retire and remove must send a *fresh* inactive/retired balance (Q12, AGENTS.md 6).
  const staker = await deps.rpc.getStakerByAddress(address, { fresh: true });
  const headBlock = head.ok ? head.data : null;
  const stake = staker.ok && staker.data.status === 'STAKING'
    ? { activeLuna: staker.data.staker.balance, inactiveLuna: staker.data.staker.inactiveBalance,
      retiredLuna: staker.data.staker.retiredBalance,
      delegation: staker.data.staker.delegation, readAt: staker.readAt }
    : null;

  const unstake = latest(txs, 'unstake');
  const shareLuna = membership.committedLuna;
  const release = headBlock === null || stake === null
    ? null : await releaseFor(unstake?.hash, headBlock, stake.delegation, deps);
  const payment = await verifyPayment(latest(txs, 'pay'), squad, shareLuna, deps);
  // Null for Mode B, where nobody pays anybody (PRD §4).
  const roster = await paidRoster(squad.id, { store: deps.store, rpc: deps.rpc });

  const steps = deriveLeavingSteps({
    staking: stake !== null,
    inactiveLuna: stake?.inactiveLuna ?? 0,
    retiredLuna: stake?.retiredLuna ?? 0,
    headBlock,
    releaseBlock: release?.releaseBlock ?? null,
    unstake, retire: latest(txs, 'retire'), remove: latest(txs, 'remove'), pay: latest(txs, 'pay'),
    mode: squad.mode,
    // The code travels with the verdict: a refusal §7.6 can already make final must not wait
    // for the tracker's poll before the step says so (docs/AUDIT.md, M-3).
    payment: payment === null ? null
      : payment.verdict.ok ? { verified: true } : { verified: false, code: payment.verdict.code },
  });

  return {
    ok: true,
    view: {
      squadId: squad.id,
      squad: { name: squad.name, shortId: squad.shortId, mode: squad.mode,
        recipient: squad.recipient, goalAt: squad.goalAt },
      leaveBy: leaveBy(squad.goalAt),
      showFrom: leaveByShowFrom(squad.goalAt),
      stake,
      shareLuna,
      headBlock,
      release,
      steps,
      commitments,
      payment: payment === null
        ? null
        : { hash: payment.hash, verified: payment.verdict.ok,
          code: payment.verdict.ok ? null : payment.verdict.code },
      roster: roster === null ? null : { paid: roster.paid, owing: roster.owing },
      chainUnavailable: headBlock === null || !staker.ok,
    },
  };
}
