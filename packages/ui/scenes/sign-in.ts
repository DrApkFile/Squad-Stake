import { strings } from '../i18n';
import { REDUCED_MOTION_T } from '../motion';
import { demoExample, demoGoals } from './demo/squad';
import type { SignInScreenProps } from '../SignInScreen';

// Synthetic UI states only. These are NOT the evidence/mainnet-squad.json demo fixtures.
// `t` is seconds since the screen appeared, so the same scene renders the same frame forever:
// 0 before anything is typed, 1 mid-line, 4 once the line is complete (which is also the
// frame a reduced-motion viewer sees).
const base = { example: demoExample, goals: demoGoals };

const noticeStrings = strings('en').notice;

export const signInScenes: readonly { id: string; props: SignInScreenProps }[] = [
  { id: 'sign-in-start', props: { ...base, t: 0, state: { status: 'idle' } } },
  { id: 'sign-in-typing', props: { ...base, t: 1, state: { status: 'idle' } } },
  { id: 'sign-in-idle', props: { ...base, t: 4, state: { status: 'idle' } } },
  { id: 'sign-in-reduced-motion', props: { ...base, t: REDUCED_MOTION_T, state: { status: 'idle' } } },
  // Sent here by a members-only page. The screen says why, and signing in returns them to it
  // (`?next=`, src/server/lib/session-page.ts) — a redirect that explains itself.
  { id: 'sign-in-sent-here', props: { ...base, t: 4, state: { status: 'idle' },
    onwardUrl: '/squads/0f1d2c3b-4a59-4687-9b0c-1d2e3f405162',
    notice: { title: noticeStrings.signInFirstTitle, body: noticeStrings.signInFirstBody } } },
  { id: 'sign-in-waiting', props: { ...base, t: 4, state: { status: 'waiting' } } },
  { id: 'sign-in-declined', props: { ...base, t: 4, state: { status: 'declined', message: 'Sign-in declined. Nothing changed.', nextAction: 'Try again when you’re ready.' } } },
  { id: 'sign-in-error', props: { ...base, t: 4, state: { status: 'error', message: 'Squad Stake is unavailable right now.', nextAction: 'Please try again shortly.' } } },
  { id: 'sign-in-success', props: { ...base, t: 4, state: { status: 'success', address: '— (synthetic sign-in state)' } } },
];
