#!/usr/bin/env node
/**
 * Seats two addresses that really are stakers on Nimiq testnet in the squad the create flow
 * just made, so the squad page and the public proof page in the video derive their member
 * statuses from live chain reads rather than from a fixture.
 *
 * Read on 2026-11-11 from https://rpc.testnet.nimiqwatch.com:
 *   NQ14 TEMC … 83R7  balance 87,726,548,576 luna, inactive 0            → Saved
 *   NQ22 11TS … 2RS8  balance 0, inactive 11,000,000, from 16,251,210    → Leaving
 * Nothing about their status is written here: only the membership and the commitment are,
 * and the status is still read from the chain on every request (AGENTS.md invariant 1).
 *
 * This writes to the throwaway local database only. DATABASE_URL must point at it.
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!/(localhost|127\.0\.0\.1)/.test(url)) {
  throw new Error('refusing: this seeds sample members, so it only runs against a local database');
}
const { squadId } = JSON.parse(await readFile(resolve(HERE, '../capture/context.json'), 'utf8'));
if (!squadId) throw new Error('no squadId in apps/video/capture/context.json — run the capture first');

const MEMBERS = [
  { address: 'NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD 83R7', luna: 30_000_000 },
  { address: 'NQ22 11TS NJ8N BMD0 UVUM E0KL 2RPU NHM1 2RS8', luna: 11_000_000 },
];

const statements = MEMBERS.map(({ address, luna }) =>
  `INSERT INTO memberships (squad_id, address, committed_luna, joined_at)
   VALUES ('${squadId}', '${address}', ${luna}, now() - interval '3 days')
   ON CONFLICT (squad_id, address)
   DO UPDATE SET committed_luna = EXCLUDED.committed_luna, left_at = NULL;`);
statements.push(`SELECT address, committed_luna FROM memberships WHERE squad_id = '${squadId}' ORDER BY joined_at;`);

await new Promise((done, fail) => {
  const child = spawn('psql', [url, '-v', 'ON_ERROR_STOP=1', '-c', statements.join('\n')],
    { stdio: ['ignore', 'inherit', 'inherit'] });
  child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`psql exited ${code}`))));
});
