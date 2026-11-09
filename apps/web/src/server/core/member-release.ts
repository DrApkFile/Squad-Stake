import type { ChainTransaction, ReleaseRpc, RpcResult, Validator } from './chain';
import { calculateRelease } from './release';

/**
 * When one member's inactivated stake is released, derived from the chain. Pure core: the rpc
 * and the clock are injected.
 *
 * Lifted out of `leave-plan.ts` so the countdown on the squad page (§7.4) and the countdown on
 * the leaving screen (§7.5) come from one implementation and cannot disagree — a member who is
 * told "about 14 h" on one screen must not be told something else on the other.
 */
export interface MemberReleaseRpc extends ReleaseRpc {
  getValidatorByAddress(address: string): Promise<RpcResult<Validator>>;
  getTransactionByHash(hash: string, options?: { fresh?: boolean }): Promise<RpcResult<ChainTransaction>>;
}
export interface MemberReleaseDeps { rpc: MemberReleaseRpc; now(): number }

export interface MemberRelease {
  releaseBlock: number; remainingBlocks: number; estimatedReleaseAt: number; jailed: boolean;
}

/**
 * Release is counted from the **inclusion block of the inactivation transaction**, read back
 * from the chain by hash. A staker's `inactiveFrom` is already an effective election block and
 * must never be fed to `calculateRelease` as an inclusion block — confirmed live on testnet on
 * 2026-11-09, where staker `NQ22 11TS …` reported `inactiveFrom` 16,251,210 for an
 * inactivation included at block 16,208,043, 43,167 blocks earlier.
 *
 * With no tracked inactivation there is no inclusion block, so the release stays unknown. Every
 * unreadable input also returns null: an unknown release shows as unknown, because guessing one
 * would offer a retire tap that the staking contract rejects and that still costs a fee
 * (briefing/FAILURE_MODES.md, "retire before release").
 */
export async function memberRelease(
  input: { unstakeHash: string | undefined; headBlock: number; delegation: string | null },
  deps: MemberReleaseDeps,
): Promise<MemberRelease | null> {
  if (input.unstakeHash === undefined) return null;
  // An inclusion block never changes, so this read may come from the 60 s cache.
  const transaction = await deps.rpc.getTransactionByHash(input.unstakeHash, { fresh: false });
  if (!transaction.ok || transaction.data.blockNumber === undefined) return null;
  let validator: Pick<Validator, 'jailedFrom'> | null = null;
  if (input.delegation !== null) {
    const read = await deps.rpc.getValidatorByAddress(input.delegation);
    // A validator we cannot read may be jailed, and a jailed one releases later (Q07), so an
    // unreadable validator leaves the release unknown rather than promising the early date.
    if (!read.ok) return null;
    validator = read.data;
  }
  const release = await calculateRelease(
    { inclusionBlock: transaction.data.blockNumber, headBlock: input.headBlock, validator },
    { rpc: deps.rpc, now: deps.now },
  );
  if (!release.ok) return null;
  return { releaseBlock: release.releaseBlock, remainingBlocks: release.remainingBlocks,
    estimatedReleaseAt: release.estimatedReleaseAt, jailed: release.jailed };
}
