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

// --- Leaving, PRD §7.5 -----------------------------------------------------
// Three separate taps, never chained automatically: each one is its own Nimiq Pay approval
// (AGENTS.md 8). These functions only decide the exact arguments; the wallet module sends them.

export interface SquadCommitment { squadId: string; name: string; committedLuna: number }

export type LeavingBlocked = 'NOT_STAKING' | 'INVALID_AMOUNT' | 'AMOUNT_EXCEEDS_STAKE'
  | 'NOT_RELEASABLE' | 'NOTHING_TO_RETIRE' | 'NOTHING_TO_WITHDRAW' | 'ALREADY_LEAVING';

export type LeavingAction =
  | { kind: 'set-active-stake'; newActiveBalanceLuna: number; feeLuna: number }
  | { kind: 'retire-stake'; retireStakeLuna: number; feeLuna: number }
  | { kind: 'remove-stake'; valueLuna: number; feeLuna: number };
export type LeavingStep =
  | (Extract<LeavingAction, { kind: 'set-active-stake' }> & {
    /** How far the member's remaining active stake would fall below everything they have
     * committed, and the other squads that would say so. */
    shortfallLuna: number; affected: readonly SquadCommitment[];
  })
  | Extract<LeavingAction, { kind: 'retire-stake' | 'remove-stake' }>
  | { kind: 'blocked'; reason: LeavingBlocked };

/**
 * Step one: move `amountLuna` out of active stake. Nimiq's provider takes the **resulting**
 * active balance, not a delta, so the subtraction happens here against a fresh read.
 *
 * `member-status.ts` compares the sum of a member's commitments against that one balance, so
 * inactivating anything while commitments stand makes the member SHORT in *every* squad at
 * once, by the same amount. The honest warning is therefore the list of their other squads
 * (PRD §7.5 "show which squads go SHORT first"), not a per-squad guess.
 */
export function planLeaving(input: {
  activeBalanceLuna: number | null;
  /** The member's commitments in squads that still bind their stake. */
  commitments: readonly SquadCommitment[];
  /** The squad they are leaving for; its own commitment is not listed as collateral damage. */
  squadId: string;
  amountLuna: number;
  /**
   * The rest of the member's **fresh** staker record, and whether an inactivation of theirs is
   * still open. Required, not optional: a caller that forgot to pass them would silently lose
   * the guard below, which is the whole point of it.
   */
  inactiveBalanceLuna: number;
  retiredBalanceLuna: number;
  unstakeOpen: boolean;
}): LeavingStep {
  if (input.activeBalanceLuna === null) return { kind: 'blocked', reason: 'NOT_STAKING' };
  /**
   * Leaving has already started, so there is nothing to start again.
   *
   * Found on testnet: the squad page kept offering "Start leaving" to a member who was already
   * UNSTAKING (docs/PROGRESS.md 2026-11-09). Hiding the control fixes the screen, but a second
   * inactivation must be impossible rather than merely unoffered — it would lower the active
   * balance again, cost another fee, and on the chain it is a *replacement* active balance
   * (`sendSetActiveStakeTransaction` takes the resulting balance, not a delta), so sending one
   * from a stale page could inactivate an amount the member never chose.
   *
   * The screen-level gate in `server/core/leave-steps.ts` keeps step one out of `available`
   * for the same reasons; this is the one that holds when the screen is bypassed.
   */
  if (input.unstakeOpen || input.inactiveBalanceLuna > 0 || input.retiredBalanceLuna > 0) {
    return { kind: 'blocked', reason: 'ALREADY_LEAVING' };
  }
  if (!Number.isSafeInteger(input.amountLuna) || input.amountLuna <= 0) {
    return { kind: 'blocked', reason: 'INVALID_AMOUNT' };
  }
  if (input.amountLuna > input.activeBalanceLuna) {
    return { kind: 'blocked', reason: 'AMOUNT_EXCEEDS_STAKE' };
  }
  const newActiveBalanceLuna = input.activeBalanceLuna - input.amountLuna;
  const committed = input.commitments.reduce((total, row) => total + row.committedLuna, 0);
  const shortfallLuna = Math.max(0, committed - newActiveBalanceLuna);
  return {
    kind: 'set-active-stake', newActiveBalanceLuna, feeLuna: STAKING_FEES_LUNA.unstake,
    shortfallLuna,
    affected: shortfallLuna === 0
      ? [] : input.commitments.filter((row) => row.squadId !== input.squadId),
  };
}

/**
 * Step two, irreversible: inactive → retired. Refused until the chain itself allows it
 * (Q11), and the amount is the **fresh** inactive balance, so a partly-filled earlier read
 * can never retire the wrong figure. An unknown release block counts as "not yet": guessing
 * would mean offering a tap that the chain rejects and that still costs a fee.
 */
export function planRetire(input: {
  inactiveBalanceLuna: number; headBlock: number; releaseBlock: number | null;
}): LeavingStep {
  if (input.inactiveBalanceLuna <= 0) return { kind: 'blocked', reason: 'NOTHING_TO_RETIRE' };
  if (input.releaseBlock === null || input.headBlock < input.releaseBlock) {
    return { kind: 'blocked', reason: 'NOT_RELEASABLE' };
  }
  return { kind: 'retire-stake', retireStakeLuna: input.inactiveBalanceLuna,
    feeLuna: STAKING_FEES_LUNA.retire };
}

/**
 * Step three: retired → wallet. `value` is the whole **fresh** retired balance and the fee is
 * 0, because the staking contract pays the fee out of that balance — asking for the balance
 * plus a fee never lands, and a partial remove is not allowed at all (Q12, AGENTS.md 6,
 * NimJar's pattern in briefing/FAILURE_MODES.md).
 */
export function planRemove(input: { retiredBalanceLuna: number }): LeavingStep {
  if (input.retiredBalanceLuna <= 0) return { kind: 'blocked', reason: 'NOTHING_TO_WITHDRAW' };
  return { kind: 'remove-stake', valueLuna: input.retiredBalanceLuna,
    feeLuna: STAKING_FEES_LUNA.remove };
}

// --- Mode A payment, PRD §7.6 ---------------------------------------------

/** The on-chain marker that ties a payment to one squad. It is public, so it carries the
 * squad's short id and nothing else (PRD §7.6, reference §sendBasicTransactionWithData). */
export function paymentData(shortId: string) {
  return `sq:${shortId}`;
}

export type PaymentAction = { kind: 'pay'; recipient: string; valueLuna: number; data: string };
export type PaymentPlan = PaymentAction | { kind: 'blocked'; reason: 'NO_RECIPIENT' | 'INVALID_AMOUNT' };

/** The recipient is whatever was fixed when the squad was created and is never taken from the
 * client; `shareLuna` is the member's own commitment. */
export function planPayment(input: {
  recipient: string | null; shareLuna: number; shortId: string;
}): PaymentPlan {
  if (input.recipient === null) return { kind: 'blocked', reason: 'NO_RECIPIENT' };
  if (!Number.isSafeInteger(input.shareLuna) || input.shareLuna <= 0) {
    return { kind: 'blocked', reason: 'INVALID_AMOUNT' };
  }
  return { kind: 'pay', recipient: input.recipient, valueLuna: input.shareLuna,
    data: paymentData(input.shortId) };
}
