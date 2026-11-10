'use client';

import { useCallback, useState } from 'react';
import { TX_POLL_ATTEMPTS, TX_POLL_INTERVAL_MS } from '../config/constants';
import { trackedTxResponse } from '../core/squad-contract';

export type Tracked = {
  state: string; confirmations: number | null; requiredConfirmations: number;
};
export type Read = { ok: true; tracked: Tracked } | { ok: false; code: string };

/**
 * The one refusal that means "ask again". `GET /api/tx/:hash` answers `UNAVAILABLE` when the
 * handler itself threw — a database hiccup, say — which says nothing at all about the
 * transaction, so it must not end the window. Note that a failed *chain* read never arrives
 * here: the tracker turns that into `UNKNOWN` with `ok: true` and it is simply re-read on the
 * next tick (`server/core/tx-tracker.ts`), which is why this list is one entry long.
 *
 * Everything else this route can refuse with — `NOT_TRACKED`, `INVALID_INPUT`, `AUTH_REFUSED` —
 * is an answer about this request and will say the same thing in five seconds, so the loop
 * stops rather than spending two minutes on it (docs/AUDIT.md, m-1).
 */
const RETRYABLE = new Set(['UNAVAILABLE']);

/**
 * Follows a tracked transaction by reading `GET /api/tx/:hash` every five seconds for two
 * minutes. Deliberately a client loop: Vercel route handlers are short-lived and this app runs
 * no background jobs (ARCHITECTURE "Vercel notes").
 *
 * It never calls the wallet, so nothing is ever resent; after the window it stops and the screen
 * offers a manual re-check (briefing/FAILURE_MODES.md: check status before resending, never
 * auto-retry). An absent or unreadable transaction stays UNKNOWN — elapsed time never turns into
 * failure (PRD Q10).
 */
export function useTxPoll() {
  const [stalled, setStalled] = useState(false);

  const checkOnce = useCallback(async (hash: string): Promise<Read> => {
    const response = await fetch(`/api/tx/${hash}`, { headers: { accept: 'application/json' } });
    const parsed = trackedTxResponse.parse(await response.json());
    if (!parsed.ok) return { ok: false, code: parsed.code };
    return {
      ok: true,
      tracked: {
        state: parsed.state,
        confirmations: parsed.confirmations,
        requiredConfirmations: parsed.requiredConfirmations,
      },
    };
  }, []);

  /** Resolves with the verdict, or null if the window closed without one. */
  const follow = useCallback(async (
    hash: string,
    onProgress: (tracked: Tracked) => void,
    wait: (ms: number) => Promise<void> = (ms) => new Promise((done) => setTimeout(done, ms)),
  ): Promise<Tracked | null> => {
    setStalled(false);
    const verdict = await followTracked(checkOnce, hash, onProgress, wait);
    // Null means the window closed without a verdict — whether it ran out of attempts or a
    // refusal ended it early. Either way the screen stops saying "checking" and offers a
    // manual re-check; it never resends anything (AGENTS.md invariant 8).
    if (verdict === null) setStalled(true);
    return verdict;
  }, [checkOnce]);

  return { follow, checkOnce, stalled, setStalled };
}

/**
 * The polling loop itself, with the read and the wait injected, so the decision it encodes —
 * which refusal ends the window and which one merely costs an attempt — is a pure function
 * that a test can drive without React or timers (docs/AUDIT.md, m-1).
 *
 * Resolves with the first terminal verdict, or null when the window closes without one.
 */
export async function followTracked(
  read: (hash: string) => Promise<Read>,
  hash: string,
  onProgress: (tracked: Tracked) => void,
  wait: (ms: number) => Promise<void>,
): Promise<Tracked | null> {
  for (let attempt = 0; attempt < TX_POLL_ATTEMPTS; attempt += 1) {
    const answer = await read(hash);
    if (!answer.ok) {
      // A failed read costs an attempt and nothing else. Only a refusal that is actually
      // about this transaction stops the window early.
      if (!RETRYABLE.has(answer.code)) return null;
      await wait(TX_POLL_INTERVAL_MS);
      continue;
    }
    const { tracked } = answer;
    if (tracked.state === 'INCLUDED_OK' || tracked.state === 'INCLUDED_FAILED') return tracked;
    onProgress(tracked);
    await wait(TX_POLL_INTERVAL_MS);
  }
  return null;
}
