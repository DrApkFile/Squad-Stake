import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAuthHandlers } from '../../apps/web/src/server/lib/auth-http';
import { makeHarness, signAs } from '../support/auth';

test('Q02 HTTP sign-in issues an HttpOnly secure cookie and persists only its hash', async () => {
  const h = makeHarness();
  const handlers = createAuthHandlers({ auth: h.auth, origin: h.dependencies.origin, randomToken: () => h.binding });
  const headers = { origin: h.dependencies.origin, 'Content-Type': 'application/json' };
  const challengeResponse = await handlers.challenge(new Request('https://squad.example/api/auth/challenge', {
    method: 'POST', headers, body: '{}',
  }));
  assert.equal(challengeResponse.status, 200);
  const challenge = [...h.challenges.values()][0];
  assert.ok(challenge);
  const cookie = challengeResponse.headers.get('set-cookie')?.split(';')[0] ?? '';
  const response = await handlers.verify(new Request('https://squad.example/api/auth/verify', {
    method: 'POST', headers: { ...headers, cookie },
    body: JSON.stringify({ id: challenge.id, ...signAs('alice', challenge.message) }),
  }));
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.match(setCookie, /Secure/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body: unknown = await response.json();
  assert.ok(typeof body === 'object' && body !== null && !('token' in body));
  const token = setCookie.match(/squad_session=([a-f\d]{64})/)?.[1];
  assert.ok(token);
  assert.equal(h.sessions.has(token), false);
  assert.ok(await h.auth.session(token));
  h.advance(604_800_000);
  assert.equal(await h.auth.session(token), null);
});
