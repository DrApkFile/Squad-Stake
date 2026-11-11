import { cookies } from 'next/headers';
import { NoticeScreen, strings } from '@squad-stake/ui';
import { inviteTokenInput } from '../../../src/core/squad-contract';
import { JoinCommitContainer } from '../../../src/containers/join-commit';
import { SignInContainer } from '../../../src/containers/sign-in';
import { authService } from '../../../src/server/lib/auth';
import { SESSION_COOKIE } from '../../../src/server/lib/auth-http';
import { currentLang } from '../../../src/i18n/server';
import { serverEnv } from '../../../src/server/lib/env';
import { joinView } from '../../../src/server/lib/squad-view';

export const dynamic = 'force-dynamic';

/** What a bad or expired invite shows instead of a 404: the words for this exact failure,
 * because "that invite link is not valid" is an answer and "This page could not be found"
 * is not (docs/PROGRESS.md 2026-11-10). */
async function invalidInvite() {
  const lang = await currentLang();
  const s = strings(lang).notice;
  return <NoticeScreen title={s.inviteInvalidTitle} body={s.inviteInvalidBody}
    action={{ label: s.home, href: '/' }} lang={lang} />;
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!inviteTokenInput.safeParse(token).success) return invalidInvite();
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  let address: string | null = null;
  if (cookie) {
    try { address = (await authService().session(cookie))?.address ?? null; }
    catch { /* A failed session read cannot create an authenticated UI. */ }
  }
  const view = await joinView(token, address);
  // A token that resolves to nothing: guessed, mistyped, or a squad that is gone.
  if (!view) return invalidInvite();
  const lang = await currentLang();
  if (!address) {
    // Joining requires a signed-in wallet (FAILURE_MODES "invite link guessing").
    const host = new URL(serverEnv().APP_ORIGIN).host;
    // The real container, so the button works and sign-in returns to this invite.
    return <SignInContainer devIdentity={null} initialAddress={null}
      openInPayUrl={`https://nimpay.app/miniapps/open/${host}`}
      onwardUrl={`/s/${token}`} invitedTo={view.squad.name} initialLang={lang} />;
  }
  return <JoinCommitContainer view={view} token={token} now={Date.now()} initialLang={lang} />;
}
