'use client';

import { challengeResponse, verifyResponse } from '../core/auth-contract';
import type { ErrorCode } from '../core/errors/catalog';

type SignInResult = { ok: true; address: string } | { ok: false; code: ErrorCode };
export async function signIn(devIdentity: string | null): Promise<SignInResult> {
  try {
    if (devIdentity) {
      const response = verifyResponse.parse(await (await fetch('/api/dev/sign-in', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: devIdentity }),
      })).json());
      return response.ok ? { ok: true, address: response.address } : { ok: false, code: 'UNAVAILABLE' };
    }
    // SDK touches window: even this client module loads it only after a user tap.
    const { init, NimiqProviderError } = await import('@nimiq/mini-app-sdk');
    if (typeof window.nimiqPay === 'undefined') return { ok: false, code: 'OUTSIDE_HOST' };
    const network = process.env.NEXT_PUBLIC_NIMIQ_NETWORK ?? 'mainnet';
    // AGENTS.md host guard: an absent host network is also a mismatch.
    if (window.nimiqPay.network !== network) return { ok: false, code: 'WRONG_NETWORK' };
    let provider: Awaited<ReturnType<typeof init>>;
    try { provider = await init({ timeout: 10_000 }); }
    catch { return { ok: false, code: 'OUTSIDE_HOST' }; }
    try {
      const response = await fetch('/api/auth/challenge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const challenge = challengeResponse.parse(await response.json());
      if (!challenge.ok) return { ok: false, code: 'UNAVAILABLE' };
      const proof = await provider.sign(challenge.message);
      const verification = verifyResponse.parse(await (await fetch('/api/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: challenge.id, publicKey: proof.publicKey, signature: proof.signature }),
      })).json());
      return verification.ok ? { ok: true, address: verification.address } : { ok: false, code: 'AUTH_REFUSED' };
    } catch (error) {
      if (NimiqProviderError.is(error)) {
        return { ok: false, code: error.type === 'PERMISSION_DENIED' ? 'DECLINED' : 'WALLET_ERROR' };
      }
      return { ok: false, code: 'NETWORK_ERROR' };
    }
  } catch {
    return { ok: false, code: 'NETWORK_ERROR' };
  }
}
