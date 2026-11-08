import 'server-only';
import { z } from 'zod';

/**
 * PRD §9.11 — the fiat estimate. One public price source, no API key, cached for ten
 * minutes, and **hidden** rather than guessed when it fails.
 *
 * Source: CoinGecko's public Simple Price endpoint,
 * `GET https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=<code>`
 * (no key; verified for usd, eur and crc on 2026-11-08). `nimiq-2` is CoinGecko's id for
 * NIM — `nimiq` is the pre-2018 asset. The answer is `{ "nimiq-2": { "<code>": <number> } }`
 * in units of that currency per **one NIM**, so the caller converts luna with LUNA_PER_NIM.
 *
 * Nimiq Pay reports one of four currencies (SDK 0.2.4 `Fiat`: USD, EUR, CRC, GMD). CoinGecko
 * quotes NIM in the first three but not in GMD, so a GMD user is shown no estimate at all
 * instead of a figure in a currency they did not ask for (docs/DECISIONS.md).
 *
 * Nothing here is ever stored: a price is a display aid with an age beside it, never truth.
 */
export const PRICE_CACHE_MS = 600_000;
export const PRICE_TIMEOUT_MS = 5000;
export const PRICE_SOURCE = 'coingecko';
const COIN_ID = 'nimiq-2';
const BASE = 'https://api.coingecko.com/api/v3/simple/price';

export interface NimPrice { currency: string; perNim: number; readAt: number; source: string }
export type PriceResult =
  | { ok: true; price: NimPrice }
  | { ok: false; code: 'HTTP_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_RESPONSE' | 'NO_QUOTE' };

/** ISO 4217 alphabetic codes only, upper-cased by the caller's Zod schema. */
export const isCurrencyCode = (value: string) => /^[A-Z]{3}$/.test(value);

export interface PriceOptions { fetch?: typeof fetch; now?: () => number; base?: string }

export function createPriceReader(options: PriceOptions = {}) {
  const fetcher = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const base = options.base ?? BASE;
  const cache = new Map<string, NimPrice>();

  return async function price(currency: string, fresh = false): Promise<PriceResult> {
    if (!isCurrencyCode(currency)) return { ok: false, code: 'NO_QUOTE' };
    const cached = cache.get(currency);
    if (!fresh && cached) {
      const age = now() - cached.readAt;
      if (age >= 0 && age < PRICE_CACHE_MS) return { ok: true, price: cached };
    }
    const url = `${base}?ids=${COIN_ID}&vs_currencies=${currency.toLowerCase()}`;
    const signal = AbortSignal.timeout(PRICE_TIMEOUT_MS);
    let body: unknown;
    try {
      const response = await fetcher(url, { cache: 'no-store', signal });
      if (!response.ok) return { ok: false, code: 'HTTP_ERROR' };
      try { body = await response.json(); }
      catch { return { ok: false, code: signal.aborted ? 'TIMEOUT' : 'INVALID_RESPONSE' }; }
    } catch {
      return { ok: false, code: signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR' };
    }
    // The quote is the only field read, and a currency CoinGecko does not quote simply comes
    // back missing — which is NO_QUOTE, not an error to retry.
    const parsed = z.object({
      [COIN_ID]: z.record(z.string(), z.number().positive()),
    }).safeParse(body);
    if (!parsed.success) return { ok: false, code: 'INVALID_RESPONSE' };
    const perNim = parsed.data[COIN_ID]?.[currency.toLowerCase()];
    if (perNim === undefined) return { ok: false, code: 'NO_QUOTE' };
    const price: NimPrice = { currency, perNim, readAt: now(), source: PRICE_SOURCE };
    // Bounded: four host currencies today, and a bad code never reaches this far.
    if (cache.size >= 16) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(currency, price);
    return { ok: true, price };
  };
}

let reader: ((currency: string, fresh?: boolean) => Promise<PriceResult>) | undefined;
/** One reader per server process, so the ten-minute cache is shared by every request. */
export function nimPrice() {
  reader ??= createPriceReader();
  return reader;
}
