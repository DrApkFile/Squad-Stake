'use client';

import type { ErrorCode } from '../core/errors/catalog';

export const appNetwork = () => process.env.NEXT_PUBLIC_NIMIQ_NETWORK ?? 'mainnet';

/**
 * The one host guard (FAILURE_MODES "not inside Nimiq Pay" / "wrong network", Q14):
 * inside Nimiq Pay is `typeof window.nimiqPay !== 'undefined'`, and an absent host
 * network counts as a mismatch, so actions stay blocked instead of guessing.
 */
export function hostGuard(): { ok: true } | { ok: false; code: ErrorCode } {
  if (typeof window === 'undefined' || typeof window.nimiqPay === 'undefined') return { ok: false, code: 'OUTSIDE_HOST' };
  if (window.nimiqPay.network !== appNetwork()) return { ok: false, code: 'WRONG_NETWORK' };
  return { ok: true };
}
