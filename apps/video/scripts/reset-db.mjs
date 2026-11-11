#!/usr/bin/env node
/** Empties the local throwaway database so a recording always captures the first-time flow:
 *  an empty "My squads", the privacy notice, a fresh invite. Local hosts only. */
import { spawn } from 'node:child_process';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!/(localhost|127\.0\.0\.1)/.test(url)) throw new Error('refusing: local databases only');
await new Promise((done, fail) => {
  const child = spawn('psql', [url, '-v', 'ON_ERROR_STOP=1', '-q', '-c',
    'TRUNCATE tracked_txs, memberships, squads, sessions, challenges RESTART IDENTITY CASCADE;'],
    { stdio: ['ignore', 'inherit', 'inherit'] });
  child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`psql exited ${code}`))));
});
console.log('local database emptied (schema_migrations kept)');
