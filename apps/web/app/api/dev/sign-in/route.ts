import { z } from 'zod';
import { isDevServer } from '../../../../src/dev/is-dev-server';
import { authService, randomToken } from '../../../../src/server/lib/auth';
import { json, parseBody, sessionCookie, validOrigin } from '../../../../src/server/lib/auth-http';
import { serverEnv } from '../../../../src/server/lib/env';

export const runtime = 'nodejs';
const schema = z.object({ identity: z.enum(['alice', 'bob', 'carol']) }).strict();
export async function POST(request: Request) {
  if (!isDevServer()) return new Response(null, { status: 404 });
  try {
    const env = serverEnv();
    if (!validOrigin(request, env.APP_ORIGIN)) return json({ ok: false, code: 'AUTH_REFUSED' }, 403);
    const raw: unknown = await parseBody(request);
    const input = schema.safeParse(raw);
    if (!input.success) return json({ ok: false, code: 'INVALID_INPUT' }, 400);
    const { signDevChallenge } = await import('../../../../src/dev/identities');
    const auth = authService();
    const binding = randomToken();
    const challenge = await auth.challenge(binding);
    const result = await auth.verify({ id: challenge.id, ...signDevChallenge(input.data.identity, challenge.message) }, binding);
    if (!result.ok) return json(result, 401);
    return json({ ok: true, address: result.address, expiresAt: result.expiresAt }, 200,
      sessionCookie(result.token, env.APP_ORIGIN.startsWith('https:')));
  } catch {
    return json({ ok: false, code: 'UNAVAILABLE' }, 503);
  }
}
