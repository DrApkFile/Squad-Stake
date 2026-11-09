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
 * the member's to take. Once a hash exists the step is `pending` and the answer drops back to
 * a re-read, so no control on the screen can put a second transaction on the wire
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
  // Anything but `available` means the chain has moved on: a hash is out (`pending`), the
  // action is done, or it is not this member's to take yet. Reading is then the only honest
  // answer, and it is still an answer — the member is never left without a control.
  return input.lastStepState === 'available'
    ? { kind: 'resend', tx: input.lastKind }
    : { kind: 'reread' };
}
