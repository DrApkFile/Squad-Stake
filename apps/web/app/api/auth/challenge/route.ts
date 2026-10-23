import { authService, randomToken } from '../../../../src/server/lib/auth';
import { createAuthHandlers, json } from '../../../../src/server/lib/auth-http';
import { serverEnv } from '../../../../src/server/lib/env';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    return await createAuthHandlers({ auth: authService(), origin: serverEnv().APP_ORIGIN, randomToken }).challenge(request);
  } catch {
    return json({ ok: false, code: 'UNAVAILABLE' }, 503);
  }
}
