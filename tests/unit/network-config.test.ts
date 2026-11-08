import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { NETWORKS, isNetwork, networkConfig } from '../../apps/web/src/config/network';

test('two deployments: every network-specific value comes from one switch', () => {
  const mainnet = networkConfig('mainnet');
  const testnet = networkConfig('testnet');
  // Three values differ, and none of them is shared between the two chains.
  for (const key of ['rpcUrl', 'explorerBase', 'validatorsApi'] as const) {
    assert.notEqual(mainnet[key], testnet[key], key);
  }
  assert.equal(mainnet.rpcUrl, 'https://rpc.nimiqwatch.com');
  assert.equal(testnet.rpcUrl, 'https://rpc.testnet.nimiqwatch.com');
  assert.equal(mainnet.explorerBase, 'https://nimiq.watch/#');
  assert.equal(testnet.explorerBase, 'https://test.nimiq.watch/#');
  // Nimiq's own Validators API hosts, as its README names them.
  assert.match(mainnet.validatorsApi, /^https:\/\/validators-api-main\..+\/api\/v1\/validators$/);
  assert.match(testnet.validatorsApi, /^https:\/\/validators-api-test\..+\/api\/v1\/validators$/);
  for (const config of [mainnet, testnet]) {
    for (const value of Object.values(config)) assert.match(value, /^https:\/\//);
  }
  // An unset or misspelt variable can never point a deployment at mainnet.
  for (const unset of [undefined, '', 'MAINNET', 'main', 'devnet', 'testnet ']) {
    assert.deepEqual(networkConfig(unset), testnet, JSON.stringify(unset));
  }
  assert.deepEqual([...NETWORKS], ['mainnet', 'testnet']);
  assert.equal(isNetwork('mainnet'), true);
  assert.equal(isNetwork('main'), false);
  assert.equal(isNetwork(undefined), false);
});

/** Every `.ts`/`.tsx` file under a directory. */
function sources(dir: string): readonly string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

test('two deployments: no chain endpoint is hardcoded outside that switch', () => {
  // The guard behind the README's "Deploy" section: a testnet URL left in a mainnet build
  // would show a member the other chain's answer and call it proof.
  const root = new URL('../../apps/web/', import.meta.url).pathname;
  const allowed = new Set([join(root, 'src/config/network.ts')]);
  const offenders: string[] = [];
  for (const file of [...sources(join(root, 'app')), ...sources(join(root, 'src'))]) {
    if (allowed.has(file)) continue;
    const text = readFileSync(file, 'utf8');
    // Comments may record where a recording came from; code may not name an endpoint.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/nimiqwatch\.com|nimiq\.watch|validators-api-(main|test)/.test(code)) {
      offenders.push(file.slice(root.length));
    }
  }
  assert.deepEqual(offenders, []);
  // And the host guard that blocks actions reads the same public variable.
  const guard = readFileSync(join(root, 'src/wallet/network.ts'), 'utf8');
  assert.match(guard, /process\.env\.NEXT_PUBLIC_NIMIQ_NETWORK/);
  assert.match(guard, /window\.nimiqPay\.network !== appNetwork\(\)/);
});
