import 'server-only';
import type { RpcResult, StakerState, Validator } from '../core/chain';
import { addressSchema, blockNumber, hashSchema, stakerSchema, transactionSchema, validatorSchema } from './rpc-schemas';
import { createAddressCache } from './rpc-cache';
import { createRpcTransport, type RpcOptions } from './rpc-transport';

export function createRpcClient(options: RpcOptions) {
  const now = options.now ?? Date.now;
  const request = createRpcTransport(options);
  const stakers = createAddressCache<StakerState>(now);
  const validators = createAddressCache<Validator>(now);
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
    getTransactionByHash: (hash: string) => hashSchema.safeParse(hash).success
      ? request('getTransactionByHash', [hash], transactionSchema)
      : Promise.resolve({ ok: false as const, code: 'INVALID_INPUT' as const }),
  };
}

// blockchain.rs/policy.rs: these seven methods have no optional arguments. Their
// entire positional signatures are [] / [address] / [hash] / [block]; no padding.
// Future optional arguments must occupy their slot explicitly as null (S2 v3).
export type NimiqRpc = ReturnType<typeof createRpcClient>;
