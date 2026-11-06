import 'server-only';
import postgres from 'postgres';
import { poolOptions } from './db-config';
import { serverEnv } from './env';

// DATABASE_URL is Neon's pooled (PgBouncer, transaction mode) endpoint on Vercel; see
// db-config.ts for why `prepare: false` is required there and why the member-locked
// commitment transaction (Q03) still holds its row locks through the pooler.
let database: ReturnType<typeof postgres> | undefined;
export function db() {
  if (!database) {
    const url = serverEnv().DATABASE_URL;
    database = postgres(url, poolOptions(url));
  }
  return database;
}
