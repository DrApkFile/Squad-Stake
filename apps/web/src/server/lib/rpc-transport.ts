import 'server-only';
import { z } from 'zod';
import type { RpcFailure, RpcSnapshot } from '../core/chain';
import { chainMetadataSchema } from './rpc-schemas';

export const RPC_TIMEOUT_MS = 5000;
export interface RpcOptions { url: string; fetch?: typeof fetch; now?: () => number }

export function createRpcTransport(options: RpcOptions) {
  const fetcher = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  let id = 0;
  return async function request<T>(
    method: string, params: readonly (string | number | null)[], schema: z.ZodType<T>, withChainMetadata = false,
  ): Promise<({ ok: true } & RpcSnapshot<T>) | RpcFailure> {
    const requestId = ++id;
    const signal = AbortSignal.timeout(RPC_TIMEOUT_MS);
    try {
      const response = await fetcher(options.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal,
        body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }),
      });
      if (!response.ok) return { ok: false, code: 'HTTP_ERROR' };
      let body: unknown;
      try { body = await response.json(); }
      catch { return { ok: false, code: signal.aborted ? 'TIMEOUT' : 'INVALID_RESPONSE' }; }
      const envelope = z.union([
        z.object({ jsonrpc: z.literal('2.0'), id: z.literal(requestId), result: z.object({
          data: schema, metadata: withChainMetadata ? chainMetadataSchema : z.null(),
        }).strict() }).strict(),
        z.object({ jsonrpc: z.literal('2.0'), id: z.literal(requestId), error: z.object({
          code: z.number().int(), message: z.string(), data: z.unknown().optional(),
        }).strict() }).strict(),
      ]).safeParse(body);
      if (!envelope.success) return { ok: false, code: 'INVALID_RESPONSE' };
      if ('error' in envelope.data) return { ok: false, code: 'RPC_ERROR', rpcError: envelope.data.error };
      return { ok: true, ...envelope.data.result, readAt: now() };
    } catch {
      return { ok: false, code: signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR' };
    }
  };
}
