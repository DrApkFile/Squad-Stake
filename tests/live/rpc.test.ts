import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRpcClient } from '../../apps/web/src/server/lib/rpc';
import { calculateRelease } from '../../apps/web/src/server/core/release';
import { deriveMemberStatus } from '../../apps/web/src/server/core/member-status';
import { chooseValidator } from '../../apps/web/src/server/core/validator-choice';
import { recorded } from '../support/rpc';

test('Q04–Q07 live testnet RPC reads the spike staker and all nine allowed methods', {
  skip: process.env.LIVE_RPC !== '1', timeout: 40_000,
}, async () => {
  const rpc = createRpcClient({ url: 'https://rpc.testnet.nimiqwatch.com' });
  const head = await rpc.getBlockNumber();
  assert.ok(head.ok, JSON.stringify(head));
  const result = await rpc.getStakerByAddress('NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD 83R7', { fresh: true });
  assert.ok(result.ok && result.data.status === 'STAKING', JSON.stringify(result));
  const staker = result.data.staker;
  assert.ok(result.readAt <= Date.now() && result.readAt >= Date.now() - 5000);
  assert.deepEqual(deriveMemberStatus({ staker, commitments: [staker.balance], headBlock: head.data, releaseBlock: null }), { status: 'BACKED' });
  assert.ok(staker.delegation);
  const validator = await rpc.getValidatorByAddress(staker.delegation);
  assert.ok(validator.ok, JSON.stringify(validator));
  const release = await calculateRelease({ inclusionBlock: head.data, headBlock: head.data, validator: validator.data }, { rpc, now: Date.now });
  assert.ok(release.ok, JSON.stringify(release));
  assert.ok(release.releaseBlock > head.data);
  const jail = await rpc.getBlockAfterJail(head.data);
  assert.ok(jail.ok && jail.data > head.data, JSON.stringify(jail));
  const missing = await rpc.getStakerByAddress('NQ77 0000 0000 0000 0000 0000 0000 0000 0001');
  assert.ok(missing.ok && missing.data.status === 'NOT_STAKING', JSON.stringify(missing));
  const tx = await rpc.getTransactionByHash(recorded.transaction.response.result.data.hash);
  assert.ok(tx.ok, JSON.stringify(tx));
  assert.equal(typeof tx.data.executionResult, 'boolean');
  const page = await rpc.getTransactionsByAddress(staker.address, 2);
  assert.ok(page.ok, JSON.stringify(page));
  assert.equal(page.metadata, null);
  assert.ok(page.data.length > 0 && page.data.length <= 2);
  assert.ok(page.data.every((entry) => entry.relatedAddresses.includes(staker.address)));
  const validators = await rpc.getActiveValidators();
  assert.ok(validators.ok, JSON.stringify(validators));
  assert.ok(validators.data.length > 0);
  const chosen = chooseValidator(validators.data, new Map());
  assert.ok(chosen, 'at least one active validator must be eligible');
  console.log(JSON.stringify({ head: head.data, address: staker.address, readAt: result.readAt,
    validator: validator.data.address, jailedFrom: validator.data.jailedFrom,
    releaseBlock: release.releaseBlock, transaction: tx.data.hash,
    page: page.data.map((entry) => entry.hash),
    activeValidators: validators.data.length, chosenValidator: chosen }));
});
