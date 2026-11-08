export const errors = {
  // These codes reach a sign-in screen, a squad page and a commit sheet alike, so their wording
  // names no single flow (PRD §8: every state says what happened and what to do next).
  CHAIN_UNAVAILABLE: { code: 'CHAIN_UNAVAILABLE', message: 'The chain could not be read just now.', retryable: true, nextAction: 'Nothing is lost. Refresh in a moment.', changedAnything: false },
  DECLINED: { code: 'DECLINED', message: 'Sign-in declined. Nothing changed.', retryable: true, nextAction: 'Try again when you’re ready.', changedAnything: false },
  OUTSIDE_HOST: { code: 'OUTSIDE_HOST', message: 'Open Squad Stake in Nimiq Pay to sign in.', retryable: false, nextAction: 'Open in Nimiq Pay.', changedAnything: false },
  WRONG_NETWORK: { code: 'WRONG_NETWORK', message: 'Nimiq Pay is on a different network.', retryable: true, nextAction: 'Switch to the app’s network in Nimiq Pay.', changedAnything: false },
  AUTH_REFUSED: { code: 'AUTH_REFUSED', message: 'Your session is no longer valid.', retryable: true, nextAction: 'Sign in with Nimiq Pay again.', changedAnything: false },
  INVALID_INPUT: { code: 'INVALID_INPUT', message: 'That request was not valid.', retryable: true, nextAction: 'Check what you entered and try again.', changedAnything: false },
  UNAVAILABLE: { code: 'UNAVAILABLE', message: 'Squad Stake is unavailable right now.', retryable: true, nextAction: 'Please try again shortly.', changedAnything: false },
  NETWORK_ERROR: { code: 'NETWORK_ERROR', message: 'The connection was interrupted.', retryable: true, nextAction: 'Check your connection and try again. Nothing was sent.', changedAnything: false },
  WALLET_ERROR: { code: 'WALLET_ERROR', message: 'Nimiq Pay could not complete sign-in.', retryable: true, nextAction: 'Try again when you’re ready.', changedAnything: false },

  // Wallet outcomes for the staking calls (PRD §7.3, Q09). `changedAnything` is true
  // whenever NIM may have moved or a fee may have been paid, so the UI never says
  // "nothing happened" when it cannot know that.
  TX_DECLINED: { code: 'TX_DECLINED', message: 'Approval declined. Nothing was sent.', retryable: true, nextAction: 'Tap again when you’re ready.', changedAnything: false },
  TX_REJECTED: { code: 'TX_REJECTED', message: 'Nimiq Pay could not accept this transaction.', retryable: true, nextAction: 'Check the amount and try again.', changedAnything: false },
  TX_UNSUPPORTED: { code: 'TX_UNSUPPORTED', message: 'Nimiq Pay does not support this action.', retryable: false, nextAction: 'Update Nimiq Pay, then try again.', changedAnything: false },
  TX_SUBMIT_FAILED: { code: 'TX_SUBMIT_FAILED', message: 'The transaction could not be submitted.', retryable: true, nextAction: 'Check your connection and try again.', changedAnything: false },
  TX_OUTCOME_UNKNOWN: { code: 'TX_OUTCOME_UNKNOWN', message: 'It is not clear whether that transaction was sent.', retryable: false, nextAction: 'Check it in Nimiq Pay before sending another.', changedAnything: true },
  TX_PENDING: { code: 'TX_PENDING', message: 'Waiting for the chain to confirm.', retryable: true, nextAction: 'This usually takes about a minute.', changedAnything: true },
  TX_FAILED: { code: 'TX_FAILED', message: 'The transaction was included but failed.', retryable: true, nextAction: 'Nothing was staked; the fee was spent. You can try again.', changedAnything: true },
  TX_NOT_CONFIRMED: { code: 'TX_NOT_CONFIRMED', message: 'That transaction is not confirmed yet.', retryable: true, nextAction: 'Wait for confirmation, then commit.', changedAnything: false },
  NOT_TRACKED: { code: 'NOT_TRACKED', message: 'That transaction is not tracked here.', retryable: false, nextAction: 'Start the action again.', changedAnything: false },
  DUPLICATE_HASH: { code: 'DUPLICATE_HASH', message: 'That transaction is already being tracked.', retryable: false, nextAction: 'Check its status.', changedAnything: false },

  // Squad and commitment outcomes from the route handlers (PRD §7.2, §7.3, §11).
  OVER_COMMITTED: { code: 'OVER_COMMITTED', message: 'That is more than your stake can back.', retryable: true, nextAction: 'Commit your free amount, or add stake first.', changedAnything: false },
  NOT_STAKING: { code: 'NOT_STAKING', message: 'You are not staking yet.', retryable: true, nextAction: 'Create a staker to back your commitment.', changedAnything: false },
  GOAL_TOO_SOON: { code: 'GOAL_TOO_SOON', message: 'Pick a goal date at least three days ahead.', retryable: true, nextAction: 'Leaving a stake can take a day.', changedAnything: false },
  INVITE_INVALID: { code: 'INVITE_INVALID', message: 'That invite link is not valid.', retryable: false, nextAction: 'Ask the organiser for a new link.', changedAnything: false },
  SQUAD_CLOSED: { code: 'SQUAD_CLOSED', message: 'This squad is closed.', retryable: false, nextAction: 'Ask the organiser about a new squad.', changedAnything: false },
  SQUAD_NOT_FOUND: { code: 'SQUAD_NOT_FOUND', message: 'That squad no longer exists.', retryable: false, nextAction: 'Go back to your squads.', changedAnything: false },
  NOT_A_MEMBER: { code: 'NOT_A_MEMBER', message: 'You are not in this squad.', retryable: false, nextAction: 'Open the invite link, or view the public proof.', changedAnything: false },

  // Reads behind the squad page and the proof view (PRD §7.4, §9.5, §9.10).
  STALE_READ: { code: 'STALE_READ', message: 'This is an older chain read.', retryable: true, nextAction: 'Refresh to read the chain again.', changedAnything: false },
  LEAVE_BLOCKED: { code: 'LEAVE_BLOCKED', message: 'This squad could not release you.', retryable: true, nextAction: 'Refresh the squad and try again. Your stake is untouched.', changedAnything: false },

  // Leaving steps (PRD §7.5). Every one of these is a refusal to *offer* a tap, so nothing
  // has been sent and nothing has changed.
  NOT_RELEASABLE: { code: 'NOT_RELEASABLE', message: 'This stake is not released yet.', retryable: true, nextAction: 'Wait for the countdown to finish, then confirm.', changedAnything: false },
  NOTHING_TO_RETIRE: { code: 'NOTHING_TO_RETIRE', message: 'There is no unstaking balance to confirm.', retryable: false, nextAction: 'Start leaving first.', changedAnything: false },
  NOTHING_TO_WITHDRAW: { code: 'NOTHING_TO_WITHDRAW', message: 'There is nothing withdrawn to collect.', retryable: false, nextAction: 'Confirm the withdrawal first.', changedAnything: false },
  INVALID_AMOUNT: { code: 'INVALID_AMOUNT', message: 'That is not an amount of NIM.', retryable: true, nextAction: 'Enter the NIM you want to free up.', changedAnything: false },
  AMOUNT_EXCEEDS_STAKE: { code: 'AMOUNT_EXCEEDS_STAKE', message: 'That is more than your active stake.', retryable: true, nextAction: 'Leave at most what you have staked.', changedAnything: false },

  // Mode A settlement (PRD §7.6, Q15). A payment that fails these checks is still on the
  // chain: the NIM moved, it just did not settle this share, so `changedAnything` is true.
  NO_RECIPIENT: { code: 'NO_RECIPIENT', message: 'This squad has no recipient.', retryable: false, nextAction: 'Together-goals squads never pay anybody.', changedAnything: false },
  NOT_MODE_A: { code: 'NOT_MODE_A', message: 'There is nothing to pay in this squad.', retryable: false, nextAction: 'Together goals means nobody pays anybody.', changedAnything: false },
  WRONG_RECIPIENT: { code: 'WRONG_RECIPIENT', message: 'That payment went somewhere else.', retryable: true, nextAction: 'Pay the recipient shown on the squad page.', changedAnything: true },
  PAYMENT_SHORT: { code: 'PAYMENT_SHORT', message: 'That payment is less than your share.', retryable: true, nextAction: 'Pay the rest of your share to count it.', changedAnything: true },
  PAYMENT_DATA_MISMATCH: { code: 'PAYMENT_DATA_MISMATCH', message: 'That payment carries no squad marker.', retryable: true, nextAction: 'Use “Pay my share” so the squad reference is attached.', changedAnything: true },
  PAYMENT_NOT_VERIFIED: { code: 'PAYMENT_NOT_VERIFIED', message: 'That payment has not been verified yet.', retryable: true, nextAction: 'The chain is still confirming it. Check again shortly.', changedAnything: true },
} as const;
export type ErrorCode = keyof typeof errors;
export function catalogError(code: string) {
  return Object.hasOwn(errors, code) ? errors[code as ErrorCode] : errors.UNAVAILABLE;
}

/**
 * Every documented NimiqProviderError type, plus a default branch (SDK 0.2.x keeps a
 * host-supplied type verbatim, so unlisted types reach us). For a send call an unknown
 * cause must not claim nothing happened, so it maps to TX_OUTCOME_UNKNOWN.
 */
export function providerErrorCode(type: string): ErrorCode {
  switch (type) {
    case 'PERMISSION_DENIED': return 'TX_DECLINED';
    case 'INVALID_TRANSACTION': case 'INVALID_REQUEST': return 'TX_REJECTED';
    case 'UNKNOWN_REQUEST': return 'TX_UNSUPPORTED';
    case 'NETWORK_ERROR': case 'INTERNAL_ERROR': return 'TX_SUBMIT_FAILED';
    default: return 'TX_OUTCOME_UNKNOWN';
  }
}
