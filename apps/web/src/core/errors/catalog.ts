export const errors = {
  CHAIN_UNAVAILABLE: { code: 'CHAIN_UNAVAILABLE', message: 'Refresh unavailable', retryable: true, nextAction: 'Try refreshing shortly.', changedAnything: false },
  DECLINED: { code: 'DECLINED', message: 'Sign-in declined. Nothing changed.', retryable: true, nextAction: 'Try again when you’re ready.', changedAnything: false },
  OUTSIDE_HOST: { code: 'OUTSIDE_HOST', message: 'Open Squad Stake in Nimiq Pay to sign in.', retryable: false, nextAction: 'Open in Nimiq Pay.', changedAnything: false },
  WRONG_NETWORK: { code: 'WRONG_NETWORK', message: 'Nimiq Pay is on a different network.', retryable: true, nextAction: 'Switch to the app’s network in Nimiq Pay.', changedAnything: false },
  AUTH_REFUSED: { code: 'AUTH_REFUSED', message: 'This sign-in could not be verified.', retryable: true, nextAction: 'Start a new sign-in.', changedAnything: false },
  INVALID_INPUT: { code: 'INVALID_INPUT', message: 'The sign-in request was invalid.', retryable: true, nextAction: 'Start a new sign-in.', changedAnything: false },
  UNAVAILABLE: { code: 'UNAVAILABLE', message: 'Sign-in is unavailable right now.', retryable: true, nextAction: 'Please try again shortly.', changedAnything: false },
  NETWORK_ERROR: { code: 'NETWORK_ERROR', message: 'The connection was interrupted.', retryable: true, nextAction: 'Start a new sign-in.', changedAnything: false },
  WALLET_ERROR: { code: 'WALLET_ERROR', message: 'Nimiq Pay could not complete sign-in.', retryable: true, nextAction: 'Try again when you’re ready.', changedAnything: false },
} as const;
export type ErrorCode = keyof typeof errors;
export function catalogError(code: string) {
  return Object.hasOwn(errors, code) ? errors[code as ErrorCode] : errors.UNAVAILABLE;
}
