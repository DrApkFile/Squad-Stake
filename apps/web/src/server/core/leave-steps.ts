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
  /** Null when there is no payment to judge; otherwise the §7.6 verdict. */
  paymentVerified: boolean | null;
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
  const retireStep: StepState = withdrawn || retiredLuna > 0
    ? { state: 'done', hash: retire?.hash ?? null }
    : isOpen(retire) && retire ? { state: 'pending', hash: retire.hash }
      : failed(retire) && retire ? { state: 'failed', hash: retire.hash }
        : inactiveLuna <= 0 ? { state: 'locked' }
          // Unknown release counts as not yet: offering the tap would cost a fee for a
          // transaction the staking contract rejects (FAILURE_MODES "retire before release").
          : released ? { state: 'available' } : { state: 'waiting' };

  const withdrawStep: StepState = withdrawn ? { state: 'done', hash: remove?.hash ?? null }
    : isOpen(remove) && remove ? { state: 'pending', hash: remove.hash }
      : failed(remove) && remove ? { state: 'failed', hash: remove.hash }
        : retiredLuna > 0 ? { state: 'available' } : { state: 'locked' };

  // Paying is offered once nothing is left to wait for: the withdrawal landed, or the member
  // has nothing in the exit pipeline and is paying from NIM they already hold. Mid-exit it
  // stays locked, because that NIM is not theirs to spend yet.
  const idle = inactiveLuna === 0 && retiredLuna === 0
    && !isOpen(unstake) && !isOpen(retire) && !isOpen(remove);
  const payStep: StepState | null = input.mode !== 'A' ? null
    : input.paymentVerified === true && pay ? { state: 'done', hash: pay.hash }
      : isOpen(pay) && pay ? { state: 'pending', hash: pay.hash }
        // A pay transaction with a verdict that is not "verified" failed §7.6: wrong
        // recipient, short value, wrong marker, or included-but-failed.
        : pay !== undefined && input.paymentVerified === false ? { state: 'failed', hash: pay.hash }
          : withdrawn || idle ? { state: 'available' } : { state: 'locked' };

  return { start, retire: retireStep, withdraw: withdrawStep, pay: payStep };
}
