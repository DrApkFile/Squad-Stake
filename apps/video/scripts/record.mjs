#!/usr/bin/env node
/**
 * One pass over the real app, in the order the data demands:
 *   1. the flows that do not depend on a squad existing, ending with the one that creates it;
 *   2. the seed, which seats two addresses that really are stakers on Nimiq testnet;
 *   3. the flows about that squad, whose statuses are then live chain reads;
 *   4. the fixture stills.
 * Needs `pnpm dev` with DEV_HARNESS=1 on CAPTURE_URL and DATABASE_URL on the local database.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SHOTS } from './shots.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const node = (script, args = []) => new Promise((done, fail) => {
  const child = spawn(process.execPath, [resolve(HERE, script), ...args], { stdio: 'inherit' });
  child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`${script} exited ${code}`))));
});

const stills = SHOTS.filter((shot) => shot.still).map((shot) => shot.id);
await node('reset-db.mjs');
await node('capture-app.mjs', ['--only', 'app-welcome,app-my-squads,app-create']);
await node('seed-squad.mjs');
await node('capture-app.mjs', ['--only', 'app-invite,app-commit,app-squad,app-proof']);
await node('capture-app.mjs', ['--only', stills.join(',')]);
await node('prepare-assets.mjs');
