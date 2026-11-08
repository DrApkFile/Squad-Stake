import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { inviteTokenInput } from '../../../src/core/squad-contract';
import { JoinCommitContainer } from '../../../src/containers/join-commit';
import { SignInContainer } from '../../../src/containers/sign-in';
import { authService } from '../../../src/server/lib/auth';
import { SESSION_COOKIE } from '../../../src/server/lib/auth-http';
import { serverEnv } from '../../../src/server/lib/env';
import { joinView } from '../../../src/server/lib/squad-view';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!inviteTokenInput.safeParse(token).success) notFound();
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  let address: string | null = null;
  if (cookie) {
    try { address = (await authService().session(cookie))?.address ?? null; }
    catch { /* A failed session read cannot create an authenticated UI. */ }
  }
  const view = await joinView(token, address);
  if (!view) notFound();
  if (!address) {
    // Joining requires a signed-in wallet (FAILURE_MODES "invite link guessing").
    const host = new URL(serverEnv().APP_ORIGIN).host;
    // The real container, so the button works and sign-in returns to this invite.
    return <SignInContainer devIdentity={null} initialAddress={null}
      openInPayUrl={`https://nimpay.app/miniapps/open/${host}`}
      onwardUrl={`/s/${token}`} invitedTo={view.squad.name} />;
  }
  return <JoinCommitContainer view={view} token={token} now={Date.now()} />;
}
