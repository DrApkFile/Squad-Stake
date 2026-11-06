import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRpcClient } from '../../apps/web/src/server/lib/rpc';
import { address, fixtureFetch, recorded } from '../support/rpc';

test('Q04 unknown fields, missing metadata, unsafe or fractional luna and mismatched ids fail closed', async () => {
  const original = recorded.staker.response;
  const data = original.result.data;
  for (const response of [
    { ...original, injected: true },
    { ...original, result: { ...original.result, extra: true } },
    { ...original, result: { data } },
    { ...original, result: { ...original.result, metadata: { ...original.result.metadata, extra: true } } },
    ...[{ extra: true }, { balance: -1 }, { balance: 0.5 }, { balance: Number.MAX_SAFE_INTEGER + 1 }, { inactiveFrom: -1 }]
      .map((patch) => ({ ...original, result: { ...original.result, data: { ...data, ...patch } } })),
  ]) {
    const rpc = createRpcClient({ url: 'https://rpc.invalid', fetch: fixtureFetch({ response }) });
    assert.deepEqual(await rpc.getStakerByAddress(address), { ok: false, code: 'INVALID_RESPONSE' });
  }
  const wrongId = createRpcClient({ url: 'https://rpc.invalid', fetch: async () => Response.json(original) });
  assert.deepEqual(await wrongId.getStakerByAddress(address), { ok: false, code: 'INVALID_RESPONSE' });
});

test('Q05 HTTP, malformed JSON, and other JSON-RPC errors never become NOT_STAKING', async () => {
  const error = recorded.notStaking.response.error;
  for (const fetcher of [
    async () => new Response('unavailable', { status: 503 }),
    async () => new Response('{'),
    fixtureFetch({ response: { ...recorded.notStaking.response, error: { ...error, code: -32602 } } }),
    fixtureFetch({ response: { ...recorded.notStaking.response, error: { ...error, message: 'Node unavailable' } } }),
  ]) {
    const rpc = createRpcClient({ url: 'https://rpc.invalid', fetch: fetcher });
    assert.equal((await rpc.getStakerByAddress(address)).ok, false);
  }
});

test('Q07 validator schema rejects guessed jail names; failed execution remains false', async () => {
  const original = recorded.validator.response;
  const { jailedFrom: _jailedFrom, ...data } = original.result.data;
  assert.equal(_jailedFrom, null);
  const malformed = { ...original, result: { ...original.result, data: { ...data, isJailed: true } } };
  const rpc = createRpcClient({ url: 'https://rpc.invalid', fetch: fixtureFetch({ response: malformed }) });
  assert.deepEqual(await rpc.getValidatorByAddress(data.address), { ok: false, code: 'INVALID_RESPONSE' });
  const tx = recorded.transaction.response;
  const failed = createRpcClient({ url: 'https://rpc.invalid', fetch: fixtureFetch({ response: {
    ...tx, result: { ...tx.result, data: { ...tx.result.data, executionResult: false } },
  } }) });
  const result = await failed.getTransactionByHash(tx.result.data.hash);
  assert.ok(result.ok);
  assert.equal(result.data.executionResult, false);
});

test('Q04 invalid address, hash and policy inputs never reach the network', async () => {
  const rpc = createRpcClient({ url: 'https://rpc.invalid', fetch: async () => { assert.fail('must not fetch'); } });
  for (const result of await Promise.all([
    rpc.getStakerByAddress('bad'), rpc.getValidatorByAddress('bad'), rpc.getTransactionByHash('bad'),
    rpc.getElectionBlockAfter(-1), rpc.getBlockAfterReportingWindow(0.5), rpc.getBlockAfterJail(NaN),
  ])) assert.deepEqual(result, { ok: false, code: 'INVALID_INPUT' });
});
