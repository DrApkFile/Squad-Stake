import 'server-only';
import type {
  ChainTransaction, ChainTransactions, RpcResult, StakerState, Validator, Validators,
} from '../core/chain';
import {
  addressSchema, blockNumber, hashSchema, stakerSchema, transactionCount,
  transactionSchema, transactionsSchema, validatorSchema, validatorsSchema,
} from './rpc-schemas';
import { createAddressCache } from './rpc-cache';
import { createRpcTransport, type RpcOptions } from './rpc-transport';

export function createRpcClient(options: RpcOptions) {
  const now = options.now ?? Date.now;
  const request = createRpcTransport(options);
  const stakers = createAddressCache<StakerState>(now);
  const validators = createAddressCache<Validator>(now);
  const transactions = createAddressCache<ChainTransactions>(now);
  const byHash = createAddressCache<ChainTransaction>(now);
  function canonicalAddress(value: string) {
    const compact = value.replace(/\s/g, '').toUpperCase();
    return addressSchema.safeParse(compact.replace(/(.{4})(?=.)/g, '$1 '));
  }
  function policy(method: string, block: number) {
    return blockNumber.safeParse(block).success
      ? request(method, [block], blockNumber)
      : Promise.resolve({ ok: false as const, code: 'INVALID_INPUT' as const });
  }
  return {
    getBlockNumber: () => request('getBlockNumber', [], blockNumber),
    // §7.7 reads the whole active set; it is not per-address, so it is not cached here.
    // It answers with chain metadata (verified live on testnet 2026-11-06: result.metadata =
    // { blockNumber, blockHash }), unlike getTransactionsByAddress, whose metadata is null.
    getActiveValidators: (): Promise<RpcResult<Validators>> =>
      request('getActiveValidators', [], validatorsSchema, true),
    getElectionBlockAfter: (block: number) => policy('getElectionBlockAfter', block),
    getBlockAfterReportingWindow: (block: number) => policy('getBlockAfterReportingWindow', block),
    getBlockAfterJail: (block: number) => policy('getBlockAfterJail', block),
    async getStakerByAddress(value: string, { fresh = false } = {}): Promise<RpcResult<StakerState>> {
      const address = canonicalAddress(value);
      if (!address.success) return { ok: false, code: 'INVALID_INPUT' };
      return stakers(address.data, fresh, async () => {
        const result = await request('getStakerByAddress', [address.data], stakerSchema, true);
        if (result.ok) {
          if (result.data.address !== address.data) return { ok: false, code: 'INVALID_RESPONSE' };
          return { ...result, data: { status: 'STAKING', staker: result.data } };
        }
        // S2 v3: the public node reports missing stakers as JSON-RPC -32603.
        if (result.code === 'RPC_ERROR' && result.rpcError?.code === -32603 && result.rpcError.message === 'Internal error') {
          return { ok: true, data: { status: 'NOT_STAKING' }, metadata: null, readAt: now() };
        }
        return result;
      });
    },
    async getValidatorByAddress(value: string, { fresh = false } = {}): Promise<RpcResult<Validator>> {
      const address = canonicalAddress(value);
      if (!address.success) return { ok: false, code: 'INVALID_INPUT' };
      return validators(address.data, fresh, async () => {
        const result = await request('getValidatorByAddress', [address.data], validatorSchema, true);
        if (result.ok && result.data.address !== address.data) return { ok: false, code: 'INVALID_RESPONSE' };
        return result;
      });
    },
    /**
     * `fresh` defaults to **true** here, unlike the other cached methods: the tracker polls
     * this every five seconds to watch confirmations climb (Q10), and a 60 s cache would hand
     * it the same answer twelve times. The cache exists for the display paths that read a
     * transaction they already know is final — the paid roster and the planner's inclusion
     * block — which pass `fresh: false` explicitly.
     */
    getTransactionByHash(hash: string, { fresh = true } = {}): Promise<RpcResult<ChainTransaction>> {
      if (!hashSchema.safeParse(hash).success) {
        return Promise.resolve({ ok: false as const, code: 'INVALID_INPUT' as const });
      }
      return byHash(hash, fresh, () => request('getTransactionByHash', [hash], transactionSchema));
    },
    async getTransactionsByAddress(
      value: string, max: number, startAt: string | null = null, { fresh = false } = {},
    ): Promise<RpcResult<ChainTransactions>> {
      const address = canonicalAddress(value);
      const count = transactionCount.safeParse(max);
      if (!address.success || !count.success) return { ok: false, code: 'INVALID_INPUT' };
      if (startAt !== null && !hashSchema.safeParse(startAt).success) return { ok: false, code: 'INVALID_INPUT' };
      // S2 v3: this is the one method with optional arguments; `start_at` must occupy
      // its slot as an explicit null. A different page is a different read, so max and
      // start_at belong in the cache key. PRD §7.6 payment checks pass fresh: true.
      return transactions(`${address.data}|${count.data}|${startAt ?? ''}`, fresh, () =>
        request('getTransactionsByAddress', [address.data, count.data, startAt], transactionsSchema));
    },
  };
}

// blockchain.rs/policy.rs: the other eight methods have no optional arguments. Their
// entire positional signatures are [] / [address] / [hash] / [block]; no padding.
// Future optional arguments must occupy their slot explicitly as null (S2 v3).
export type NimiqRpc = ReturnType<typeof createRpcClient>;
