'use client';

import { getHostFiat, getHostLanguage } from '@nimiq/mini-app-sdk';

/**
 * The two read-only preferences Nimiq Pay seeds before the Mini App's page script runs
 * (SDK 0.2.4 `getHostLanguage()` / `getHostFiat()`, both documented as safe to read during
 * module init and `undefined` outside Nimiq Pay). They need no approval and move nothing, so
 * they are not provider calls — but they still touch `window`, so they live in the wallet
 * folder with the rest of the SDK and are never imported by `packages/ui`.
 */
export function hostLanguage(): string | undefined {
  try {
    return getHostLanguage();
  } catch {
    // An older host, or not a host at all: the browser's own preference decides.
    return undefined;
  }
}

/** The user's fiat currency in Nimiq Pay (ISO 4217), or undefined outside it. */
export function hostFiat(): string | undefined {
  try {
    return getHostFiat();
  } catch {
    return undefined;
  }
}
