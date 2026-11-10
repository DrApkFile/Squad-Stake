import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { INVITE_TOKEN_BYTES, SHORT_ID_LENGTH } from '../../config/constants';
import { createSquadService } from '../core/squads';
import { createTxTracker } from '../core/tx-tracker';
import { authService } from './auth';
import { readCookie, SESSION_COOKIE } from './auth-http';
import { serverEnv } from './env';
import { nimiqRpc } from './rpc-client';
import { squadStore } from './squad-store';
import { createSquadHandlers, type SquadHandlers } from './squad-http';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
/** Base32-ish lower-case id for `sq:<short_id>` payment data; no vowels, no look-alikes. */
const SHORT_ID_ALPHABET = '0123456789bcdfghjkmnpqrstvwxyz';
const shortId = () => [...randomBytes(SHORT_ID_LENGTH)]
  .map((byte) => SHORT_ID_ALPHABET.charAt(byte % SHORT_ID_ALPHABET.length)).join('');

export function squadHandlers(): SquadHandlers {
  const store = squadStore;
  const rpc = nimiqRpc();
  return createSquadHandlers({
    squads: createSquadService({
      store, now: Date.now, uuid: randomUUID, shortId,
      inviteToken: () => randomBytes(INVITE_TOKEN_BYTES).toString('hex'), hash: sha256,
    }),
    tracker: createTxTracker({ store, rpc, now: Date.now }),
    store,
    commit: { store, rpc, now: Date.now },
    origin: serverEnv().APP_ORIGIN,
    async sessionAddress(request) {
      const token = readCookie(request, SESSION_COOKIE);
      if (!token) return null;
      return (await authService().session(token))?.address ?? null;
    },
  });
}
