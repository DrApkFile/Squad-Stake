import type { Validator } from './chain';

/**
 * PRD §7.7 (P0): from the active validators, drop the ones a new staker must not join,
 * then spread members by picking the validator this app has sent the fewest members to.
 * `inactivityFlag` and `jailedFrom` are the wire names confirmed in types.rs; `retired`
 * marks a validator on its way out. Ties break on address so the choice is deterministic.
 */
export function chooseValidator(
  validators: readonly Validator[], membersPerValidator: ReadonlyMap<string, number>,
): string | null {
  const eligible = validators.filter((validator) =>
    !validator.retired && validator.jailedFrom === null && validator.inactivityFlag === null);
  let best: { address: string; members: number } | null = null;
  for (const validator of eligible) {
    const members = membersPerValidator.get(validator.address) ?? 0;
    if (best === null || members < best.members
      || (members === best.members && validator.address < best.address)) {
      best = { address: validator.address, members };
    }
  }
  return best?.address ?? null;
}
