import type { SignInScreenProps } from '../SignInScreen';

// Synthetic UI states only. These are NOT the evidence/mainnet-squad.json demo fixtures.
export const signInScenes: readonly { id: string; props: SignInScreenProps }[] = [
  { id: 'sign-in-idle', props: { state: { status: 'idle' } } },
  { id: 'sign-in-waiting', props: { state: { status: 'waiting' } } },
  { id: 'sign-in-declined', props: { state: { status: 'declined', message: 'Sign-in declined. Nothing changed.', nextAction: 'Try again when you’re ready.' } } },
  { id: 'sign-in-error', props: { state: { status: 'error', message: 'Sign-in is unavailable right now.', nextAction: 'Please try again shortly.' } } },
  { id: 'sign-in-success', props: { state: { status: 'success', address: '— (synthetic sign-in state)' } } },
];
