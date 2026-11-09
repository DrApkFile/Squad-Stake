import { DEFAULT_LANG, strings, type Lang } from './i18n';

/**
 * The wire twin of `apps/web/src/server/core/pending-view.ts`: what a tracked transaction is
 * allowed to say on a screen.
 */
export interface PendingView {
  phase: 'FINAL' | 'INCLUDED_CONFIRMING' | 'FAILED' | 'SUBMITTED' | 'UNKNOWN';
  /** Null means nobody read a count. It is worded, never printed as a digit. */
  confirmations: number | null;
  requiredConfirmations: number;
}

/**
 * One line for a transaction in flight, in the member's language.
 *
 * The rule this enforces at the UI edge: **a count that was never read is never printed.**
 * The squad page used to render `confirmations ?? 0`, which turned "not read" into the
 * sentence "0 of 60 confirmations" beside a member the chain already showed as UNSTAKING
 * (docs/PROGRESS.md 2026-11-09). A null now picks a different sentence instead of a zero.
 */
export function pendingText(pending: PendingView, lang: Lang = DEFAULT_LANG): string {
  const s = strings(lang).pending;
  const { confirmations, requiredConfirmations } = pending;
  switch (pending.phase) {
    case 'FINAL':
      return s.final;
    case 'FAILED':
      return s.failed;
    case 'INCLUDED_CONFIRMING':
      // The effect is on the chain, so this can never be "nothing has happened yet".
      return confirmations === null
        ? s.confirmingUnread
        : s.confirming(confirmations, requiredConfirmations);
    case 'UNKNOWN':
      return s.unknown;
    default:
      return confirmations === null
        ? s.submitted
        : s.submittedCount(confirmations, requiredConfirmations);
  }
}

/** True while the member is waiting on the chain, so a screen can show a spinner or a
 * skeleton rather than a final answer. */
export const pendingIsOpen = (pending: PendingView) =>
  pending.phase !== 'FINAL' && pending.phase !== 'FAILED';
