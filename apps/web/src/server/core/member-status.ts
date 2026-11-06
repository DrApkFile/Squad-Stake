import type { Staker } from './chain';

export type MemberStatus =
  | { status: 'BACKED' | 'RELEASABLE' | 'RETIRED' | 'NOT_STAKING' }
  | { status: 'SHORT'; shortBy: number }
  | { status: 'UNSTAKING'; releaseBlock: number | null };

export function deriveMemberStatus({ staker, commitments, headBlock, releaseBlock }: {
  staker: Staker | null; commitments: readonly number[]; headBlock: number; releaseBlock: number | null;
}): MemberStatus {
  if (staker === null) return { status: 'NOT_STAKING' };
  const committed = commitments.reduce((total, amount) => {
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(total + amount)) {
      throw new RangeError('Commitments must sum to safe, nonnegative integer luna');
    }
    return total + amount;
  }, 0);
  // PRD §5: still BACKED if active stake covers ALL commitments, even with other
  // funds leaving. Otherwise show the earliest unfinished exit stage (§8).
  if (staker.balance >= committed) return { status: 'BACKED' };
  if (staker.inactiveBalance > 0) {
    return releaseBlock !== null && headBlock >= releaseBlock
      ? { status: 'RELEASABLE' } : { status: 'UNSTAKING', releaseBlock };
  }
  if (staker.retiredBalance > 0) return { status: 'RETIRED' };
  return { status: 'SHORT', shortBy: committed - staker.balance };
}
