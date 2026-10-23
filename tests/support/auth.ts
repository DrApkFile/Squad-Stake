import { createHash, createPrivateKey, createPublicKey, randomBytes, randomUUID, sign } from 'node:crypto';
import { createAuthService, type AuthDependencies, type Challenge, type Session } from '../../apps/web/src/server/core/auth';
import { verifySignedMessage } from '../../apps/web/src/server/lib/nimiq-signature';

export function signAs(identity: string, message: string) {
  const seed = createHash('sha256').update(`test-only/${identity}`).digest();
  const key = createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der', type: 'pkcs8',
  });
  const publicKey = createPublicKey(key).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const data = Buffer.from(message);
  const digest = createHash('sha256').update(`\x16Nimiq Signed Message:\n${data.length}`).update(data).digest();
  return { publicKey, signature: sign(null, digest, key).toString('hex') };
}
export function makeHarness() {
  let now = 1_792_670_400_000;
  const challenges = new Map<string, Challenge>();
  const sessions = new Map<string, Session>();
  const dependencies: AuthDependencies = {
    now: () => now, uuid: randomUUID, randomToken: () => randomBytes(32).toString('hex'),
    hash: (value) => createHash('sha256').update(value).digest('hex'),
    origin: 'https://squad.example', verify: verifySignedMessage,
    store: {
      insertChallenge: async (challenge) => { challenges.set(challenge.id, challenge); },
      getChallenge: async (id) => challenges.get(id) ?? null,
      consumeAndCreateSession: async (id, at, session) => {
        const challenge = challenges.get(id);
        if (!challenge || challenge.consumedAt !== null || challenge.expiresAt <= at) return false;
        challenge.consumedAt = at;
        sessions.set(session.tokenHash, session);
        return true;
      },
      getSession: async (hash, at) => {
        const session = sessions.get(hash);
        return session && session.expiresAt > at ? session : null;
      },
    },
  };
  return { auth: createAuthService(dependencies), dependencies, challenges, sessions,
    binding: randomBytes(32).toString('hex'), advance: (milliseconds: number) => { now += milliseconds; } };
}
