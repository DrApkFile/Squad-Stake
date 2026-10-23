import { cookies } from 'next/headers';
import { SignInContainer } from '../src/containers/sign-in';
import { devOptions } from '../src/dev/is-dev-server';
import { authService } from '../src/server/lib/auth';
import { SESSION_COOKIE } from '../src/server/lib/auth-http';

export const dynamic = 'force-dynamic';
export default async function SignInPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const query = new URLSearchParams();
  if (typeof search.as === 'string') query.set('as', search.as);
  if (typeof search.chain === 'string') query.set('chain', search.chain);
  const dev = devOptions(query);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let initialAddress: string | null = null;
  if (token) {
    try { initialAddress = (await authService().session(token))?.address ?? null; }
    catch { /* A failed session read cannot create an authenticated UI. */ }
  }
  const host = new URL(process.env.APP_ORIGIN ?? 'http://localhost:3000').host;
  return <SignInContainer devIdentity={dev.identity} initialAddress={initialAddress}
    openInPayUrl={`https://nimpay.app/miniapps/open/${host}`} />;
}
