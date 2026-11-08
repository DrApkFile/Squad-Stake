import type { CreateSquadScreenProps } from '../CreateSquadScreen';
import type { JoinCommitSheetProps } from '../JoinCommitSheet';
import type { LeaveConfirmProps } from '../LeaveConfirm';
import type { PrivacyNoticeProps } from '../PrivacyNotice';
import {
  demoCommitmentLuna, demoFreeLuna, demoNow, demoReadAt, demoSharedSquad, demoTogetherSquad,
} from './demo/squad';

export const privacyScenes: readonly { id: string; props: PrivacyNoticeProps }[] = [
  { id: 'privacy-notice', props: {} },
  { id: 'privacy-notice-busy', props: { busy: true } },
];

const emptyValues = {
  name: '', mode: 'A' as const, targetNim: '', recipient: '', personalTargetNim: '', goalDate: '',
};
const minGoalDate = '2026-11-09';
export const createSquadScenes: readonly { id: string; props: CreateSquadScreenProps }[] = [
  { id: 'create-empty', props: { values: emptyValues, minGoalDate } },
  { id: 'create-mode-a', props: { minGoalDate, values: {
    ...emptyValues, name: 'Lisbon in April', targetNim: '12000',
    recipient: 'NQ21 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V', goalDate: '2026-12-18',
  } } },
  { id: 'create-mode-b', props: { minGoalDate, values: {
    ...emptyValues, name: 'Winter buffers', mode: 'B', personalTargetNim: '2000', goalDate: '2026-12-18',
  } } },
  { id: 'create-too-soon', props: { minGoalDate, values: { ...emptyValues, name: 'Weekend trip', targetNim: '400',
    recipient: 'NQ21 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V', goalDate: '2026-11-07' },
  error: { message: 'Pick a goal date at least three days ahead.', nextAction: 'Leaving a stake can take a day.' } } },
  { id: 'create-shared', props: { minGoalDate, values: {
    ...emptyValues, name: 'Lisbon in April', targetNim: '12000',
    recipient: 'NQ21 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V', goalDate: '2026-12-18',
  }, created: { shortId: 'k3m9p2qr', inviteUrl: 'https://squad.example/s/sample-invite-token', squadUrl: '/squads/sample' } } },
  { id: 'create-busy', props: { minGoalDate, busy: true, values: {
    ...emptyValues, name: 'Lisbon in April', targetNim: '12000',
    recipient: 'NQ21 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V', goalDate: '2026-12-18',
  } } },
];

const sheet = { squad: demoSharedSquad, now: demoNow, readAt: demoReadAt, amountNim: '2000' };
// One scene per state of PRD §7.3, including the two that must never read as success.
export const joinCommitScenes: readonly { id: string; props: JoinCommitSheetProps }[] = [
  { id: 'commit-not-staking', props: { ...sheet,
    state: { status: 'not-staking', minimumLuna: 10_000_000 } } },
  { id: 'commit-ready', props: { ...sheet, state: { status: 'ready', freeLuna: 350_000_000 } } },
  { id: 'commit-needs-stake', props: { ...sheet,
    state: { status: 'needs-stake', shortfallLuna: 50_000_000, action: 'add', feeLuna: 200 } } },
  { id: 'commit-needs-staker', props: { ...sheet,
    state: { status: 'needs-stake', shortfallLuna: 200_000_000, action: 'create', feeLuna: 300 } } },
  { id: 'commit-waiting', props: { ...sheet, state: { status: 'waiting' } } },
  { id: 'commit-pending', props: { ...sheet,
    state: { status: 'pending', confirmations: 12, requiredConfirmations: 60 } } },
  { id: 'commit-failed', props: { ...sheet, state: { status: 'failed', changedAnything: true,
    message: 'The transaction was included but failed.',
    nextAction: 'Nothing was staked; the fee was spent. You can try again.' } } },
  { id: 'commit-declined', props: { ...sheet, state: { status: 'failed', changedAnything: false,
    message: 'Approval declined. Nothing was sent.', nextAction: 'Tap again when you’re ready.' } } },
  { id: 'commit-over-committed', props: { ...sheet, state: { status: 'failed', changedAnything: false,
    message: 'That is more than your stake can back.',
    nextAction: 'Commit your free amount, or add stake first.' } } },
  { id: 'commit-no-read', props: { ...sheet, readAt: null, state: { status: 'failed', changedAnything: false,
    message: 'The chain could not be read just now.',
    nextAction: 'Nothing is lost. Refresh in a moment.' } } },
  { id: 'commit-committed', props: { ...sheet,
    state: { status: 'committed', committedLuna: demoCommitmentLuna, freeLuna: demoFreeLuna } } },
  { id: 'commit-together-mode', props: { ...sheet, squad: demoTogetherSquad,
    state: { status: 'ready', freeLuna: 350_000_000 } } },
];

export const leaveScenes: readonly { id: string; props: LeaveConfirmProps }[] = [
  { id: 'leave-confirm', props: { squad: demoSharedSquad, committedLuna: demoCommitmentLuna } },
  { id: 'leave-busy', props: { squad: demoSharedSquad, committedLuna: demoCommitmentLuna, busy: true } },
  { id: 'leave-error', props: { squad: demoSharedSquad, committedLuna: demoCommitmentLuna,
    error: { message: 'You are not in this squad.', nextAction: 'Open the invite link again.' } } },
];
