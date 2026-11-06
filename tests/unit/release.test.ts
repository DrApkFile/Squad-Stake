import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateRelease, blocksToMilliseconds } from '../../apps/web/src/server/core/release';
import type { ReleaseRpc } from '../../apps/web/src/server/core/chain';
import { recorded, readAt, success } from '../support/rpc';

const headBlock = recorded.head.response.result.data;
const election = recorded.election.response.result.data;
const windowBlock = recorded.window.response.result.data;
const jailBlock = recorded.jail.response.result.data;
const validator = recorded.validator.response.result.data;

function harness(afterJail = jailBlock) {
  const calls: [string, number][] = [];
  const rpc: ReleaseRpc = {
    getElectionBlockAfter: async (b: number) => { calls.push(['election', b]); return success(election); },
    getBlockAfterReportingWindow: async (b: number) => { calls.push(['window', b]); return success(windowBlock); },
    getBlockAfterJail: async (b: number) => { calls.push(['jail', b]); return success(afterJail); },
  };
  return { calls, rpc, now: () => readAt };
}

test('Q06 release counts the reporting window from the next election, not the inclusion block', async () => {
  const h = harness();
  const result = await calculateRelease({ inclusionBlock: headBlock, headBlock, validator }, h);
  assert.deepEqual(h.calls, [['election', headBlock], ['window', election]]);
  assert.deepEqual(result, { ok: true, releaseBlock: windowBlock, remainingBlocks: windowBlock - headBlock,
    estimatedReleaseAt: readAt + (windowBlock - headBlock) * 1000, jailed: false });
  assert.equal(blocksToMilliseconds(1), 1000);
  const released = await calculateRelease({ inclusionBlock: headBlock, headBlock: windowBlock + 1, validator: null }, h);
  assert.ok(released.ok);
  assert.equal(released.remainingBlocks, 0);
  assert.equal(released.estimatedReleaseAt, readAt);
});

test('Q07 jail extends release only when later and uses jailedFrom, including zero', async () => {
  for (const [jailedFrom, afterJail] of [[headBlock, jailBlock], [0, windowBlock - 1], [headBlock, windowBlock]] as const) {
    const h = harness(afterJail);
    const result = await calculateRelease({ inclusionBlock: headBlock, headBlock, validator: { ...validator, jailedFrom } }, h);
    assert.ok(result.ok);
    assert.equal(result.releaseBlock, Math.max(windowBlock, afterJail));
    assert.equal(result.jailed, true);
    assert.deepEqual(h.calls, [['election', headBlock], ['window', election], ['jail', jailedFrom]]);
  }
});

test('Q06 Q07 RPC failures cannot produce an estimated release', async () => {
  for (const method of ['getElectionBlockAfter', 'getBlockAfterReportingWindow', 'getBlockAfterJail'] as const) {
    const h = harness();
    h.rpc[method] = async () => ({ ok: false, code: 'TIMEOUT' });
    const result = await calculateRelease({ inclusionBlock: headBlock, headBlock, validator: { ...validator, jailedFrom: headBlock } }, h);
    assert.deepEqual(result, { ok: false, code: 'TIMEOUT' });
  }
});
