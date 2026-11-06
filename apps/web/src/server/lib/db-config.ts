import { z } from 'zod';

// Shared by the request-path client (db.ts) and the migration CLI (migrate.ts), so this file
// must stay importable from plain Node: no 'server-only' here.
//
// Neon through the Vercel Marketplace hands us two endpoints for the same database:
//   DATABASE_URL          → the PgBouncer endpoint (host ends in `-pooler`), transaction mode.
//   DATABASE_URL_UNPOOLED → a direct connection to Postgres.

const connectionUrl = z.url().refine((value) => /^postgres(ql)?:/.test(value),
  'must be a postgres:// or postgresql:// URL');

// An unset Vercel variable arrives as an empty string, which is not a URL.
const present = (value: string | undefined): string | undefined =>
  value !== undefined && value.trim() !== '' ? value : undefined;

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * TLS is mandatory for every remote database; `verify-full` also authenticates the server,
 * which plain `sslmode=require` (what Neon puts in the URL) does not. Neon's certificate
 * chain is publicly trusted, so Node's default CA store verifies it. Only a loopback
 * development database may speak plaintext.
 */
export function sslFor(url: string): 'verify-full' | false {
  const host = new URL(connectionUrl.parse(url)).hostname.replace(/^\[|\]$/gu, '');
  return LOOPBACK.has(host) ? false : 'verify-full';
}

/**
 * Options for the pooled request path. `prepare: false` is what PgBouncer's transaction mode
 * requires: postgres.js otherwise sends `PARSE` with a *named* prepared statement, which lives
 * on one server connection, while transaction pooling may hand the next statement a different
 * one ("prepared statement s1 already exists" / "does not exist").
 *
 * The commitment rule's locked transaction (Q03, `squadStore.withMemberLock`) still holds
 * through the pooler: transaction mode pins one server connection for the whole
 * BEGIN … COMMIT, so `SELECT … FOR UPDATE` keeps its row locks until that transaction ends,
 * exactly as on a direct connection — a second commit for the same member still waits.
 * Transaction pooling only breaks *session*-lifetime state (named prepared statements,
 * session advisory locks, LISTEN, SET), and the commit path uses none of it: every lock it
 * takes is `FOR UPDATE` inside one transaction, and `Σ commitments ≤ active balance` is
 * re-checked inside that same transaction against a fresh chain read.
 */
export function poolOptions(url: string): { max: number; idle_timeout: number;
  connect_timeout: number; prepare: false; ssl: 'verify-full' | false } {
  return { max: 3, idle_timeout: 20, connect_timeout: 5, prepare: false, ssl: sslFor(url) };
}

/**
 * Migrations run on the direct endpoint when it exists: DDL in one transaction, a
 * transaction-scoped advisory lock and multi-statement `tx.unsafe` have no business being
 * multiplexed by a pooler. Falls back to DATABASE_URL (a local database has no second URL).
 */
export function migrationUrl(env: Record<string, string | undefined>): string {
  return connectionUrl.parse(present(env.DATABASE_URL_UNPOOLED) ?? present(env.DATABASE_URL));
}
