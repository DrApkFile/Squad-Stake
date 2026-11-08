import { FINALITY_CONFIRMATIONS } from '../../config/constants';
import { paymentData } from '../../core/staking-actions';
import type { ChainTransaction } from './chain';

/**
 * PRD §7.6 / Q15. Decides whether one transaction on the chain settles one member's share.
 *
 * **The sender is never looked at.** Nimiq Pay pays from a cosigned HTLC, so the `from`
 * address of a member's payment is not the member's address and matching it would reject every
 * real payment (AGENTS.md 7, BUILD_CONTRACT "Never: match a payment's sender"). What ties the
 * payment to a member is the hash they recorded in `tracked_txs`; what ties it to the squad is
 * the public `sq:<short_id>` marker in the transaction's data.
 *
 * Pure: the transaction comes in, already parsed by the strict wire schema.
 */
export type PaymentFailure = 'WRONG_RECIPIENT' | 'PAYMENT_DATA_MISMATCH' | 'PAYMENT_SHORT'
  | 'TX_FAILED' | 'TX_NOT_CONFIRMED';
export type PaymentVerdict =
  | { ok: true; valueLuna: number; blockNumber: number; confirmations: number }
  | { ok: false; code: PaymentFailure };

export interface PaymentExpectation {
  /** Fixed when the squad was created and visible to everyone; never taken from a client. */
  recipient: string;
  /** The squad's short id, which is what `sq:<short_id>` carries. */
  shortId: string;
  /** The member's own commitment (PRD §5 "Commitment"), which is their share. */
  shareLuna: number;
}

/** Nimiq addresses are compared in their one canonical form: upper case, four-character
 * groups. The wire schema already produces that shape; a stored value is re-normalised here
 * so a stray space can never read as a different recipient. */
function sameAddress(left: string, right: string) {
  const canonical = (value: string) => value.replace(/\s+/g, '').toUpperCase();
  return canonical(left) === canonical(right);
}

/**
 * `recipientData` crosses the wire as lower-case hex (rpc-schemas.ts), while the provider is
 * given the marker as text (`data: 'sq:<short_id>'`). Encoding here rather than decoding the
 * chain's bytes means an undecodable or padded payload simply fails to match, instead of
 * needing its own error path: `sq:` and a short id are ASCII by construction.
 */
export function paymentDataHex(shortId: string) {
  return [...paymentData(shortId)]
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

export function checkPayment(
  transaction: ChainTransaction, expected: PaymentExpectation,
): PaymentVerdict {
  if (!sameAddress(transaction.to, expected.recipient)) return { ok: false, code: 'WRONG_RECIPIENT' };
  // Exactly the marker, not merely starting with it: a longer payload is a different payment.
  if (transaction.recipientData.toLowerCase() !== paymentDataHex(expected.shortId)) {
    return { ok: false, code: 'PAYMENT_DATA_MISMATCH' };
  }
  // At least the share: overpaying is the member's business, underpaying is not a settlement.
  if (transaction.value < expected.shareLuna) return { ok: false, code: 'PAYMENT_SHORT' };
  // Included-but-failed exists (NimJar, testnet 12 Sep 2026): a hash is not success.
  if (!transaction.executionResult) return { ok: false, code: 'TX_FAILED' };
  const confirmations = transaction.confirmations ?? 0;
  if (transaction.blockNumber === undefined || confirmations < FINALITY_CONFIRMATIONS) {
    return { ok: false, code: 'TX_NOT_CONFIRMED' };
  }
  return { ok: true, valueLuna: transaction.value, blockNumber: transaction.blockNumber, confirmations };
}
