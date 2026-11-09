import { FINALITY_CONFIRMATIONS } from '../../config/constants';
import type { TxKind, TxState } from '../../core/squad-contract';
import type { Staker } from './chain';

/**
 * What a tracked transaction is allowed to *say* on a screen, as opposed to what the tracker
 * decided about it. Pure: no store, no chain, no clock.
 *
 * It exists because of a real defect found on testnet (docs/PROGRESS.md 2026-11-09): the squad
 * page showed "Transaction pending · 0 of 60 confirmations" beside a member the chain already
 * showed as UNSTAKING. The zero was never a count — it was an unread `null` with a `?? 0` on
 * it, which is exactly the fabricated figure AGENTS.md "Never fabricate" forbids.
 *
 * ## The rule
 * **When the chain already shows a transaction's effect, its row can never show a zero count.**
 * Stake does not become inactive without an inactivation being included and executed, so a
 * visible effect is proof of inclusion. It is *not* proof of finality, so this never promotes
 * anything to final: the honest state is INCLUDED_CONFIRMING, with the real confirmations when
 * they were read and nothing at all when they were not.
 *
 * ## Why this is not in `tx-tracker.ts`
 * The tracker sees one transaction and must stay the single judge of execution and finality
 * (`executionResult` plus 60 confirmations, PRD Q10). A transaction legitimately *has* zero
 * confirmations for a moment after inclusion; what is impossible is zero confirmations while
 * its effect is already on the chain — and only the caller, holding the staker record beside
 * the transaction, can see both. So the invariant lives with the code that holds both, and the
 * protected file keeps its one job.
 */
export type PendingPhase =
  /** Executed and final: 60 confirmations deep (PRD Q10). */
  | 'FINAL'
  /** On the chain, not yet final. `confirmations` may be null when the count was not read. */
  | 'INCLUDED_CONFIRMING'
  /** Included and failed. Real on testnet: a retire before release (`70a282c0…`). */
  | 'FAILED'
  /** Sent, with nothing on the chain to show for it yet. */
  | 'SUBMITTED'
  /** The read failed or the transaction is absent. No amount of elapsed time makes it a
   * failure (PRD Q10); it is simply not known yet. */
  | 'UNKNOWN';

export interface PendingView {
  phase: PendingPhase;
  /** Null means "not read", and a screen must word it as such — never print it as a digit. */
  confirmations: number | null;
  requiredConfirmations: number;
}

/**
 * Does the staker record itself already show this transaction's effect?
 *
 * Only the three leaving kinds can be answered from a staker record. `create`, `add` and `pay`
 * deliberately cannot: an active balance cannot tell this app's deposit from any other
 * transfer into the same stake, and a Mode A payment is a plain transfer to a third party
 * judged by §7.6 — inferring either from a balance would be guessing, which is the class of
 * mistake this module exists to stop.
 */
export function stakeEffectSeen(input: {
  kind: TxKind;
  /** Null when the address has no staker record at all (RPC "Internal error", AGENTS.md 9). */
  staker: Staker | null;
  /** A `retire` of this member's that the tracker settled as INCLUDED_OK. */
  retiredEarlier: boolean;
}): boolean {
  const { staker } = input;
  switch (input.kind) {
    // Moving stake out of the active balance shows up as inactive stake, or as retired stake
    // once it has been retired, or as no record at all once the whole stake has left.
    case 'unstake':
      return staker === null || staker.inactiveBalance > 0 || staker.retiredBalance > 0;
    case 'retire':
      return staker === null || staker.retiredBalance > 0;
    // A withdrawal empties the retired balance, so its effect is only legible next to a retire
    // this app watched succeed: a retired balance of zero on its own means nothing.
    case 'remove':
      return staker === null || (input.retiredEarlier && staker.retiredBalance === 0);
    default:
      return false;
  }
}

/** A count that is zero or unread is not evidence of anything, so it is reported as unread. */
const positiveOrNull = (confirmations: number | null) =>
  confirmations !== null && confirmations > 0 ? confirmations : null;

export function pendingView(input: {
  state: TxState;
  confirmations: number | null;
  effectSeen: boolean;
}): PendingView {
  const requiredConfirmations = FINALITY_CONFIRMATIONS;
  switch (input.state) {
    case 'INCLUDED_OK':
      return { phase: 'FINAL', confirmations: input.confirmations, requiredConfirmations };
    // A verdict read from the transaction itself outranks the effect: `effectSeen` for an
    // inactivation is satisfied by *any* inactive stake, which an earlier successful
    // inactivation may have left behind while this one failed.
    case 'INCLUDED_FAILED':
      return { phase: 'FAILED', confirmations: input.confirmations, requiredConfirmations };
    default: {
      if (input.effectSeen) {
        return { phase: 'INCLUDED_CONFIRMING',
          confirmations: positiveOrNull(input.confirmations), requiredConfirmations };
      }
      // Without a visible effect an unreadable transaction stays unknown, and a readable one
      // keeps whatever the chain said, including a genuine zero straight after inclusion.
      return input.state === 'UNKNOWN'
        ? { phase: 'UNKNOWN', confirmations: null, requiredConfirmations }
        : { phase: 'SUBMITTED', confirmations: input.confirmations, requiredConfirmations };
    }
  }
}
