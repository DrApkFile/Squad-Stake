import type { TxKind } from './squad-contract';
import type { LeavingStepState } from '@squad-stake/ui';

/**
 * What a "Try again" control may do after a step of the exit failed.
 *
 * The screens used to print the failure at the foot of a four-step page and offer nothing but
 * a quiet "Refresh" below it, so a network drop in the middle of a withdrawal read as a dead
 * end — reported from a real testnet phone run, 2026-11-09.
 *
 * The rule has to be pure, because the dangerous half of it is not "offer a button" but
 * "offer which button": a resend is only ever allowed while the chain still says that step is
 * the member's to take. Once a hash is in flight the step is `pending` and the answer drops
 * back to a re-read, so no control on the screen can put a second transaction on the wire
 * (AGENTS.md invariant 8, briefing/FAILURE_MODES.md: check status before resending, never
 * auto-retry). Nothing here retries by itself either — it decides what a tap is allowed to do.
 */
export type RetryOffer =
  /** Attempt the same action again. The caller still re-reads the plan first. */
  | { kind: 'resend'; tx: TxKind }
  /** Read the chain again. Always safe: reading is not sending. */
  | { kind: 'reread' }
  /** The failure cannot be undone by trying; the words say what to do instead. */
  | { kind: 'none' };

export function retryOffer(input: {
  /** The error catalogue's own flag. A refusal (wrong network, already leaving) is not one. */
  retryable: boolean;
  /** The action that failed, or null when what failed was a read. */
  lastKind: TxKind | null;
  /** What the chain says about that action's step *now*, or null when it has no step. */
  lastStepState: LeavingStepState['state'] | null;
}): RetryOffer {
  if (!input.retryable) return { kind: 'none' };
  if (input.lastKind === null) return { kind: 'reread' };
  // `available` is a step waiting to be taken. `failed` is the same step after an attempt the
  // chain included but did not execute — reported from a phone, 2026-11-09: "it said
  // transaction failed, it was included in a block but didn't execute and the fee was spent,
  // so what do I do". That verdict is final and it is a verdict about a transaction that moved
  // nothing, so the step really is the member's to take again, and doing so is not a second
  // send of anything: the first one is over. The step machine only reports `failed` while the
  // step's own precondition still holds (server/core/leave-steps.ts), so this cannot offer a
  // tap the chain would reject — and the container re-reads the plan and lets the pure planner
  // refuse before any of it reaches the wallet.
  //
  // Everything else means the chain has moved on: a hash is in flight (`pending`), the action
  // is done, or it is not this member's to take yet. Reading is then the only honest answer,
  // and it is still an answer — the member is never left without a control.
  return input.lastStepState === 'available' || input.lastStepState === 'failed'
    ? { kind: 'resend', tx: input.lastKind }
    : { kind: 'reread' };
}
