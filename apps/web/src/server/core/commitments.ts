import { commitInput } from '../../core/squad-contract';
import type { RpcResult, StakerState } from './chain';
import { isActive, type SquadStore } from './squads';

/** Only the read the invariant needs, so tests can inject a staker without a client. */
export interface CommitRpc {
  getStakerByAddress(address: string, options?: { fresh?: boolean }): Promise<RpcResult<StakerState>>;
}
export interface CommitDeps { store: SquadStore; rpc: CommitRpc; now(): number }

export type CommitFailure = 'INVALID_INPUT' | 'SQUAD_NOT_FOUND' | 'SQUAD_CLOSED' | 'NOT_A_MEMBER'
  | 'TX_NOT_CONFIRMED' | 'TX_FAILED' | 'NOT_STAKING' | 'OVER_COMMITTED' | 'CHAIN_UNAVAILABLE';
export type CommitResult =
  | { ok: true; committedLuna: number; freeLuna: number; readAt: number }
  | { ok: false; code: CommitFailure; freeLuna: number | null; shortfallLuna: number | null };

const refuse = (code: CommitFailure, freeLuna: number | null = null, shortfallLuna: number | null = null):
CommitResult => ({ ok: false, code, freeLuna, shortfallLuna });

export async function setCommitment(
  address: string, squadId: string, body: unknown, deps: CommitDeps,
): Promise<CommitResult> {
  const parsed = commitInput.safeParse(body);
  if (!parsed.success) return refuse('INVALID_INPUT');
  const { amountLuna, txHash } = parsed.data;
  const squad = await deps.store.getSquad(squadId);
  if (!squad) return refuse('SQUAD_NOT_FOUND');
  if (!isActive(squad)) return refuse('SQUAD_CLOSED');
  const membership = await deps.store.getMembership(squadId, address);
  if (!membership || membership.leftAt !== null) return refuse('NOT_A_MEMBER');
  if (txHash !== null) {
    // PRD §7.3.3: a commitment that needed a staking transaction waits for that
    // transaction to be included AND final. A hash is never enough (NimJar, Q10).
    const tracked = await deps.store.getTrackedTx(txHash);
    if (!tracked || tracked.address !== address || tracked.squadId !== squadId) return refuse('TX_NOT_CONFIRMED');
    if (tracked.state === 'INCLUDED_FAILED') return refuse('TX_FAILED');
    if (tracked.state !== 'INCLUDED_OK') return refuse('TX_NOT_CONFIRMED');
  }
  return deps.store.withMemberLock(address, async (locked) => {
    // Inside the lock, both sides of the comparison are re-read: the member's other
    // commitments from the locked rows, and the stake from the chain with the 60 s
    // cache bypassed (AGENTS.md 4, ARCHITECTURE "Commitment invariant").
    const commitments = await locked.commitments();
    const staker = await deps.rpc.getStakerByAddress(address, { fresh: true });
    if (!staker.ok) return refuse('CHAIN_UNAVAILABLE');
    if (staker.data.status === 'NOT_STAKING') return refuse('NOT_STAKING', 0, amountLuna);
    const activeBalance = staker.data.staker.balance;
    const others = commitments.reduce(
      (total, row) => row.squadId === squadId ? total : total + row.committedLuna, 0);
    if (others + amountLuna > activeBalance) {
      const freeLuna = Math.max(0, activeBalance - others);
      return refuse('OVER_COMMITTED', freeLuna, others + amountLuna - activeBalance);
    }
    const saved = await locked.setCommitment(squadId, amountLuna);
    if (!saved) return refuse('NOT_A_MEMBER');
    return { ok: true, committedLuna: amountLuna,
      freeLuna: activeBalance - others - amountLuna, readAt: staker.readAt };
  });
}
