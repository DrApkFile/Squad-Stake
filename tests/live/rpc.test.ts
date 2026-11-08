import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRpcClient } from '../../apps/web/src/server/lib/rpc';
import { calculateRelease } from '../../apps/web/src/server/core/release';
import { deriveMemberStatus } from '../../apps/web/src/server/core/member-status';
import { chooseValidator } from '../../apps/web/src/server/core/validator-choice';
import { checkPayment, paymentDataHex } from '../../apps/web/src/server/core/payment-check';
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
  // Q06 against live data: release counted from a real inclusion block, not from the head.
  assert.ok(tx.data.blockNumber !== undefined, 'the recorded transaction must be included');
  const fromInclusion = await calculateRelease(
    { inclusionBlock: tx.data.blockNumber, headBlock: head.data, validator: validator.data },
    { rpc, now: Date.now });
  assert.ok(fromInclusion.ok, JSON.stringify(fromInclusion));
  assert.ok(fromInclusion.releaseBlock > tx.data.blockNumber);
  // Q07: whatever the validator's jail state is today, the derivation agrees with it. A jailed
  // one releases no earlier than after-jail; an unjailed one is the reporting-window block.
  assert.equal(fromInclusion.jailed, validator.data.jailedFrom !== null);
  if (validator.data.jailedFrom !== null) {
    const afterJail = await rpc.getBlockAfterJail(validator.data.jailedFrom);
    assert.ok(afterJail.ok && fromInclusion.releaseBlock >= afterJail.data);
  }

  // Q15 against a real wire envelope: every field the §7.6 check reads is present on a
  // transaction the node returned, and a real transfer with no squad marker is refused on
  // exactly that ground — not on its sender, which is never looked at.
  assert.equal(typeof tx.data.to, 'string');
  assert.equal(typeof tx.data.value, 'number');
  assert.equal(typeof tx.data.recipientData, 'string');
  const verdict = checkPayment(tx.data,
    { recipient: tx.data.to, shortId: 'k3m9p2qr', shareLuna: tx.data.value });
  assert.ok(!verdict.ok && verdict.code === 'PAYMENT_DATA_MISMATCH', JSON.stringify(verdict));
  assert.notEqual(tx.data.recipientData.toLowerCase(), paymentDataHex('k3m9p2qr'));

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
    inclusionBlock: tx.data.blockNumber, releaseFromInclusion: fromInclusion.releaseBlock,
    paymentVerdict: verdict.ok ? 'ok' : verdict.code,
    page: page.data.map((entry) => entry.hash),
    activeValidators: validators.data.length, chosenValidator: chosen }));
});
