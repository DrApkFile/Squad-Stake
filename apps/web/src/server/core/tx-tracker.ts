import { FINALITY_CONFIRMATIONS } from '../../config/constants';
import { recordTxInput, type TxState } from '../../core/squad-contract';
import type { ChainTransaction, RpcResult } from './chain';
import type { SquadStore } from './squads';

/** Only the read the tracker needs (PRD §8 tracked tx). */
export interface TrackerRpc {
  getTransactionByHash(hash: string): Promise<RpcResult<ChainTransaction>>;
}
export interface TrackerDeps { store: SquadStore; rpc: TrackerRpc; now(): number }

export type TrackFailure = 'INVALID_INPUT' | 'NOT_A_MEMBER' | 'DUPLICATE_HASH' | 'NOT_TRACKED';
export type TrackedState = {
  ok: true; hash: string; state: TxState;
  confirmations: number | null; requiredConfirmations: number;
};
export type TrackResult = TrackedState | { ok: false; code: TrackFailure };

/** Terminal states are never re-read; the chain cannot un-execute a transaction. */
const terminal = (state: TxState) => state === 'INCLUDED_OK' || state === 'INCLUDED_FAILED';

export function createTxTracker(deps: TrackerDeps) {
  return {
    async record(address: string, body: unknown): Promise<TrackResult> {
      const parsed = recordTxInput.safeParse(body);
      if (!parsed.success) return { ok: false, code: 'INVALID_INPUT' };
      const input = parsed.data;
      const membership = await deps.store.getMembership(input.squadId, address);
      if (!membership || membership.leftAt !== null) return { ok: false, code: 'NOT_A_MEMBER' };
      // `expected.valueLuna` is what the wallet was asked for: an audit trail, never an
      // input to the commitment decision, which always re-reads the chain (Q03).
      const inserted = await deps.store.insertTrackedTx({
        hash: input.hash, address, squadId: input.squadId, kind: input.kind,
        expected: { valueLuna: input.valueLuna }, state: 'SUBMITTED', checkedAt: null,
      });
      if (!inserted) return { ok: false, code: 'DUPLICATE_HASH' };
      return { ok: true, hash: input.hash, state: 'SUBMITTED',
        confirmations: null, requiredConfirmations: FINALITY_CONFIRMATIONS };
    },

    async check(hash: string): Promise<TrackResult> {
      const tracked = await deps.store.getTrackedTx(hash);
      if (!tracked) return { ok: false, code: 'NOT_TRACKED' };
      const settled = (state: TxState, confirmations: number | null): TrackedState =>
        ({ ok: true, hash, state, confirmations, requiredConfirmations: FINALITY_CONFIRMATIONS });
      if (terminal(tracked.state)) return settled(tracked.state, null);
      const transaction = await deps.rpc.getTransactionByHash(hash);
      // Any failed or absent read leaves the outcome UNKNOWN, which is re-checked on the
      // next call. No elapsed time can turn it into a failure (PRD §8, FAILURE_MODES).
      if (!transaction.ok) {
        await deps.store.setTrackedTxState(hash, tracked.state, 'UNKNOWN', deps.now());
        return settled('UNKNOWN', null);
      }
      const { executionResult, confirmations = null, blockNumber } = transaction.data;
      if (!executionResult) {
        await deps.store.setTrackedTxState(hash, tracked.state, 'INCLUDED_FAILED', deps.now());
        return settled('INCLUDED_FAILED', confirmations);
      }
      if (blockNumber === undefined || confirmations === null || confirmations < FINALITY_CONFIRMATIONS) {
        // Included and successful but not yet final: still SUBMITTED, never "done".
        await deps.store.setTrackedTxState(hash, tracked.state, 'SUBMITTED', deps.now());
        return settled('SUBMITTED', confirmations);
      }
      await deps.store.setTrackedTxState(hash, tracked.state, 'INCLUDED_OK', deps.now());
      return settled('INCLUDED_OK', confirmations);
    },
  };
}
export type TxTracker = ReturnType<typeof createTxTracker>;
