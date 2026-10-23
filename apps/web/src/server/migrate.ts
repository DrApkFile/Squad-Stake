import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { z } from 'zod';

// CLI entrypoint, never imported by the app; migrations are an explicit operator action.
const url = z.url().parse(process.env.DATABASE_URL);
const sql = postgres(url, { max: 1 });
try {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(193714)`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY)`;
    const applied = await tx`SELECT name FROM schema_migrations WHERE name = '001-auth'`;
    if (applied.length === 0) {
      await tx.unsafe(await readFile(new URL('./migrations/001-auth.sql', import.meta.url), 'utf8'));
      await tx`INSERT INTO schema_migrations (name) VALUES ('001-auth')`;
    }
  });
  console.log('Auth migration applied.');
} finally {
  await sql.end();
}
