import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRpcClient } from '../../apps/web/src/server/lib/rpc';
import { RPC_TIMEOUT_MS } from '../../apps/web/src/server/lib/rpc-transport';
import { address, fixtureFetch, readAt, recorded } from '../support/rpc';

test('Q04 Q06 Q07 all nine RPC methods parse recorded envelopes with exact positional signatures', async () => {
  const calls: unknown[] = [];
  const records = Object.values(recorded);
  const rpc = createRpcClient({ url: 'https://rpc.invalid', now: () => readAt, fetch: async (url, init) => {
    const request: unknown = JSON.parse(String(init?.body));
    assert.ok(typeof request === 'object' && request !== null && 'method' in request && 'params' in request);
    calls.push([request.method, request.params]);
    const record = records.find((r) => r.method === request.method);
    assert.ok(record);
    assert.equal(init?.cache, 'no-store');
    assert.ok(init.signal);
    return fixtureFetch(record)(url, init);
  } });
  const head = await rpc.getBlockNumber();
  assert.ok(head.ok);
  assert.equal(head.data, recorded.head.response.result.data);
  assert.equal(head.readAt, readAt);
  const staker = await rpc.getStakerByAddress(address);
  assert.ok(staker.ok && staker.data.status === 'STAKING');
  assert.deepEqual(staker.data.staker, recorded.staker.response.result.data);
  assert.deepEqual(staker.metadata, recorded.staker.response.result.metadata);
  const election = await rpc.getElectionBlockAfter(head.data);
  assert.ok(election.ok);
  assert.ok((await rpc.getBlockAfterReportingWindow(election.data)).ok);
  assert.ok((await rpc.getBlockAfterJail(head.data)).ok);
  const validator = await rpc.getValidatorByAddress(staker.data.staker.delegation ?? '');
  assert.ok(validator.ok);
  assert.deepEqual(validator.data, recorded.validator.response.result.data);
  const tx = await rpc.getTransactionByHash(recorded.transaction.params[0] ?? '');
  assert.ok(tx.ok);
  assert.deepEqual(tx.data, recorded.transaction.response.result.data);
  const [, max] = recorded.transactions.params;
  const page = await rpc.getTransactionsByAddress(address, typeof max === 'number' ? max : 0);
  assert.ok(page.ok);
  assert.deepEqual(page.data, recorded.transactions.response.result.data);
  assert.equal(page.metadata, null);
  // §7.7: the active set comes back with chain metadata, so a null-metadata envelope
  // would be refused — the live testnet read proved this on 2026-11-06.
  const validators = await rpc.getActiveValidators();
  assert.ok(validators.ok);
  assert.deepEqual(validators.data, recorded.validators.response.result.data);
  assert.deepEqual(validators.metadata, recorded.validators.response.result.metadata);
  assert.deepEqual(calls, ['head', 'staker', 'election', 'window', 'jail', 'validator', 'transaction', 'transactions', 'validators'].map((name) => {
    const record = recorded[name as keyof typeof recorded];
    return [record.method, record.params];
  }));
});

test('Q05 only the staker Internal error maps to a timestamped cached NOT_STAKING', async () => {
  let count = 0;
  const rpc = createRpcClient({ url: 'https://rpc.invalid', now: () => readAt, fetch: async (url, init) => {
    count++;
    return fixtureFetch(recorded.notStaking)(url, init);
  } });
  assert.deepEqual(await rpc.getStakerByAddress(address), { ok: true, data: { status: 'NOT_STAKING' }, metadata: null, readAt });
  await rpc.getStakerByAddress(address);
  assert.equal(count, 1);
  const validator = await rpc.getValidatorByAddress(address);
  assert.ok(!validator.ok);
  assert.equal(validator.code, 'RPC_ERROR');
});

