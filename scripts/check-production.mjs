import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Test the compiled artifact with hostile runtime switches, beyond a source-only gate test.
const port = '3197';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', port], {
  cwd: 'apps/web',
  env: { ...process.env, NODE_ENV: 'development', DEV_HARNESS: '1', VERCEL_ENV: 'development',
    APP_ORIGIN: 'https://squad.example', DATABASE_URL: 'postgresql://unused:unused@localhost:5432/squad_stake' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stdout.on('data', (data) => { output += data.toString(); });
server.stderr.on('data', (data) => { output += data.toString(); });
const base = `http://localhost:${port}`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Production server exited: ${output}`);
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch { /* Startup only. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready, `Production server did not start: ${output}`);
  assert.equal((await fetch(`${base}/scenes?as=alice&chain=mock`)).status, 404);
  assert.equal((await fetch(`${base}/api/dev/sign-in`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"identity":"alice"}',
  })).status, 404);
  for (const identity of ['alice', 'bob', 'carol']) {
    const html = await (await fetch(`${base}/?as=${identity}&chain=mock`)).text();
    assert.ok(!html.includes('DEV IDENTITY:'), 'Dev identity leaked into production');
    assert.ok(!html.includes('SYNTHETIC UI FIXTURE'), 'Gallery leaked into production');
  }
  console.log('Q16 production artifact refuses dev identities, mock switches and /scenes.');
} finally {
  server.kill('SIGTERM');
  if (server.exitCode === null) await once(server, 'exit');
}
