import 'server-only';
import { z } from 'zod';
import type { AuthStore, Challenge, Session } from '../core/auth';
import { db } from './db';

const challengeRow = z.object({ id: z.uuid(), message: z.string(),
  expires_at: z.date(), consumed_at: z.date().nullable() }).strict();
const sessionRow = z.object({ address: z.string(), public_key: z.instanceof(Uint8Array), expires_at: z.date() }).strict();

export const authStore: AuthStore = {
  async insertChallenge(challenge) {
    await db()`INSERT INTO challenges (id, message, expires_at) VALUES
      (${challenge.id}, ${challenge.message}, ${new Date(challenge.expiresAt)})`;
  },
  async getChallenge(id) {
    const rows = await db()`SELECT id, message, expires_at, consumed_at FROM challenges WHERE id = ${id}`;
    if (!rows[0]) return null;
    const row = challengeRow.parse(rows[0]);
    return { id: row.id, message: row.message,
      expiresAt: row.expires_at.getTime(),
      consumedAt: row.consumed_at?.getTime() ?? null } satisfies Challenge;
  },
  async consumeAndCreateSession(id, now, session) {
    // One statement is atomic across serverless instances, including rollback on insert failure.
    const rows = await db()`WITH consumed AS (
      UPDATE challenges SET consumed_at = ${new Date(now)}
      WHERE id = ${id} AND consumed_at IS NULL AND expires_at > ${new Date(now)}
        AND expires_at > statement_timestamp() RETURNING id
    ) INSERT INTO sessions (token_hash, address, public_key, expires_at)
      SELECT ${Buffer.from(session.tokenHash, 'hex')}, ${session.address},
        ${Buffer.from(session.publicKey, 'hex')}, ${new Date(session.expiresAt)} FROM consumed
      RETURNING address`;
    return rows.length === 1;
  },
  async getSession(tokenHash, now) {
    const rows = await db()`SELECT address, public_key, expires_at FROM sessions
      WHERE token_hash = ${Buffer.from(tokenHash, 'hex')} AND expires_at > ${new Date(now)}`;
    if (!rows[0]) return null;
    const row = sessionRow.parse(rows[0]);
    return { tokenHash, address: row.address,
      publicKey: Buffer.from(row.public_key).toString('hex'),
      expiresAt: row.expires_at.getTime() } satisfies Session;
  },
};
