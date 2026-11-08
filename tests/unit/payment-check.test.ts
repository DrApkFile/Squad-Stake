import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FINALITY_CONFIRMATIONS } from '../../apps/web/src/config/constants';
import { checkPayment, paymentDataHex } from '../../apps/web/src/server/core/payment-check';
import { ADDRESSES, transaction } from '../support/squads';

const expected = { recipient: ADDRESSES.carol, shortId: 'q7m2bt4h', shareLuna: 200_000_000 };
/** `sq:q7m2bt4h` as the chain carries it: lower-case hex of the ASCII marker. */
const marker = paymentDataHex(expected.shortId);
const good = () => transaction({
  // Deliberately an address that is neither the payer's nor the squad's: Nimiq Pay pays from a
  // cosigned HTLC, so the sender of a real payment is not the member (AGENTS.md 7).
  from: ADDRESSES.bob,
  to: expected.recipient,
  value: expected.shareLuna,
  recipientData: marker,
  executionResult: true,
  blockNumber: 16_181_000,
  confirmations: FINALITY_CONFIRMATIONS,
});

test('Q15 a payment is verified without matching the sender', () => {
  assert.equal(marker, '73713a71376d3262743468');   // 'sq:q7m2bt4h' in ASCII
  const verdict = checkPayment(good(), expected);
  assert.ok(verdict.ok);
  assert.equal(verdict.valueLuna, expected.shareLuna);
  assert.equal(verdict.confirmations, FINALITY_CONFIRMATIONS);

  // Any sender at all, including the recipient itself or an address nobody has seen before,
  // settles the share just the same. This is the whole point: matching the sender would
  // reject every real Nimiq Pay payment.
  for (const from of [ADDRESSES.alice, ADDRESSES.carol, ADDRESSES.bob]) {
    assert.ok(checkPayment(transaction({ ...good(), from }), expected).ok, from);
  }
  // Overpaying still settles it; the share is a floor, not an invoice.
  assert.ok(checkPayment(transaction({ ...good(), value: expected.shareLuna + 1 }), expected).ok);
});

test('Q15 a wrong recipient, a short value or a missing marker is refused', () => {
  const refusals = [
    { patch: { to: ADDRESSES.alice }, code: 'WRONG_RECIPIENT' },
    { patch: { value: expected.shareLuna - 1 }, code: 'PAYMENT_SHORT' },
    { patch: { recipientData: '' }, code: 'PAYMENT_DATA_MISMATCH' },
    // Another squad's marker, and this squad's marker with anything appended.
    { patch: { recipientData: paymentDataHex('k3m9p2qr') }, code: 'PAYMENT_DATA_MISMATCH' },
    { patch: { recipientData: `${marker}21` }, code: 'PAYMENT_DATA_MISMATCH' },
    // Included but failed exists (NimJar, testnet 12 Sep 2026): never a settlement.
    { patch: { executionResult: false }, code: 'TX_FAILED' },
    { patch: { confirmations: FINALITY_CONFIRMATIONS - 1 }, code: 'TX_NOT_CONFIRMED' },
  ] as const;
  for (const { patch, code } of refusals) {
    const verdict = checkPayment(transaction({ ...good(), ...patch }), expected);
    assert.equal(verdict.ok, false, code);
    assert.ok(!verdict.ok && verdict.code === code, `${code} vs ${JSON.stringify(verdict)}`);
  }
});

test('Q15 a payment that is not yet final is not a failure, and the address form does not matter', () => {
  // No block number yet: in the mempool, which is "wait", never "no".
  const inMempool = { ...good(), confirmations: undefined, blockNumber: undefined };
  const verdict = checkPayment(transaction(inMempool), expected);
  assert.ok(!verdict.ok && verdict.code === 'TX_NOT_CONFIRMED');

  // The stored recipient is compared in its one canonical form, so spacing or case in the
  // database can never read as a different address.
  assert.ok(checkPayment(good(), { ...expected, recipient: expected.recipient.replace(/ /g, '') }).ok);
  assert.ok(checkPayment(good(), { ...expected, recipient: expected.recipient.toLowerCase() }).ok);
  // Hex arriving in upper case still matches the marker.
  assert.ok(checkPayment(transaction({ ...good(), recipientData: marker.toUpperCase() }), expected).ok);
});
