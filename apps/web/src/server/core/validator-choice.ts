import type { Validator } from './chain';

/** What the choice needs to know about a pool; the full record lives in `lib/pool-directory.ts`. */
export interface PoolFacts { payout: 'restake' | 'direct' | 'none' }

/** Validators a new staker must not be sent to, whatever any directory says: `inactivityFlag`
 * and `jailedFrom` are the wire names confirmed in upstream `types.rs`, and `retired` marks a
 * validator on its way out. */
function onChainEligible(validators: readonly Validator[]): readonly Validator[] {
  return validators.filter((validator) =>
    !validator.retired && validator.jailedFrom === null && validator.inactivityFlag === null);
}

/** Fewest Squad Stake members first, address as the deterministic tie-break, so two members
 * creating a staker in the same minute do not both land on the same pool by accident. */
function fewestMembers(
  validators: readonly Validator[], membersPerValidator: ReadonlyMap<string, number>,
): string | null {
  let best: { address: string; members: number } | null = null;
  for (const validator of validators) {
    const members = membersPerValidator.get(validator.address) ?? 0;
    if (best === null || members < best.members
      || (members === best.members && validator.address < best.address)) {
      best = { address: validator.address, members };
    }
  }
  return best?.address ?? null;
}

/**
 * PRD §7.7 (P0): from the active validators, drop the ones a new staker must not join, then
 * spread members by picking the validator this app has sent the fewest members to.
 *
 * This is the fallback rule, used when Nimiq's Validators API cannot be read. It cannot tell
 * whether a validator pays its stakers anything, so the sheet says as much before the approval
 * (`PoolCard` with `fallback: true`) rather than implying a pool was vetted.
 */
export function chooseValidator(
  validators: readonly Validator[], membersPerValidator: ReadonlyMap<string, number>,
): string | null {
  return fewestMembers(onChainEligible(validators), membersPerValidator);
}

/**
 * PRD §7.7, pool-aware: the same spread, over the validators that are active, not jailed, not
 * retired **and** run a pool that pays its stakers. `payoutType: 'none'` means the validator
 * keeps the rewards (`server/utils/types.ts` `PayoutType.None`), so it is ineligible, and a
 * validator the directory does not list at all is ineligible too — it is not a pool as far as
 * Nimiq's own data is concerned, and guessing is not allowed to decide where stake goes.
 *
 * Returns null when nothing qualifies; the caller then says no validator could be chosen
 * instead of sending stake somewhere it would earn nothing.
 */
export function choosePoolValidator(
  validators: readonly Validator[],
  pools: ReadonlyMap<string, PoolFacts>,
  membersPerValidator: ReadonlyMap<string, number>,
): string | null {
  const paying = onChainEligible(validators).filter((validator) => {
    const pool = pools.get(validator.address);
    return pool !== undefined && pool.payout !== 'none';
  });
  return fewestMembers(paying, membersPerValidator);
}
