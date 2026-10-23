import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PublicKey } from '@nimiq/core';
import { createAuthService } from '../../apps/web/src/server/core/auth';
import { verifySignedMessage } from '../../apps/web/src/server/lib/nimiq-signature';
import { makeHarness, signAs } from '../support/auth';

test('Q01 a challenge is single use, including concurrent verification', async () => {
  const h = makeHarness();
  const challenge = await h.auth.challenge(h.binding);
  const proof = signAs('alice', challenge.message);
  const results = await Promise.all([
    h.auth.verify({ id: challenge.id, ...proof }, h.binding),
    h.auth.verify({ id: challenge.id, ...proof }, h.binding),
  ]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(h.sessions.size, 1);
});

test('Q01 expiry at exactly five minutes is refused without a session', async () => {
  const h = makeHarness();
  const challenge = await h.auth.challenge(h.binding);
  h.advance(300_000);
  const result = await h.auth.verify({ id: challenge.id, ...signAs('alice', challenge.message) }, h.binding);
  assert.deepEqual(result, { ok: false, code: 'AUTH_REFUSED' });
  assert.equal(h.sessions.size, 0);
});

test('Q01 a signature paired with the wrong key is refused', async () => {
  const h = makeHarness();
  const challenge = await h.auth.challenge(h.binding);
  const alice = signAs('alice', challenge.message);
  const bob = signAs('bob', challenge.message);
  assert.equal((await h.auth.verify({ id: challenge.id, ...alice, publicKey: bob.publicKey }, h.binding)).ok, false);
  assert.equal(h.sessions.size, 0);
});

test('Q02 identity is derived by the official library, never a claimed address', async () => {
  const h = makeHarness();
  const challenge = await h.auth.challenge(h.binding);
  const proof = signAs('alice', challenge.message);
  const result = await h.auth.verify({ id: challenge.id, ...proof }, h.binding);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.address, PublicKey.fromHex(proof.publicKey).toAddress().toUserFriendlyAddress());
  assert.equal(h.sessions.values().next().value?.address, PublicKey.fromHex(proof.publicKey).toAddress().toUserFriendlyAddress());
  assert.notEqual([...h.sessions.keys()][0], result.token);
});

test('Q01 Nimiq digest uses UTF-8 byte length and rejects tampered text', () => {
  const proof = signAs('alice', 'Squad Stake — café');
  assert.equal(verifySignedMessage('Squad Stake — café', proof.publicKey, proof.signature), PublicKey.fromHex(proof.publicKey).toAddress().toUserFriendlyAddress());
  assert.equal(verifySignedMessage('Squad Stake — cafe', proof.publicKey, proof.signature), null);
});

test('Q01 failed persistence cannot report sign-in success', async () => {
  const h = makeHarness();
  const auth = createAuthService({ ...h.dependencies, store: {
    ...h.dependencies.store,
    consumeAndCreateSession: async () => { throw new Error('offline'); },
  } });
  const challenge = await auth.challenge(h.binding);
  await assert.rejects(auth.verify({ id: challenge.id, ...signAs('alice', challenge.message) }, h.binding));
  assert.equal(h.sessions.size, 0);
});
