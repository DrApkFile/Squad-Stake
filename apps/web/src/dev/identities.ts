import 'server-only';
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { isDevServer } from './is-dev-server';

export function signDevChallenge(identity: 'alice' | 'bob' | 'carol', message: string) {
  if (!isDevServer()) throw new Error('Dev identities are disabled');
  // Public, reproducible fixtures (AGENTS.md dev harness); NEVER fund these keys.
  const seed = createHash('sha256').update(`squad-stake/dev-only/${identity}/v1`).digest();
  const privateKey = createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der', type: 'pkcs8',
  });
  const publicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const bytes = Buffer.from(message, 'utf8');
  const digest = createHash('sha256').update(`\x16Nimiq Signed Message:\n${bytes.length}`).update(bytes).digest();
  return { publicKey, signature: sign(null, digest, privateKey).toString('hex') };
}
