import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAuthHandlers } from '../../apps/web/src/server/lib/auth-http';
import { makeHarness, signAs } from '../support/auth';

test('Q01 a stolen challenge cannot be used from another browser binding', async () => {
  const h = makeHarness();
  const challenge = await h.auth.challenge(h.binding);
  assert.equal((await h.auth.verify({ id: challenge.id, ...signAs('alice', challenge.message) }, 'attacker')).ok, false);
  assert.equal(h.sessions.size, 0);
});

test('Q01 signing a different message cannot consume the challenge', async () => {
  const h = makeHarness();
  const challenge = await h.auth.challenge(h.binding);
  assert.equal((await h.auth.verify({ id: challenge.id, ...signAs('alice', 'different') }, h.binding)).ok, false);
  assert.equal(h.challenges.get(challenge.id)?.consumedAt, null);
});

test('Q02 strict HTTP boundary rejects a forged client address', async () => {
  const h = makeHarness();
  const challenge = await h.auth.challenge(h.binding);
  const handlers = createAuthHandlers({ auth: h.auth, origin: h.dependencies.origin, randomToken: () => h.binding });
  const response = await handlers.verify(new Request('https://squad.example/api/auth/verify', {
    method: 'POST', headers: { origin: h.dependencies.origin, 'Content-Type': 'application/json', cookie: `squad_challenge=${h.binding}` },
    body: JSON.stringify({ id: challenge.id, ...signAs('alice', challenge.message), address: 'attacker' }),
  }));
  assert.equal(response.status, 400);
  assert.equal(h.sessions.size, 0);
});

test('Q01 cross-origin challenge issuance and verification are refused', async () => {
  const h = makeHarness();
  const handlers = createAuthHandlers({ auth: h.auth, origin: h.dependencies.origin, randomToken: () => h.binding });
  for (const handler of [handlers.challenge, handlers.verify]) {
    const response = await handler(new Request('https://squad.example/api/auth/challenge', {
      method: 'POST', headers: { origin: 'https://attacker.example', 'Content-Type': 'application/json' }, body: '{}',
    }));
    assert.equal(response.status, 403);
  }
  assert.equal(h.challenges.size, 0);
});

test('Q01 malformed and oversized JSON fail closed', async () => {
  const h = makeHarness();
  const handlers = createAuthHandlers({ auth: h.auth, origin: h.dependencies.origin, randomToken: () => h.binding });
  for (const body of ['{', 'x'.repeat(5000), '{"unknown":true}']) {
    const response = await handlers.challenge(new Request('https://squad.example/api/auth/challenge', {
      method: 'POST', headers: { origin: h.dependencies.origin, 'Content-Type': 'application/json' }, body,
    }));
    assert.equal(response.status, 400);
  }
  assert.equal(h.challenges.size, 0);
});
