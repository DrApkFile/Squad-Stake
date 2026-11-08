import type { EarnedInput, EarnedResult, EarnedTx } from './earned';
import { earnedSinceJoining } from './earned';
import type { PayoutType } from '../lib/pool-directory';

/**
 * PRD §9.12 — assembles the facts `earnedSinceJoining` needs for one member, with the chain,
 * the pool directory and the store injected. Kept beside the pure core so `squad-detail.ts`
 * stays about statuses.
 *
 * **Only ever called for the member looking at the page.** Earned growth is a balance in
 * disguise: with the deposits it was measured against, `active balance = deposits + earned`.
 * Another member's balance never leaves the server (briefing/FAILURE_MODES.md, "Privacy"),
 * which is the same reason `SHORT.shortBy` is masked, so every other row gets null.
 */
export interface EarnedPool { payout: PayoutType; payoutAddress: string | null }
export interface EarnedDeps {
  /** Null when Nimiq's Validators API could not be read; the member then sees why. */
  pools(): Promise<ReadonlyMap<string, EarnedPool> | null>;
  /** Every staking transaction this app has tracked for the address, in any squad. */
  trackedTxsForAddress(address: string): Promise<readonly EarnedTx[]>;
  /** Transfers into `address` sent by `from` at or after `since`, or null when the list
   * could not be read. Only asked for when a `direct` pool published a payout address. */
  incomingFrom(address: string, from: string, since: number):
    Promise<readonly { valueLuna: number }[] | null>;
}

export async function memberEarned(
  member: {
    address: string;
    joinedAt: number;
    /** The chain's own figures, or null when this address has no staker record. */
    stake: { activeLuna: number; delegation: string | null } | null;
    /** False when the staker read failed: an outage is not a measurement. */
    chainRead: boolean;
  },
  deps: EarnedDeps,
): Promise<EarnedResult> {
  if (!member.chainRead) return { known: false, reason: 'CHAIN_UNAVAILABLE' };
  if (member.stake === null) return { known: false, reason: 'NOT_STAKING' };
  const pools = await deps.pools();
  const pool = pools === null || member.stake.delegation === null
    ? null
    : pools.get(member.stake.delegation) ?? null;
  let payouts: readonly { valueLuna: number }[] | null = null;
  if (pool?.payout === 'direct' && pool.payoutAddress !== null) {
    payouts = await deps.incomingFrom(member.address, pool.payoutAddress, member.joinedAt);
  }
  const input: EarnedInput = {
    chainRead: true,
    stake: { activeLuna: member.stake.activeLuna },
    pool: pool === null ? null : { payout: pool.payout, payoutAddress: pool.payoutAddress },
    txs: await deps.trackedTxsForAddress(member.address),
    payouts,
  };
  return earnedSinceJoining(input);
}