test('Q04 address caches expire at 60 seconds, normalize keys, and support fresh reads', async () => {
  let now = readAt;
  let count = 0;
  let offline = false;
  const rpc = createRpcClient({ url: 'https://rpc.invalid', now: () => now, fetch: async (url, init) => {
    count++;
    if (offline) throw new Error('offline');
    return fixtureFetch(recorded.staker)(url, init);
  } });
  const first = await rpc.getStakerByAddress(address);
  now += 59_999;
  assert.deepEqual(await rpc.getStakerByAddress(address.replaceAll(' ', '').toLowerCase()), first);
  assert.equal(count, 1);
  now++;
  const refreshed = await rpc.getStakerByAddress(address);
  assert.ok(refreshed.ok);
  assert.equal(refreshed.readAt, now);
  assert.equal(count, 2);
  await rpc.getStakerByAddress(address, { fresh: true });
  assert.equal(count, 3);
  now += 60_000;
  offline = true;
  const failed = await rpc.getStakerByAddress(address);
  assert.ok(!failed.ok);
  assert.equal(failed.code, 'NETWORK_ERROR');
  assert.equal(failed.lastKnown?.readAt, refreshed.readAt);
  await rpc.getStakerByAddress(address);
  assert.equal(count, 5); // A failure neither extends the TTL nor poisons the cache.
});

test('Q04 transaction pages send an explicit null start hash and cache per page, not per address', async () => {
  const calls: unknown[] = [];
  const hash = recorded.transaction.response.result.data.hash;
  const rpc = createRpcClient({ url: 'https://rpc.invalid', now: () => readAt, fetch: async (url, init) => {
    const request: unknown = JSON.parse(String(init?.body));
    assert.ok(typeof request === 'object' && request !== null && 'params' in request);
    calls.push(request.params);
    return fixtureFetch(recorded.transactions)(url, init);
  } });
  const first = await rpc.getTransactionsByAddress(address, 2);
  assert.ok(first.ok);
  assert.equal(first.readAt, readAt);
  assert.deepEqual(await rpc.getTransactionsByAddress(address, 2), first);
  // A different page size or start hash is a different read and must not reuse the entry.
  assert.ok((await rpc.getTransactionsByAddress(address, 3)).ok);
  assert.ok((await rpc.getTransactionsByAddress(address, 2, hash)).ok);
  assert.deepEqual(calls, [[address, 2, null], [address, 3, null], [address, 2, hash]]);
  await rpc.getTransactionsByAddress(address, 2, null, { fresh: true });
  assert.deepEqual(calls.at(-1), [address, 2, null]);
  assert.equal(calls.length, 4);
});

test('Q04 caches are isolated by address and client endpoint', async () => {
  let count = 0;
  const fetcher: typeof fetch = async (url, init) => { count++; return fixtureFetch(recorded.staker)(url, init); };
  const a = createRpcClient({ url: 'https://a.invalid', fetch: fetcher });
  const b = createRpcClient({ url: 'https://b.invalid', fetch: fetcher });
  await a.getStakerByAddress(address);
  await b.getStakerByAddress(address);
  const other = await a.getStakerByAddress(recorded.validator.response.result.data.address);
  assert.ok(!other.ok && other.code === 'INVALID_RESPONSE');
  assert.equal(count, 3);
});

test('Q04 slow RPC calls abort after five seconds and cannot return success', { timeout: 8000 }, async () => {
  const started = performance.now();
  const rpc = createRpcClient({ url: 'https://rpc.invalid', fetch: async (_url, init) => {
    return new Promise((_resolve, reject) => {
      const keepAlive = setTimeout(() => reject(new Error('did not abort')), 6500);
      init?.signal?.addEventListener('abort', () => { clearTimeout(keepAlive); reject(new Error('aborted')); }, { once: true });
    });
  } });
  assert.deepEqual(await rpc.getBlockNumber(), { ok: false, code: 'TIMEOUT' });
  assert.ok(performance.now() - started >= RPC_TIMEOUT_MS - 20);
});
