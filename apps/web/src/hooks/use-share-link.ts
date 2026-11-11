'use client';

import { useCallback, useState } from 'react';

/**
 * Handing a link to someone, the way a phone does it.
 *
 * No screen in this app prints an invite URL: it is the one string that must not be mistyped,
 * and selecting it by hand on a phone is miserable. The phone's own share sheet reaches the
 * messaging app the squad already uses, and the clipboard is the fallback for everywhere
 * `navigator.share` does not exist — it needs a secure context and is not on every platform.
 *
 * Dismissing the share sheet rejects with `AbortError`. That is a decision, not a failure, so
 * it leaves the screen exactly as it was and does **not** fall through to the clipboard;
 * anything else does, so there is always a way to send the link.
 *
 * Lives here rather than in `packages/ui` because it touches `navigator`: the components stay
 * pure and take `onShare` / `onCopy` / `shared` as props (AGENTS.md "UI purity" 1).
 * Shared by the create screen's share step and the squad page (docs/AUDIT.md, M-1).
 */
export function useShareLink(url: string | null, title: string) {
  // Three states, not a boolean: a clipboard write can be refused (an insecure context, a
  // browser that asks first, a denied permission) and that used to set the flag back to false,
  // which rendered as a tap that did nothing at all. The screen says so instead.
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = useCallback(async () => {
    if (url === null) return false;
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      return true;
    } catch {
      setState('failed');
      return false;
    }
  }, [url]);

  const share = useCallback(async () => {
    if (url === null) return;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        setState('idle');
        return;
      } catch (error) {
        // Dismissing the sheet is a decision, and it leaves the screen exactly as it was.
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    await copy();
  }, [copy, title, url]);

  return { shared: state === 'copied', failed: state === 'failed', share, copy };
}
