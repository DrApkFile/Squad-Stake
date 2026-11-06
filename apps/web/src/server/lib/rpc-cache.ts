import 'server-only';
import type { RpcResult, RpcSnapshot } from '../core/chain';

export const RPC_CACHE_MS = 60_000;
export function createAddressCache<T>(now: () => number) {
  const entries = new Map<string, RpcSnapshot<T>>();
  return async (address: string, fresh: boolean, load: () => Promise<RpcResult<T>>): Promise<RpcResult<T>> => {
    const previous = entries.get(address);
    const age = previous ? now() - previous.readAt : Infinity;
    if (!fresh && previous && age >= 0 && age < RPC_CACHE_MS) return { ok: true, ...previous };
    const result = await load();
    if (result.ok) {
      // A bounded per-client cache keeps public proof reads from growing memory without limit.
      if (entries.size >= 1000) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      entries.set(address, { data: result.data, metadata: result.metadata, readAt: result.readAt });
      return result;
    }
    // FAILURE_MODES: retain the original read time; an outage is never fresh success.
    return previous ? { ...result, lastKnown: previous } : result;
  };
}
