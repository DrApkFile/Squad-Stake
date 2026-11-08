'use client';

import type { LeavingAction, PaymentAction, StakingAction } from '../core/staking-actions';
import { providerErrorCode, type ErrorCode } from '../core/errors/catalog';
import { hostGuard } from './network';

export type StakingCallResult = { ok: true; hash: string } | { ok: false; code: ErrorCode };
/** Every provider method this app is allowed to call, and nothing else. `listAccounts` is
 * deliberately absent: identity comes from a verified signature (AGENTS.md 2). */
export interface StakingProvider {
  sendNewStakerTransaction(tx: { delegation: string; value: number; fee: number }): Promise<string>;
  sendStakeTransaction(tx: { value: number; fee: number }): Promise<string>;
  sendSetActiveStakeTransaction(tx: { newActiveBalance: number; fee: number }): Promise<string>;
  sendRetireStakeTransaction(tx: { retireStake: number; fee: number }): Promise<string>;
  sendRemoveStakeTransaction(tx: { value: number; fee: number }): Promise<string>;
  sendBasicTransactionWithData(
    tx: { recipient: string; value: number; fee: number; data: string }): Promise<string>;
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
// component cannot open a second approval sheet either — the leaving screen, the commit sheet
// and the payment sheet all pass through this one flag. A wallet call is never retried
// automatically (AGENTS.md 8); only a new tap sends again.
let pending = false;
export const callPending = () => pending;

/**
 * The single place a provider call happens. Everything a send has in common lives here: the
 * host and network guard, the one-call-at-a-time flag, and the rule that an unmapped failure
 * may have been submitted — so it is never reported as "nothing happened".
 */
async function withProvider(
  adapter: WalletAdapter, send: (provider: StakingProvider) => Promise<string>,
): Promise<StakingCallResult> {
  if (pending) return { ok: false, code: 'TX_PENDING' };
  pending = true;
  try {
    const connection = await adapter.connect();
    if (!connection.ok) return connection;
    try {
      return { ok: true, hash: await send(connection.provider) };
    } catch (error) {
      return { ok: false, code: adapter.errorCode(error) ?? 'TX_OUTCOME_UNKNOWN' };
    }
  } finally {
    pending = false;
  }
}

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
  return withProvider(adapter, (provider) => action.kind === 'create-staker'
    ? provider.sendNewStakerTransaction({
      delegation: action.delegation, value: action.valueLuna, fee: action.feeLuna })
    : provider.sendStakeTransaction({ value: action.valueLuna, fee: action.feeLuna }));
}

/**
 * One of the three leaving taps (PRD §7.5), already decided by `planLeaving` / `planRetire` /
 * `planRemove`. Nothing is chained: each step is its own tap and its own approval, and this
 * function never decides an amount — note in particular that remove carries the fresh retired
 * balance with `fee: 0`, because the staking contract pays that fee out of it (Q12).
 */
export async function sendLeavingAction(
  action: LeavingAction, adapter: WalletAdapter = nimiqPayAdapter,
): Promise<StakingCallResult> {
  return withProvider(adapter, (provider) => {
    switch (action.kind) {
      case 'set-active-stake':
        return provider.sendSetActiveStakeTransaction({
          newActiveBalance: action.newActiveBalanceLuna, fee: action.feeLuna });
      case 'retire-stake':
        return provider.sendRetireStakeTransaction({
          retireStake: action.retireStakeLuna, fee: action.feeLuna });
      case 'remove-stake':
        return provider.sendRemoveStakeTransaction({ value: action.valueLuna, fee: action.feeLuna });
    }
  });
}

/**
 * Mode A, "Pay my share" (PRD §7.6). The data is the public `sq:<short_id>` marker, which is
 * what lets the server recognise the payment without ever matching the sender — Nimiq Pay pays
 * from a cosigned HTLC. The fee is explicit and left to Nimiq Pay's own minimum of 0.
 */
export async function sendPayment(
  action: PaymentAction, adapter: WalletAdapter = nimiqPayAdapter,
): Promise<StakingCallResult> {
  return withProvider(adapter, (provider) => provider.sendBasicTransactionWithData({
    recipient: action.recipient, value: action.valueLuna, fee: 0, data: action.data }));
}
