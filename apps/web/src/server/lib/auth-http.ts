import 'server-only';
import { z } from 'zod';
import { challengeInput, verifyInput } from '../../core/auth-contract';
import type { AuthService } from '../core/auth';

export const SESSION_COOKIE = 'squad_session';
const BINDING_COOKIE = 'squad_challenge';
const options = (secure: boolean) => `HttpOnly; SameSite=Strict; Path=/;${secure ? ' Secure;' : ''}`;
export function readCookie(request: Request, name: string) {
  return request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
}
export function json(body: unknown, status = 200, cookie?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}
export function sessionCookie(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${token}; ${options(secure)} Max-Age=604800`;
}
export function validOrigin(request: Request, origin: string) {
  return request.headers.get('origin') === origin;
}
export async function parseBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return null;
  // Bound untrusted bodies while streaming, before JSON parsing.
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
export function createAuthHandlers(deps: { auth: AuthService; origin: string; randomToken(): string }) {
  const secure = new URL(deps.origin).protocol === 'https:';
  return {
    async challenge(request: Request) {
      try {
        if (!validOrigin(request, deps.origin)) return json({ ok: false, code: 'AUTH_REFUSED' }, 403);
        if (!challengeInput.safeParse(await parseBody(request)).success) {
          return json({ ok: false, code: 'INVALID_INPUT' }, 400);
        }
        const binding = deps.randomToken();
        const challenge = await deps.auth.challenge(binding);
        return json({ ok: true, ...challenge }, 200,
          `${BINDING_COOKIE}=${binding}; ${options(secure)} Max-Age=300`);
      } catch (error) {
        return json({ ok: false, code: error instanceof SyntaxError ? 'INVALID_INPUT' : 'UNAVAILABLE' },
          error instanceof SyntaxError ? 400 : 503);
      }
    },
    async verify(request: Request) {
      try {
        if (!validOrigin(request, deps.origin)) return json({ ok: false, code: 'AUTH_REFUSED' }, 403);
        const parsed = verifyInput.safeParse(await parseBody(request));
        if (!parsed.success) return json({ ok: false, code: 'INVALID_INPUT' }, 400);
        const binding = z.string().regex(/^[a-f\d]{64}$/).safeParse(readCookie(request, BINDING_COOKIE));
        if (!binding.success) return json({ ok: false, code: 'AUTH_REFUSED' }, 401);
        const result = await deps.auth.verify(parsed.data, binding.data);
        if (!result.ok) return json(result, 401);
        // The raw session token is carried only by the HttpOnly cookie.
        const response = json({ ok: true, address: result.address, expiresAt: result.expiresAt },
          200, sessionCookie(result.token, secure));
        response.headers.append('Set-Cookie', `${BINDING_COOKIE}=; ${options(secure)} Max-Age=0`);
        return response;
      } catch (error) {
        return json({ ok: false, code: error instanceof SyntaxError ? 'INVALID_INPUT' : 'UNAVAILABLE' },
          error instanceof SyntaxError ? 400 : 503);
      }
    },
  };
}
