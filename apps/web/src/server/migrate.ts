import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { z } from 'zod';

// CLI entrypoint, never imported by the app; migrations are an explicit operator action.
const migrations = ['001-auth', '002-squads'] as const;
const url = z.url().parse(process.env.DATABASE_URL);
const sql = postgres(url, { max: 1 });
try {
  const applied: string[] = [];
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(193714)`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY)`;
    for (const name of migrations) {
      const rows = await tx`SELECT name FROM schema_migrations WHERE name = ${name}`;
      if (rows.length > 0) continue;
      await tx.unsafe(await readFile(new URL(`./migrations/${name}.sql`, import.meta.url), 'utf8'));
      await tx`INSERT INTO schema_migrations (name) VALUES (${name})`;
      applied.push(name);
    }
  });
  console.log(applied.length === 0 ? 'Migrations already applied.' : `Applied: ${applied.join(', ')}.`);
} finally {
  await sql.end();
}
