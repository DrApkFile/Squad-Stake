import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { templateGoalDates } from '@squad-stake/ui';
import { GOAL_MIN_AHEAD_MS } from '../../../src/config/constants';
import { CreateSquadContainer } from '../../../src/containers/create-squad';
import { authService } from '../../../src/server/lib/auth';
import { SESSION_COOKIE } from '../../../src/server/lib/auth-http';
import { currentLang } from '../../../src/i18n/server';
import { serverEnv } from '../../../src/server/lib/env';

export const dynamic = 'force-dynamic';

export default async function CreateSquadPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let address: string | null = null;
  if (token) {
    try { address = (await authService().session(token))?.address ?? null; }
    catch { /* A failed session read cannot create an authenticated UI. */ }
  }
  // Creating a squad needs a verified wallet (PRD §11); sign-in lives at the root.
  if (!address) redirect('/');
  // One clock for both: the earliest date the form accepts and the dates the templates
  // suggest, so a template can never pre-fill a date the form would reject.
  const now = Date.now();
  const earliest = new Date(now + GOAL_MIN_AHEAD_MS).toISOString().slice(0, 10);
  return <CreateSquadContainer minGoalDate={earliest} inviteBase={serverEnv().APP_ORIGIN}
    initialLang={await currentLang()} templateDates={templateGoalDates(now)} />;
}
