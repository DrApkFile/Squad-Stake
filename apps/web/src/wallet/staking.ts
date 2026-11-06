'use client';

import type { StakingAction } from '../core/staking-actions';
import { providerErrorCode, type ErrorCode } from '../core/errors/catalog';
import { hostGuard } from './network';

export type StakingCallResult = { ok: true; hash: string } | { ok: false; code: ErrorCode };
export interface StakingProvider {
  sendNewStakerTransaction(tx: { delegation: string; value: number; fee: number }): Promise<string>;
  sendStakeTransaction(tx: { value: number; fee: number }): Promise<string>;
}
/** The Nimiq Pay boundary, injected so the decisions below are testable without the SDK. */
export interface WalletAdapter {
  connect(): Promise<{ ok: true; provider: StakingProvider } | { ok: false; code: ErrorCode }>;
  errorCode(error: unknown): ErrorCode | null;
}

export const nimiqPayAdapter: WalletAdapter = {
  async connect() {
    const host = hostGuard();
    if (!host.ok) return host;
    sdk ??= await import('@nimiq/mini-app-sdk');
    // A plain Error from init() means we are not inside Nimiq Pay (SDK 0.2.x).
    try { return { ok: true, provider: await sdk.init({ timeout: 10_000 }) }; }
    catch { return { ok: false, code: 'OUTSIDE_HOST' }; }
  },
  errorCode(error) {
    // Type-based mapping only; never `instanceof` or message text (AGENTS.md "Errors").
    const { NimiqProviderError } = sdk ?? {};
    if (NimiqProviderError?.is(error)) return providerErrorCode(error.type);
    return null;
  },
};
// Loaded by connect() only: the SDK touches window, so it must never be imported
// during server rendering (AGENTS.md "Next.js rules").
let sdk: typeof import('@nimiq/mini-app-sdk') | undefined;

// One provider call per tap (Q13, FAILURE_MODES "double tap"). Module scope, so a second
// component cannot open a second approval sheet either. A wallet call is never retried
// automatically (AGENTS.md 8); only a new tap sends again.
let pending = false;
export const callPending = () => pending;

/**
 * Sends exactly the transaction `planStakingAction` decided on, with the explicit fee from
 * the constants file. A hash is not success: the caller records it with the tracker and
 * waits for INCLUDED_OK (Q10).
 */
export async function sendStakingAction(
  action: StakingAction, adapter: WalletAdapter = nimiqPayAdapter,
): Promise<StakingCallResult> {
  if (action.kind === 'none') return { ok: false, code: 'INVALID_INPUT' };
  if (action.kind === 'blocked') return { ok: false, code: 'NOT_STAKING' };
  if (pending) return { ok: false, code: 'TX_PENDING' };
  pending = true;
  try {
    const connection = await adapter.connect();
    if (!connection.ok) return connection;
    try {
      const hash = action.kind === 'create-staker'
        ? await connection.provider.sendNewStakerTransaction({
          delegation: action.delegation, value: action.valueLuna, fee: action.feeLuna })
        : await connection.provider.sendStakeTransaction({ value: action.valueLuna, fee: action.feeLuna });
      return { ok: true, hash };
    } catch (error) {
      // An unmapped failure may still have been submitted, so it is never "nothing happened".
      return { ok: false, code: adapter.errorCode(error) ?? 'TX_OUTCOME_UNKNOWN' };
    }
  } finally {
    pending = false;
  }
}
