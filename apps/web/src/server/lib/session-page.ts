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
