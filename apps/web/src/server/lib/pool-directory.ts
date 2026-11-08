import 'server-only';
import { z } from 'zod';
import { networkConfig } from '../../config/network';
import { serverEnv } from './env';

/**
 * PRD §7.7, pool-aware validator choice. Nimiq publishes pool metadata itself, and this is
 * the only source we use for it.
 *
 * Source (read 2026-11-08): github.com/nimiq/validators-api.
 *   * Endpoints — its README, "Mainnet"/"Testnet" (lines 22–23) and the endpoint table
 *     (lines 111–117): `GET /api/v1/validators` on
 *     `https://validators-api-main.je-cf9.workers.dev` and `…-test…`. Both are in
 *     `src/config/network.ts`, keyed by NEXT_PUBLIC_NIMIQ_NETWORK.
 *   * Fields — `server/utils/schemas.ts` `validatorSchema` (lines 5–12):
 *       name: z.string()
 *       address: z.string().regex(/^NQ\d{2}(\s\w{4}){8}$/)
 *       fee: z.literal(null).or(z.number().min(0).max(1)).default(null)   ← a fraction, 0–1
 *       payoutType: z.enum(PayoutType).default(PayoutType.None)
 *       payoutSchedule: z.string().optional().default('')
 *   * `PayoutType` — `server/utils/types.ts` lines 4–8:
 *       Restake = 'restake' · Direct = 'direct' · None = 'none'
 *
 * Two facts about this data that the code below depends on:
 *   1. `payoutType: 'none'` means the validator pays its stakers nothing. PRD §7.7 asks for a
 *      validator that pays stakers, so those are ineligible.
 *   2. There is **no payout address** anywhere in the upstream schema (grep of schemas.ts and
 *      types.ts, 2026-11-08, and the per-validator files under `public/validators/` carry the
 *      same fields). So a `direct` pool's payouts cannot be told from any other incoming
 *      transfer, and "earned so far" says so instead of guessing (see `server/core/earned.ts`).
 *      `payoutAddress` is accepted here if a pool ever publishes one; nothing does today.
 *
 * Deviation from AGENTS.md "external input parsed as unknown → Zod .strict()", recorded in
 * docs/DECISIONS.md: this payload is upstream's own schema (scores, logos, contacts, and more
 * whenever they add a field), and failing closed on an unknown key would take pool data away
 * from members for no safety gain. Every field this app *uses* is parsed strictly; unknown
 * keys are ignored, and a validator whose used fields are malformed is dropped.
 */
export const PAYOUT_TYPES = ['restake', 'direct', 'none'] as const;
export type PayoutType = (typeof PAYOUT_TYPES)[number];

export interface Pool {
  address: string;
  name: string;
  /** A fraction of the reward (0.05 = 5%), or null when the pool publishes no fee. */
  feeFraction: number | null;
  payout: PayoutType;
  /** Upstream default is the empty string; normalised to null so the UI shows nothing. */
  payoutSchedule: string | null;
  /** Not in the upstream schema today; see the note above. */
  payoutAddress: string | null;
}

const ADDRESS = /^NQ[0-9]{2}( [0-9A-HJ-NP-VXY]{4}){8}$/;
/** `z.looseObject`: the fields we use, strictly typed; upstream's others ignored. */
const poolSchema = z.looseObject({
  name: z.string().min(1),
  address: z.string().regex(ADDRESS),
  fee: z.number().min(0).max(1).nullable().optional(),
  payoutType: z.enum(PAYOUT_TYPES),
  payoutSchedule: z.string().optional(),
  payoutAddress: z.string().regex(ADDRESS).optional(),
});

export const POOL_CACHE_MS = 600_000;
export const POOL_TIMEOUT_MS = 5000;

export type PoolDirectory =
  | { ok: true; pools: ReadonlyMap<string, Pool>; readAt: number }
  | { ok: false; code: 'HTTP_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_RESPONSE' };

export interface DirectoryOptions {
  url: string;
  fetch?: typeof fetch;
  now?: () => number;
}

/**
 * One reader per process with a 10-minute cache: pool metadata changes when an operator sends
 * a pull request, not between page loads. A failed read is never cached, and never silently
 * replaced by an older answer — the caller falls back to chain data alone and the UI says so.
 */
export function createPoolDirectory(options: DirectoryOptions) {
  const fetcher = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  let cached: { pools: ReadonlyMap<string, Pool>; readAt: number } | null = null;

  return async function pools(fresh = false): Promise<PoolDirectory> {
    if (!fresh && cached !== null) {
      const age = now() - cached.readAt;
      if (age >= 0 && age < POOL_CACHE_MS) return { ok: true, ...cached };
    }
    const signal = AbortSignal.timeout(POOL_TIMEOUT_MS);
    let body: unknown;
    try {
      const response = await fetcher(options.url, { cache: 'no-store', signal });
      if (!response.ok) return { ok: false, code: 'HTTP_ERROR' };
      try { body = await response.json(); }
      catch { return { ok: false, code: signal.aborted ? 'TIMEOUT' : 'INVALID_RESPONSE' }; }
    } catch {
      return { ok: false, code: signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR' };
    }
    if (!Array.isArray(body)) return { ok: false, code: 'INVALID_RESPONSE' };
    const map = new Map<string, Pool>();
    for (const entry of body) {
      const parsed = poolSchema.safeParse(entry);
      if (!parsed.success) continue;
      const schedule = parsed.data.payoutSchedule?.trim() ?? '';
      map.set(parsed.data.address, {
        address: parsed.data.address,
        name: parsed.data.name,
        feeFraction: parsed.data.fee ?? null,
        payout: parsed.data.payoutType,
        payoutSchedule: schedule === '' ? null : schedule,
        payoutAddress: parsed.data.payoutAddress ?? null,
      });
    }
    // An empty list is not a directory: treat it as a failed read rather than as "no pool
    // pays anything", which would make every validator ineligible.
    if (map.size === 0) return { ok: false, code: 'INVALID_RESPONSE' };
    cached = { pools: map, readAt: now() };
    return { ok: true, ...cached };
  };
}

let directory: ((fresh?: boolean) => Promise<PoolDirectory>) | undefined;
/** One directory per server process, so its 10-minute cache survives between requests. */
export function poolDirectory() {
  directory ??= createPoolDirectory({
    url: networkConfig(serverEnv().NIMIQ_NETWORK).validatorsApi,
  });
  return directory;
}
