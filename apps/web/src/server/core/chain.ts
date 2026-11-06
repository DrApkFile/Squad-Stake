import type { ChainMetadata, Staker } from '../lib/rpc-schemas';

export type { Staker, Validator, ChainTransaction } from '../lib/rpc-schemas';
export type RpcFailureCode = 'TIMEOUT' | 'NETWORK_ERROR' | 'HTTP_ERROR' | 'INVALID_RESPONSE' | 'RPC_ERROR' | 'INVALID_INPUT';
export interface RpcSnapshot<T> { data: T; metadata: ChainMetadata | null; readAt: number }
export interface RpcFailure {
  ok: false;
  code: RpcFailureCode;
  rpcError?: { code: number; message: string; data?: unknown };
}
export type RpcResult<T> = ({ ok: true } & RpcSnapshot<T>) | (RpcFailure & { lastKnown?: RpcSnapshot<T> });
export type StakerState = { status: 'STAKING'; staker: Staker } | { status: 'NOT_STAKING' };
export interface ReleaseRpc {
  getElectionBlockAfter(block: number): Promise<RpcResult<number>>;
  getBlockAfterReportingWindow(block: number): Promise<RpcResult<number>>;
  getBlockAfterJail(block: number): Promise<RpcResult<number>>;
}
