import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createAuthService } from '../core/auth';
import { authStore } from './auth-store';
import { serverEnv } from './env';
import { verifySignedMessage } from './nimiq-signature';

export const randomToken = () => randomBytes(32).toString('hex');
export function authService() {
  return createAuthService({
    now: Date.now, uuid: randomUUID, randomToken,
    hash: (value) => createHash('sha256').update(value).digest('hex'),
    verify: verifySignedMessage, store: authStore, origin: serverEnv().APP_ORIGIN,
  });
}
