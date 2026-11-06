import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MINIMUM_STAKE_LUNA, STAKING_FEES_LUNA } from '../../apps/web/src/config/constants';
import { errors, providerErrorCode } from '../../apps/web/src/core/errors/catalog';
import { planStakingAction } from '../../apps/web/src/core/staking-actions';
import { sendStakingAction, type WalletAdapter } from '../../apps/web/src/wallet/staking';
import { ADDRESSES } from '../support/squads';

test('Q03 the staking plan asks for exactly the shortfall, the minimum stake and the right fee', () => {
  assert.deepEqual(planStakingAction({ activeBalanceLuna: 300_000_000, otherCommitmentsLuna: 0,
    amountLuna: 200_000_000, delegation: null }), { kind: 'none' });
  // Other squads' commitments are part of what the stake must cover.
  assert.deepEqual(planStakingAction({ activeBalanceLuna: 300_000_000, otherCommitmentsLuna: 250_000_000,
    amountLuna: 100_000_000, delegation: null }),
  { kind: 'add-stake', valueLuna: 50_000_000, feeLuna: STAKING_FEES_LUNA.add });
  // A first stake is raised to the protocol minimum and needs a validator.
  assert.deepEqual(planStakingAction({ activeBalanceLuna: null, otherCommitmentsLuna: 0,
    amountLuna: 1_000, delegation: ADDRESSES.bob }),
  { kind: 'create-staker', valueLuna: MINIMUM_STAKE_LUNA, feeLuna: STAKING_FEES_LUNA.create,
    delegation: ADDRESSES.bob });
  assert.deepEqual(planStakingAction({ activeBalanceLuna: null, otherCommitmentsLuna: 0,
    amountLuna: 200_000_000, delegation: ADDRESSES.bob }),
  { kind: 'create-staker', valueLuna: 200_000_000, feeLuna: STAKING_FEES_LUNA.create,
    delegation: ADDRESSES.bob });
  assert.deepEqual(planStakingAction({ activeBalanceLuna: null, otherCommitmentsLuna: 0,
    amountLuna: 200_000_000, delegation: null }), { kind: 'blocked', reason: 'NO_VALIDATOR' });
});

test('Q09 every documented NimiqProviderError type maps to a catalog entry', () => {
  const types = ['PERMISSION_DENIED', 'UNKNOWN_REQUEST', 'INVALID_TRANSACTION', 'INVALID_REQUEST',
    'NETWORK_ERROR', 'INTERNAL_ERROR', 'DUPLICATE_PAYMENT', 'TRANSACTION_OUTCOME_UNKNOWN',
    'UNKNOWN_ERROR', 'SOMETHING_THE_HOST_INVENTED'];
  for (const type of types) {
    const entry = errors[providerErrorCode(type)];
    assert.ok(entry, type);
    assert.ok(entry.message.length > 0 && entry.nextAction.length > 0, type);
  }
  // A declined approval is a normal, retryable outcome that changed nothing.
  assert.equal(providerErrorCode('PERMISSION_DENIED'), 'TX_DECLINED');
  assert.equal(errors.TX_DECLINED.changedAnything, false);
  assert.equal(errors.TX_DECLINED.retryable, true);
  // An unmapped failure must never claim nothing happened.
  assert.equal(providerErrorCode('SOMETHING_THE_HOST_INVENTED'), 'TX_OUTCOME_UNKNOWN');
  assert.equal(errors.TX_OUTCOME_UNKNOWN.changedAnything, true);
  assert.equal(errors.TX_OUTCOME_UNKNOWN.retryable, false);
});

function adapter(calls: unknown[], release: Promise<void>): WalletAdapter {
  return {
    async connect() {
      return { ok: true, provider: {
        async sendNewStakerTransaction(transaction) { calls.push(transaction); await release; return 'a'.repeat(64); },
        async sendStakeTransaction(transaction) { calls.push(transaction); await release; return 'b'.repeat(64); },
      } };
    },
    errorCode: () => null,
  };
}

test('Q13 a second tap while a wallet call is pending makes no second provider call', async () => {
  const calls: unknown[] = [];
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  const action = { kind: 'add-stake' as const, valueLuna: 50_000_000, feeLuna: STAKING_FEES_LUNA.add };

  const first = sendStakingAction(action, adapter(calls, held));
  const second = await sendStakingAction(action, adapter(calls, held));
  assert.ok(!second.ok);
  assert.equal(second.code, 'TX_PENDING');
  assert.equal(calls.length, 1);

  release();
  const result = await first;
  assert.ok(result.ok);
  assert.equal(result.hash, 'b'.repeat(64));
  assert.deepEqual(calls, [{ value: 50_000_000, fee: STAKING_FEES_LUNA.add }]);

  // The guard clears only when the call settles, so a new tap can send again.
  const third = await sendStakingAction(action, adapter(calls, Promise.resolve()));
  assert.ok(third.ok);
  assert.equal(calls.length, 2);
});

test('Q13 a wallet failure is mapped, not retried, and create-staker sends its delegation', async () => {
  const calls: unknown[] = [];
  const failing: WalletAdapter = {
    async connect() {
      return { ok: true, provider: {
        async sendNewStakerTransaction(transaction) { calls.push(transaction); throw new Error('declined'); },
        async sendStakeTransaction() { throw new Error('unused'); },
      } };
    },
    errorCode: () => 'TX_DECLINED',
  };
  const result = await sendStakingAction({ kind: 'create-staker', valueLuna: MINIMUM_STAKE_LUNA,
    feeLuna: STAKING_FEES_LUNA.create, delegation: ADDRESSES.bob }, failing);
  assert.ok(!result.ok);
  assert.equal(result.code, 'TX_DECLINED');
  assert.deepEqual(calls, [{ delegation: ADDRESSES.bob, value: MINIMUM_STAKE_LUNA,
    fee: STAKING_FEES_LUNA.create }]);

  // Outside Nimiq Pay, or on the wrong network, nothing is sent at all.
  const blocked = await sendStakingAction({ kind: 'add-stake', valueLuna: 1, feeLuna: 200 }, {
    async connect() { return { ok: false, code: 'WRONG_NETWORK' }; }, errorCode: () => null });
  assert.ok(!blocked.ok);
  assert.equal(blocked.code, 'WRONG_NETWORK');
});
