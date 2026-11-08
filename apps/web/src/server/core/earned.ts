import type { TxKind, TxState } from '../../core/squad-contract';
import type { PayoutType } from '../lib/pool-directory';

/**
 * PRD §9.12 / spike S4b — "earned since joining", per member.
 *
 * A reward is not a line item anywhere on the chain: nothing in a staker record says how much
 * of the balance was earned. So this module measures it only when it can be derived exactly,
 * and otherwise names the reason it cannot. There is no estimate branch, by design
 * (AGENTS.md "Never fabricate"; BUILD_CONTRACT "Never … invent a number").
 *
 * The two pool kinds are measured differently because they pay differently
 * (`server/utils/types.ts` `PayoutType`, quoted in `lib/pool-directory.ts`):
 *   * `restake` — rewards are added to the stake, so growth is visible in the active balance:
 *     earned = active balance now − every deposit this app watched land.
 *   * `direct` — rewards leave the staking contract and arrive as ordinary transfers, so they
 *     can only be identified by the address they came from. Nimiq's validator data publishes
 *     no payout address (verified 2026-11-08, see pool-directory.ts), so in practice this
 *     branch answers PAYOUT_ADDRESS_UNKNOWN; it is written out because the one thing that
 *     would make it computable is a pool publishing that address.
 *
 * This is a pure function: balances, transactions and pool facts come in as data.
 */
export type EarnedReason =
  | 'NOT_STAKING'
  | 'NO_POOL_DATA'
  | 'PAYOUT_ADDRESS_UNKNOWN'
  | 'PAYS_NOTHING'
  | 'OUTSIDE_STAKE'
  | 'UNTRACKED_DEPOSIT'
  | 'LEAVING'
  | 'CHAIN_UNAVAILABLE';

export type EarnedBasis =
  | { kind: 'restake'; depositsLuna: number }
  | { kind: 'direct'; payouts: number };

export type EarnedResult =
  | { known: true; luna: number; basis: EarnedBasis }
  | { known: false; reason: EarnedReason };

export interface EarnedTx { kind: TxKind; state: TxState; valueLuna: number }
export interface EarnedInput {
  /** False when the chain read for this member failed: an outage is not a measurement. */
  chainRead: boolean;
  /** Null when the address has no staker record. */
  stake: { activeLuna: number } | null;
  /** The pool this member's stake is delegated to, or null when it is not in Nimiq's data. */
  pool: { payout: PayoutType; payoutAddress: string | null } | null;
  /** Every staking transaction this app has tracked for this address, in any squad: deposits
   * are what must be subtracted, and a leaving transaction means the balance no longer holds
   * the whole story. */
  txs: readonly EarnedTx[];
  /** Transfers received from the pool's payout address since this member joined. Null when
   * they could not be listed. Only read for a `direct` pool. */
  payouts: readonly { valueLuna: number }[] | null;
}

const DEPOSIT_KINDS: readonly TxKind[] = ['create', 'add'];
const LEAVING_KINDS: readonly TxKind[] = ['unstake', 'retire', 'remove'];

export function earnedSinceJoining(input: EarnedInput): EarnedResult {
  if (!input.chainRead) return { known: false, reason: 'CHAIN_UNAVAILABLE' };
  if (input.stake === null) return { known: false, reason: 'NOT_STAKING' };
  if (input.pool === null) return { known: false, reason: 'NO_POOL_DATA' };
  if (input.pool.payout === 'none') return { known: false, reason: 'PAYS_NOTHING' };

  if (input.pool.payout === 'direct') {
    if (input.pool.payoutAddress === null) {
      return { known: false, reason: 'PAYOUT_ADDRESS_UNKNOWN' };
    }
    if (input.payouts === null) return { known: false, reason: 'CHAIN_UNAVAILABLE' };
    const luna = input.payouts.reduce((total, payout) => total + payout.valueLuna, 0);
    return { known: true, luna, basis: { kind: 'direct', payouts: input.payouts.length } };
  }

  const deposits = input.txs.filter((tx) => DEPOSIT_KINDS.includes(tx.kind));
  // A deposit with no verdict may or may not have landed, so the sum is not exact. A hash is
  // not success and a hash is not failure either (Q10): only INCLUDED_FAILED can be ignored.
  if (deposits.some((tx) => tx.state === 'SUBMITTED' || tx.state === 'UNKNOWN')) {
    return { known: false, reason: 'UNTRACKED_DEPOSIT' };
  }
  // Once any stake has been set inactive, retired or removed, the active balance is no longer
  // "deposits plus rewards", so the subtraction below would understate or invent growth.
  if (input.txs.some((tx) => LEAVING_KINDS.includes(tx.kind) && tx.state !== 'INCLUDED_FAILED')) {
    return { known: false, reason: 'LEAVING' };
  }
  const landed = deposits.filter((tx) => tx.state === 'INCLUDED_OK');
  // Without the transaction that created this staker, the balance it started from is unknown,
  // so growth cannot be separated from a deposit made elsewhere.
  if (!landed.some((tx) => tx.kind === 'create')) {
    return { known: false, reason: 'OUTSIDE_STAKE' };
  }
  const depositsLuna = landed.reduce((total, tx) => total + tx.valueLuna, 0);
  const luna = input.stake.activeLuna - depositsLuna;
  // Less active stake than was deposited means something this app did not watch moved it.
  if (luna < 0) return { known: false, reason: 'OUTSIDE_STAKE' };
  return { known: true, luna, basis: { kind: 'restake', depositsLuna } };
}
