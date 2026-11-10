import type { TxState } from '../../core/squad-contract';

/**
 * The §7.5 / §7.6 step machine, with no chain or store in it: given what the chain says the
 * member's stake looks like and what their tracked transactions did, which of the four taps is
 * offered, which is waiting, and which is finished.
 *
 * Split out of `leave-plan.ts` so Q11 (retire stays off until the chain releases the stake) is
 * decided by a function with no I/O at all.
 */
export type StepState =
  | { state: 'locked' }
  | { state: 'available' }
  /** Retire only: inactive stake exists but the chain has not released it yet (Q11). */
  | { state: 'waiting' }
  | { state: 'pending'; hash: string }
  | { state: 'failed'; hash: string }
  | { state: 'done'; hash: string | null };

export interface StepTx { hash: string; state: TxState }
export type PaymentOutcome = { verified: true } | { verified: false; code: string };

/**
 * §7.6 refusals that the chain cannot take back: the transaction executed and the check
 * against the squad's own recipient, share and marker failed, so no number of further
 * confirmations changes the answer. `TX_NOT_CONFIRMED` is deliberately **not** here — it
 * means "not read yet, or not final yet", which is the one case that must keep waiting
 * (PRD §8: UNKNOWN never times out).
 */
const FINAL_PAYMENT_REFUSALS: readonly string[] = [
  'WRONG_RECIPIENT', 'PAYMENT_DATA_MISMATCH', 'PAYMENT_SHORT', 'TX_FAILED',
];
const finallyRefused = (payment: PaymentOutcome | null) =>
  payment !== null && !payment.verified && FINAL_PAYMENT_REFUSALS.includes(payment.code);
export interface LeavingStepsInput {
  /** False when the member has no staker record at all: there is nothing to leave. */
  staking: boolean;
  inactiveLuna: number;
  retiredLuna: number;
  headBlock: number | null;
  releaseBlock: number | null;
  unstake?: StepTx | undefined;
  retire?: StepTx | undefined;
  remove?: StepTx | undefined;
  pay?: StepTx | undefined;
  mode: 'A' | 'B';
  /** Null when there is no payment to judge; otherwise the §7.6 verdict, **with its code**.
   * A boolean was not enough: see `FINAL_PAYMENT_REFUSALS`. */
  payment: PaymentOutcome | null;
}
export interface LeavingSteps {
  start: StepState; retire: StepState; withdraw: StepState; pay: StepState | null;
}

const isOpen = (tx: StepTx | undefined) =>
  tx !== undefined && (tx.state === 'SUBMITTED' || tx.state === 'UNKNOWN');
const failed = (tx: StepTx | undefined) => tx !== undefined && tx.state === 'INCLUDED_FAILED';

export function deriveLeavingSteps(input: LeavingStepsInput): LeavingSteps {
  const withdrawn = input.remove?.state === 'INCLUDED_OK';
  const { inactiveLuna, retiredLuna, unstake, retire, remove, pay } = input;

  // Step one is done the moment the chain shows stake outside the active balance, however it
  // got there — a member may have inactivated from another squad's screen, or outside the app.
  const start: StepState = !input.staking ? { state: 'locked' }
    : inactiveLuna > 0 || retiredLuna > 0 || withdrawn ? { state: 'done', hash: unstake?.hash ?? null }
      : isOpen(unstake) && unstake ? { state: 'pending', hash: unstake.hash }
        : failed(unstake) && unstake ? { state: 'failed', hash: unstake.hash }
          : { state: 'available' };

  const released = input.releaseBlock !== null && input.headBlock !== null
    && input.headBlock >= input.releaseBlock;
  // The release gate comes before the failure, which is the one place these two orders differ.
  // A retire sent before the chain released the stake is included-but-failed, and if that
  // failure outranked the gate the step would read `failed` — which every screen now treats as
  // "yours to take again" (apps/web/src/core/retry.ts). Offering that tap would cost a second
  // fee for a transaction the staking contract rejects again (FAILURE_MODES "retire before
  // release"). The honest state while the stake is still locked is `waiting`, whatever an
  // earlier attempt did; the trade-off is that the failed hash is not shown on this step until
  // the release passes, and the failure was reported when it happened.
  const retireStep: StepState = withdrawn || retiredLuna > 0
    ? { state: 'done', hash: retire?.hash ?? null }
    : isOpen(retire) && retire ? { state: 'pending', hash: retire.hash }
      : inactiveLuna <= 0 ? { state: 'locked' }
        : !released ? { state: 'waiting' }
          : failed(retire) && retire ? { state: 'failed', hash: retire.hash }
            : { state: 'available' };

  const withdrawStep: StepState = withdrawn ? { state: 'done', hash: remove?.hash ?? null }
    : isOpen(remove) && remove ? { state: 'pending', hash: remove.hash }
      : failed(remove) && remove ? { state: 'failed', hash: remove.hash }
        : retiredLuna > 0 ? { state: 'available' } : { state: 'locked' };

  // Paying is offered once nothing is left to wait for: the withdrawal landed, or the member
  // has nothing in the exit pipeline and is paying from NIM they already hold. Mid-exit it
  // stays locked, because that NIM is not theirs to spend yet.
  const idle = inactiveLuna === 0 && retiredLuna === 0
    && !isOpen(unstake) && !isOpen(retire) && !isOpen(remove);
  const payStep: StepState | null = input.mode !== 'A' ? null : payStepFor();

  /**
   * Step four, in the order the answers actually become certain. The §7.6 verdict is checked
   * **before** the tracked state, because a payment to the wrong recipient, short of the
   * share or carrying the wrong marker is refused the moment it executes — waiting for the
   * tracker's own poll to call it "included" first only made the screen say "Sent" about a
   * transaction the server had already judged (docs/AUDIT.md, M-3).
   *
   * Everything that is not a verdict keeps the step `pending`: a hash exists, so no control
   * here may offer a second send (AGENTS.md invariant 8).
   */
  function payStepFor(): StepState {
    if (pay === undefined) {
      return withdrawn || idle ? { state: 'available' } : { state: 'locked' };
    }
    if (input.payment?.verified === true) return { state: 'done', hash: pay.hash };
    if (finallyRefused(input.payment)) return { state: 'failed', hash: pay.hash };
    // Included but did not execute: nothing moved and the fee was spent (NimJar).
    if (failed(pay)) return { state: 'failed', hash: pay.hash };
    return { state: 'pending', hash: pay.hash };
  }

  return { start, retire: retireStep, withdraw: withdrawStep, pay: payStep };
}
