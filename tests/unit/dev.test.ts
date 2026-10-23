import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../../apps/web/src/dev/is-dev-server.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
interface GateModule {
  isDevServer(): boolean;
  devOptions(query: URLSearchParams): { identity: string | null; mockChain: boolean };
}
function loadGate(env: Record<string, string>) {
  const exports = {} as GateModule;
  runInNewContext(compiled, { exports, process: { env } });
  return exports;
}

test('Q16 dev identities, mock switch and scene gate require a development build AND explicit opt-in', () => {
  for (const mode of ['development', 'production', 'test']) {
    for (const enabled of ['0', '1']) {
      for (const deployment of ['development', 'production']) {
        const gate = loadGate({ NODE_ENV: mode, DEV_HARNESS: enabled, VERCEL_ENV: deployment });
        const expected = mode === 'development' && enabled === '1' && deployment !== 'production';
        assert.equal(gate.isDevServer(), expected);
        const result = gate.devOptions(new URLSearchParams('as=alice&chain=mock'));
        assert.equal(result.identity, expected ? 'alice' : null);
        assert.equal(result.mockChain, expected);
      }
    }
  }
});

test('Q16 a gate loaded in production stays closed when runtime variables change', () => {
  const env = { NODE_ENV: 'production', DEV_HARNESS: '0', VERCEL_ENV: 'production' };
  const gate = loadGate(env);
  Object.assign(env, { NODE_ENV: 'development', DEV_HARNESS: '1', VERCEL_ENV: 'development' });
  assert.equal(gate.isDevServer(), false);
  assert.equal(gate.devOptions(new URLSearchParams('as=carol&chain=mock')).mockChain, false);
});
