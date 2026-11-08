import type { StakingProvider, WalletAdapter } from '../../apps/web/src/wallet/staking';

export interface RecordedCall { method: string; transaction: unknown }

/**
 * A provider that records every call and hands back a hash whose first nibble names the method,
 * so a test can tell which of the six wallet calls actually happened. `held` lets a test keep a
 * call open and attack the one-call-at-a-time guard (Q13).
 */
export function recordingAdapter(
  calls: RecordedCall[], held: Promise<void> = Promise.resolve(),
  options: { throws?: boolean; errorCode?: WalletAdapter['errorCode'] } = {},
): WalletAdapter {
  const record = (method: string, hash: string) => async (transaction: unknown) => {
    calls.push({ method, transaction });
    await held;
    if (options.throws) throw new Error('declined');
    return hash;
  };
  const provider: StakingProvider = {
    sendNewStakerTransaction: record('new-staker', 'a'.repeat(64)),
    sendStakeTransaction: record('stake', 'b'.repeat(64)),
    sendSetActiveStakeTransaction: record('set-active-stake', 'c'.repeat(64)),
    sendRetireStakeTransaction: record('retire', 'd'.repeat(64)),
    sendRemoveStakeTransaction: record('remove', 'e'.repeat(64)),
    sendBasicTransactionWithData: record('pay', 'f'.repeat(64)),
  };
  return {
    async connect() { return { ok: true, provider }; },
    errorCode: options.errorCode ?? (() => null),
  };
}

/** An adapter that never reaches a provider: outside Nimiq Pay, or on the wrong network. */
export function blockedAdapter(code: 'OUTSIDE_HOST' | 'WRONG_NETWORK'): WalletAdapter {
  return { async connect() { return { ok: false, code }; }, errorCode: () => null };
}
