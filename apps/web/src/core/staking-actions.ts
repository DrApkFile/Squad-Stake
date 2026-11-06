import { MINIMUM_STAKE_LUNA, STAKING_FEES_LUNA } from '../config/constants';

/**
 * What a member must do before a commitment can be backed (PRD §7.3.2). Pure: the staker
 * record and the chosen validator come in, the exact wallet arguments come out, so the
 * wallet module never decides amounts or fees.
 */
export type StakingAction =
  | { kind: 'none' }
  | { kind: 'create-staker'; valueLuna: number; feeLuna: number; delegation: string }
  | { kind: 'add-stake'; valueLuna: number; feeLuna: number }
  | { kind: 'blocked'; reason: 'NO_VALIDATOR' };

export function planStakingAction(input: {
  activeBalanceLuna: number | null;
  otherCommitmentsLuna: number;
  amountLuna: number;
  delegation: string | null;
}): StakingAction {
  const needed = input.otherCommitmentsLuna + input.amountLuna - (input.activeBalanceLuna ?? 0);
  if (needed <= 0) return { kind: 'none' };
  if (input.activeBalanceLuna === null) {
    // A first stake must reach the protocol minimum (getPolicyConstants.minimumStake),
    // and a new staker must name a validator (§7.7).
    if (input.delegation === null) return { kind: 'blocked', reason: 'NO_VALIDATOR' };
    return { kind: 'create-staker', valueLuna: Math.max(needed, MINIMUM_STAKE_LUNA),
      feeLuna: STAKING_FEES_LUNA.create, delegation: input.delegation };
  }
  return { kind: 'add-stake', valueLuna: needed, feeLuna: STAKING_FEES_LUNA.add };
}
