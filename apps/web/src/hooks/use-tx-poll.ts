'use client';

import { useCallback, useState } from 'react';
import { TX_POLL_ATTEMPTS, TX_POLL_INTERVAL_MS } from '../config/constants';
import { trackedTxResponse } from '../core/squad-contract';

type Tracked = { state: string; confirmations: number | null; requiredConfirmations: number };

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

  const checkOnce = useCallback(async (hash: string): Promise<Tracked | null> => {
    const response = await fetch(`/api/tx/${hash}`, { headers: { accept: 'application/json' } });
    const parsed = trackedTxResponse.parse(await response.json());
    if (!parsed.ok) return null;
    return {
      state: parsed.state,
      confirmations: parsed.confirmations,
      requiredConfirmations: parsed.requiredConfirmations,
    };
  }, []);

  /** Resolves with the verdict, or null if the window closed without one. */
  const follow = useCallback(async (
    hash: string,
    onProgress: (tracked: Tracked) => void,
    wait: (ms: number) => Promise<void> = (ms) => new Promise((done) => setTimeout(done, ms)),
  ): Promise<Tracked | null> => {
    setStalled(false);
    for (let attempt = 0; attempt < TX_POLL_ATTEMPTS; attempt += 1) {
      const tracked = await checkOnce(hash);
      if (tracked === null) break;
      if (tracked.state === 'INCLUDED_OK' || tracked.state === 'INCLUDED_FAILED') return tracked;
      onProgress(tracked);
      await wait(TX_POLL_INTERVAL_MS);
    }
    setStalled(true);
    return null;
  }, [checkOnce]);

  return { follow, checkOnce, stalled, setStalled };
}
