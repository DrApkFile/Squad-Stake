import {
  demoCommitmentLuna, demoGoalAt, demoHashes, demoNow, demoRecipient, demoSquadPage,
  demoTzOffsetMinutes,
} from './demo/squad';
import type { PayShareSheetProps } from '../PayShareSheet';
import type { TxStatusProps } from '../TxStatus';

/**
 * Screen 8, one scene per outcome of PRD §7.6, and the three refusals of Q15 kept apart,
 * because "wrong address", "too little" and "no squad reference" need different answers.
 */
const EXPLORER = 'https://test.nimiq.watch/#';
const base = {
  squad: { name: demoSquadPage.name, shortId: demoSquadPage.shortId, goalAt: demoGoalAt },
  recipient: demoRecipient,
  shareLuna: demoCommitmentLuna,
  roster: { paid: 3, owing: 4 },
  state: { status: 'ready' } as const,
  now: demoNow,
  tzOffsetMinutes: demoTzOffsetMinutes,
  readAt: demoNow - 24_000,
  canPay: true,
  explorerBase: EXPLORER,
  back: { label: 'Squad', href: '/squads/sample-squad-1' },
} satisfies Omit<PayShareSheetProps, 'demoLabel'>;

/** The catalog's own wording, which is what the container passes (core/errors/catalog.ts). */
const refusals = {
  recipient: { message: 'That payment went somewhere else.',
    nextAction: 'Pay the recipient shown on the squad page.' },
  short: { message: 'That payment is less than your share.',
    nextAction: 'Pay the rest of your share to count it.' },
  data: { message: 'That payment carries no squad marker.',
    nextAction: 'Use “Pay my share” so the squad reference is attached.' },
} as const;
const noop = () => undefined;

export const payShareScenes: readonly { id: string; props: PayShareSheetProps }[] = [
  { id: 'pay-ready', props: base },
  { id: 'pay-not-withdrawn-yet', props: { ...base, canPay: false } },
  { id: 'pay-waiting', props: { ...base, state: { status: 'waiting' } } },
  {
    id: 'pay-pending',
    props: { ...base, state: { status: 'pending', hash: demoHashes.pay, confirmations: 14,
      requiredConfirmations: 60 } },
  },
  {
    id: 'pay-pending-stalled',
    props: { ...base, stalled: true, onRefresh: noop,
      state: { status: 'pending', hash: demoHashes.pay, confirmations: 14,
        requiredConfirmations: 60 } },
  },
  { id: 'pay-checking', props: { ...base, state: { status: 'checking', hash: demoHashes.pay } } },
  {
    id: 'pay-refused-recipient',
    props: { ...base, state: { status: 'refused', hash: demoHashes.pay, ...refusals.recipient } },
  },
  {
    id: 'pay-refused-short',
    props: { ...base, state: { status: 'refused', hash: demoHashes.pay, ...refusals.short } },
  },
  {
    id: 'pay-refused-no-marker',
    props: { ...base, state: { status: 'refused', hash: demoHashes.pay, ...refusals.data } },
  },
  {
    id: 'pay-declined',
    props: { ...base, state: { status: 'failed', changedAnything: false,
      message: 'Approval declined. Nothing was sent.', nextAction: 'Tap again when you’re ready.' } },
  },
  {
    id: 'pay-outcome-unknown',
    props: { ...base, state: { status: 'failed', changedAnything: true,
      message: 'It is not clear whether that transaction was sent.',
      nextAction: 'Check it in Nimiq Pay before sending another.' } },
  },
  {
    id: 'pay-paid',
    props: { ...base, roster: { paid: 3, owing: 4 },
      state: { status: 'paid', hash: demoHashes.pay, squadCompleted: false } },
  },
  {
    id: 'pay-paid-squad-complete',
    props: { ...base, roster: { paid: 4, owing: 4 },
      state: { status: 'paid', hash: demoHashes.pay, squadCompleted: true } },
  },
];

/** Screen 9 on its own, so each verdict is measured once outside the sheets that embed it. */
export const txStatusScenes: readonly { id: string; props: TxStatusProps }[] = [
  {
    id: 'tx-status-pending',
    props: { state: 'pending', hash: demoHashes.unstake, confirmations: 12,
      requiredConfirmations: 60, explorerUrl: `${EXPLORER}${demoHashes.unstake}` },
  },
  {
    id: 'tx-status-unknown',
    props: { state: 'unknown', hash: demoHashes.retire, stalled: true, onRefresh: noop,
      explorerUrl: `${EXPLORER}${demoHashes.retire}` },
  },
  {
    id: 'tx-status-failed',
    props: { state: 'failed', hash: demoHashes.remove,
      explorerUrl: `${EXPLORER}${demoHashes.remove}` },
  },
  {
    id: 'tx-status-done',
    props: { state: 'done', hash: demoHashes.pay, explorerUrl: `${EXPLORER}${demoHashes.pay}` },
  },
];
