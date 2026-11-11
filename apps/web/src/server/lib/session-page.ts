import 'server-only';
import { cookies } from 'next/headers';
import { authService } from './auth';
import { SESSION_COOKIE } from './auth-http';

/**
 * The signed-in address for a server-rendered page, or null. A failed session read can never
 * produce an authenticated UI, so it is swallowed into "not signed in".
 */
export async function currentAddress(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return (await authService().session(token))?.address ?? null;
  } catch {
    return null;
  }
}

/**
 * Where a signed-out visitor is sent, and why.
 *
 * Every members-only page used to answer `redirect('/')`, which dropped the member on a
 * welcome screen with no hint that they had asked for something else and no way back to it.
 * The reason now travels in the URL, so the entry screen can say it and return them when they
 * sign in (`?next=`). The path is this app's own and is re-validated on arrival, so a crafted
 * `next` can never send anyone off-site.
 */
export function signInFirstUrl(wantedPath: string) {
  return `/?next=${encodeURIComponent(wantedPath)}`;
}

/**
 * The onward path from a `?next=`, or null. A single leading slash only: `//evil.example` is
 * a protocol-relative URL that a browser would follow off this origin, and a scheme
 * (`javascript:`) must never reach an `href`.
 */
export function onwardPath(next: string | string[] | undefined): string | null {
  if (typeof next !== 'string') return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  return next;
}

/**
 * The squad a proof page should return to, from its `?from=`, or null.
 *
 * The id is rebuilt into this app's own route rather than echoed, and only a uuid-shaped id
 * is accepted, so a crafted `from` can never steer the back chevron off this origin — the
 * same reasoning as `onwardPath`, for the other direction.
 */
export function squadPathFrom(from: string | string[] | undefined): string | null {
  if (typeof from !== 'string') return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(from)
    ? `/squads/${from}` : null;
}
