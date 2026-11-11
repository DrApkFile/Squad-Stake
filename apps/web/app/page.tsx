import { redirect } from 'next/navigation';
import { SignInContainer } from '../src/containers/sign-in';
import { devOptions } from '../src/dev/is-dev-server';
import { currentLang } from '../src/i18n/server';
import { strings } from '@squad-stake/ui';
import { serverEnv } from '../src/server/lib/env';
import { currentAddress, onwardPath } from '../src/server/lib/session-page';

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
  // Where a members-only page sent them, if one did (src/server/lib/session-page.ts). Checked
  // again here, so only this app's own paths can ever reach the onward link.
  const onward = onwardPath(search.next);
  // The dev harness signs in through this screen, so it keeps the screen even with a session.
  if (address !== null && dev.identity === null) redirect(onward ?? '/squads');
  const host = new URL(serverEnv().APP_ORIGIN).host;
  const lang = await currentLang();
  const notice = strings(lang).notice;
  return <SignInContainer devIdentity={dev.identity} initialAddress={address}
    openInPayUrl={`https://nimpay.app/miniapps/open/${host}`}
    {...(onward === null ? {} : {
      onwardUrl: onward,
      // Why they are looking at this screen instead of the page they asked for.
      notice: { title: notice.signInFirstTitle, body: notice.signInFirstBody },
    })}
    initialLang={lang} />;
}
