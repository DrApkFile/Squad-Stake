import type { ChainTransaction, RpcResult } from './chain';
import { checkPayment, type PaymentFailure } from './payment-check';
import type { TxKind } from '../../core/squad-contract';
import type { Membership, Squad, SquadState, TrackedTx } from './squads';

/**
 * PRD §7.6 settlement. Two jobs, both built on `payment-check.ts`:
 *
 * - `paidRoster` — who has paid, derived from the chain on every read, for "4 of 6 paid".
 * - `settlePayment` — judge one member's payment and, if that was the last one outstanding,
 *   move the squad to COMPLETED. The only write in this module, and conditional, so two
 *   members finishing at once cannot both "complete" the squad.
 *
 * No payment verdict is ever stored. `tracked_txs` keeps the hash and what the wallet was
 * asked for; whether it settled is re-read from the chain each time (AGENTS.md 1 and 3).
 */
/** What the read-only roster needs. The squad page depends on exactly this and nothing that
 * writes, so a page render cannot change a squad's state. */
export interface RosterStore {
  getSquad(id: string): Promise<Squad | null>;
  listMembers(squadId: string): Promise<readonly Membership[]>;
  listSquadTrackedTxs(squadId: string, kind: TxKind): Promise<readonly TrackedTx[]>;
}
export interface SettleStore extends RosterStore {
  getMembership(squadId: string, address: string): Promise<Membership | null>;
  setSquadState(squadId: string, from: SquadState, to: SquadState): Promise<boolean>;
}
export interface SettleRpc {
  /** `fresh: false` asks for the 60 s cache: a final transaction's fields do not change, and
   * the roster reads one transaction per payer on every page load (rpc.ts). */
  getTransactionByHash(hash: string, options?: { fresh?: boolean }): Promise<RpcResult<ChainTransaction>>;
}
export interface RosterDeps { store: RosterStore; rpc: SettleRpc }
export interface SettleDeps { store: SettleStore; rpc: SettleRpc }

/** One member's settlement as the squad sees it. `hash` is public on purpose: a reader can
 * re-check it on any Nimiq explorer (briefing/PROOF_PLAN.md "Verify it yourself"). */
export interface PaidRow { address: string; hash: string | null; verified: boolean; code: string | null }
export interface PaidRoster {
  rows: readonly PaidRow[];
  /** Members with a commitment to settle, and how many of them have a verified payment. */
  owing: number;
  paid: number;
}

/** Members who owe a payment: current members with something committed. A member who left has
 * no commitment (§7.8), so there is nothing for them to pay. */
const owingMembers = (members: readonly Membership[]) =>
  members.filter((member) => member.leftAt === null && member.committedLuna > 0);

export async function paidRoster(squadId: string, deps: RosterDeps): Promise<PaidRoster | null> {
  const squad = await deps.store.getSquad(squadId);
  if (squad === null || squad.mode !== 'A' || squad.recipient === null) return null;
  const [members, payments] = await Promise.all([
    deps.store.listMembers(squadId),
    deps.store.listSquadTrackedTxs(squadId, 'pay'),
  ]);
  const owing = owingMembers(members);
  const rows: PaidRow[] = [];
  for (const member of owing) {
    const mine = payments.filter((payment) => payment.address === member.address);
    let row: PaidRow = { address: member.address, hash: null, verified: false, code: null };
    // Any one verified payment settles the member; a failed attempt followed by a good one is
    // a settled member, so the loop keeps looking after a refusal.
    for (const payment of mine) {
      const transaction = await deps.rpc.getTransactionByHash(payment.hash, { fresh: false });
      const verdict: { ok: boolean; code?: PaymentFailure } = transaction.ok
        ? checkPayment(transaction.data, { recipient: squad.recipient, shortId: squad.shortId,
          shareLuna: member.committedLuna })
        : { ok: false, code: 'TX_NOT_CONFIRMED' };
      row = { address: member.address, hash: payment.hash, verified: verdict.ok,
        code: verdict.ok ? null : verdict.code ?? null };
      if (verdict.ok) break;
    }
    rows.push(row);
  }
  return { rows, owing: owing.length, paid: rows.filter((row) => row.verified).length };
}

export type SettleFailure = 'SQUAD_NOT_FOUND' | 'NOT_A_MEMBER' | 'NOT_MODE_A' | 'NOT_TRACKED'
  | 'CHAIN_UNAVAILABLE' | PaymentFailure;
export type SettleResult =
  | { ok: true; paid: number; owing: number; completed: boolean }
  | { ok: false; code: SettleFailure };

export async function settlePayment(
  address: string, squadId: string, hash: string, deps: SettleDeps,
): Promise<SettleResult> {
  const squad = await deps.store.getSquad(squadId);
  if (squad === null) return { ok: false, code: 'SQUAD_NOT_FOUND' };
  if (squad.mode !== 'A' || squad.recipient === null) return { ok: false, code: 'NOT_MODE_A' };
  const membership = await deps.store.getMembership(squadId, address);
  if (membership === null || membership.leftAt !== null) return { ok: false, code: 'NOT_A_MEMBER' };
  // The hash has to be this member's own tracked payment for this squad: a hash seen on an
  // explorer, or another member's, is not a settlement of theirs.
  const payments = await deps.store.listSquadTrackedTxs(squadId, 'pay');
  const mine = payments.find((payment) => payment.hash === hash && payment.address === address);
  if (mine === undefined) return { ok: false, code: 'NOT_TRACKED' };

  const transaction = await deps.rpc.getTransactionByHash(hash);
  if (!transaction.ok) return { ok: false, code: 'CHAIN_UNAVAILABLE' };
  const verdict = checkPayment(transaction.data, {
    recipient: squad.recipient, shortId: squad.shortId, shareLuna: membership.committedLuna });
  if (!verdict.ok) return { ok: false, code: verdict.code };

  const roster = await paidRoster(squadId, deps);
  const owing = roster?.owing ?? 0;
  const paid = roster?.paid ?? 0;
  // PRD §8: COMPLETED once everyone who committed has paid. Conditional on the state we just
  // read, so a second member finishing at the same moment simply finds it already moved.
  const completed = owing > 0 && paid === owing && squad.state !== 'COMPLETED'
    ? await deps.store.setSquadState(squadId, squad.state, 'COMPLETED')
    : squad.state === 'COMPLETED';
  return { ok: true, paid, owing, completed };
}
