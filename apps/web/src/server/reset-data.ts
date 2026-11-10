/**
 * `pnpm db:reset-data` — empty every data table, keep the schema and the migration ledger.
 *
 * Why it exists: Squad Stake goes live on mainnet as the **same deployment** that was running
 * on testnet (docs/GO-LIVE.md). The rows in that database are testnet squads, testnet
 * commitments and testnet transaction hashes. Left in place after the switch they would be
 * read back against the mainnet chain, where those stakers and hashes do not exist — the app
 * would show a member "Not saving yet" for a stake that really is there on the other chain,
 * and the public proof page would print mainnet RPC calls beside testnet hashes. That is
 * exactly the "no fabricated proof" line in AGENTS.md, so the data goes rather than the claim.
 *
 * A CLI, never imported by the app (like `migrate.ts`): emptying a database is an explicit
 * operator action. It refuses unless it is given **both** `--confirm` and the exact host name
 * of the database it is pointed at, so a command copied into the wrong shell cannot wipe the
 * wrong database — and it prints the tables and their row counts before it touches anything.
 *
 * `schema_migrations` is never truncated: the schema is not being rebuilt, only emptied, and
 * dropping the ledger would make `pnpm db:migrate` replay DDL that is already applied.
 */
import postgres from 'postgres';
import { migrationUrl, sslFor } from './lib/db-config';

/** The one table the reset keeps: the migration ledger describes the schema, not the data. */
const KEEP = ['schema_migrations'];

const argv = process.argv.slice(2);
const confirmed = argv.includes('--confirm');
// `--host=<name>` or a bare argument; anything that is not a flag is read as the host.
const givenHost = argv
  .map((arg) => (arg.startsWith('--host=') ? arg.slice('--host='.length) : arg))
  .find((arg) => !arg.startsWith('-'));

const url = migrationUrl(process.env);
const expectedHost = new URL(url).hostname;
const sql = postgres(url, { max: 1, prepare: false, ssl: sslFor(url) });

/** Every table in the current schema except the ones KEEP names, with its row count. */
async function inventory(): Promise<{ name: string; rows: number }[]> {
  const names = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC`;
  const tables = names
    .map((row) => row.table_name)
    .filter((name) => !KEEP.includes(name));
  const counted: { name: string; rows: number }[] = [];
  for (const name of tables) {
    // The name comes from information_schema, never from an argument, and goes through
    // postgres.js's own identifier escaping rather than into the string.
    const [row] = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM ${sql(name)}`;
    counted.push({ name, rows: Number(row?.count ?? 0) });
  }
  return counted;
}

try {
  const tables = await inventory();
  console.log(`Database host: ${expectedHost}`);
  console.log(tables.length === 0
    ? 'No data tables found.'
    : `Tables that would be emptied (${tables.length}):`);
  for (const table of tables) console.log(`  ${table.name} — ${table.rows} row(s)`);
  console.log(`Kept: ${KEEP.join(', ')}`);

  if (!confirmed || givenHost !== expectedHost) {
    console.error('\nNothing was deleted.');
    console.error(`To empty these tables, repeat the command with both the --confirm flag and the host above:
  pnpm db:reset-data --confirm ${expectedHost}`);
    if (confirmed && givenHost !== undefined) {
      console.error(`(The host given was "${givenHost}", which is not this database's host.)`);
    }
    process.exitCode = 1;
  } else if (tables.length === 0) {
    console.log('\nNothing to do.');
  } else {
    // One statement, one transaction: with foreign keys between squads, memberships and
    // tracked_txs, truncating them together is the only order that always works.
    await sql`TRUNCATE TABLE ${sql(tables.map((table) => table.name))} RESTART IDENTITY CASCADE`;
    const after = await inventory();
    const left = after.filter((table) => table.rows > 0);
    console.log(`\nEmptied ${tables.length} table(s) on ${expectedHost}.`);
    if (left.length > 0) {
      console.error(`Still not empty: ${left.map((table) => table.name).join(', ')}`);
      process.exitCode = 1;
    }
  }
} finally {
  await sql.end();
}
