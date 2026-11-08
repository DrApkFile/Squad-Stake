import { redirect } from 'next/navigation';
import { SignInContainer } from '../src/containers/sign-in';
import { devOptions } from '../src/dev/is-dev-server';
import { currentLang } from '../src/i18n/server';
import { serverEnv } from '../src/server/lib/env';
import { currentAddress } from '../src/server/lib/session-page';

export const dynamic = 'force-dynamic';

/** Screens 1 and 2. A signed-in visitor belongs on their squads, not on a sign-in screen. */
export default async function WelcomePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const query = new URLSearchParams();
  if (typeof search.as === 'string') query.set('as', search.as);
  if (typeof search.chain === 'string') query.set('chain', search.chain);
  const dev = devOptions(query);
  const address = await currentAddress();
  // The dev harness signs in through this screen, so it keeps the screen even with a session.
  if (address !== null && dev.identity === null) redirect('/squads');
  const host = new URL(serverEnv().APP_ORIGIN).host;
  return <SignInContainer devIdentity={dev.identity} initialAddress={address}
    openInPayUrl={`https://nimpay.app/miniapps/open/${host}`}
    initialLang={await currentLang()} />;
}
