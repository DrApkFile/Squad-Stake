import {
  demoCommitments, demoCommitmentLuna, demoGoalAt, demoHashes, demoHeadBlock, demoLeaveBy,
  demoRelease, demoSquadPage, demoStake, demoTzOffsetMinutes,
} from './demo/squad';
import type { LeavingStepsProps } from '../LeavingSteps';

/**
 * Screen 7, one scene per state of PRD §7.5 — including the three that must never read as
 * success (pending, failed, release unknown) and the two the member is warned about (other
 * squads going short, a jailed validator).
 */
const EXPLORER = 'https://test.nimiq.watch/#';
/** Two days before the deadline: inside the window where the banner is on. */
const sceneNow = demoLeaveBy - 2 * 86_400_000;

/** `demoRelease`'s estimate is anchored to `demoNow` (the squad page's clock). This screen
 * runs on its own clock, so the estimate is re-anchored to it; otherwise the countdown reads
 * "any moment now" next to a release block the chain has not reached. */
const releaseSoon = { ...demoRelease,
  estimatedReleaseAt: sceneNow + demoRelease.remainingBlocks * 1000 };

const locked = { state: 'locked' } as const;
const available = { state: 'available' } as const;
const waiting = { state: 'waiting' } as const;
const done = (hash: string | null) => ({ state: 'done', hash } as const);
const pending = (hash: string) => ({ state: 'pending', hash } as const);
const failed = (hash: string) => ({ state: 'failed', hash } as const);

const base = {
  squad: { name: demoSquadPage.name, shortId: demoSquadPage.shortId, mode: 'A' as const,
    goalAt: demoGoalAt },
  leaveBy: demoLeaveBy,
  now: sceneNow,
  tzOffsetMinutes: demoTzOffsetMinutes,
  stake: demoStake.staking,
  shareLuna: demoCommitmentLuna,
  amountNim: '2000',
  steps: { start: available, retire: locked, withdraw: locked, pay: locked },
  release: null,
  headBlock: demoHeadBlock,
  affected: [],
  shortfallLuna: 0,
  confirmTicked: false,
  readAt: sceneNow - 24_000,
  retireFeeLuna: 300,
  unstakeFeeLuna: 300,
  explorerBase: EXPLORER,
  payUrl: '/squads/sample-squad-1/pay',
  back: { label: 'Squad', href: '/squads/sample-squad-1' },
  t: 4,
} satisfies Omit<LeavingStepsProps, 'demoLabel'>;

/** A no-op is supplied only where the control it unlocks has to be on screen to be measured;
 * the gallery never calls it (PRD Q17: fixtures only, no behaviour). */
const noop = () => undefined;

export const leavingScenes: readonly { id: string; props: LeavingStepsProps }[] = [
  { id: 'leaving-start', props: base },
  {
    id: 'leaving-start-affects-others',
    props: { ...base, affected: demoCommitments.slice(1), shortfallLuna: 120_000_000 },
  },
  { id: 'leaving-start-pending', props: { ...base, steps: { ...base.steps, start: pending(demoHashes.unstake) } } },
  {
    id: 'leaving-start-stalled',
    props: { ...base, stalled: true, onRefresh: noop,
      steps: { ...base.steps, start: pending(demoHashes.unstake) } },
  },
  { id: 'leaving-start-failed', props: { ...base, steps: { ...base.steps, start: failed(demoHashes.unstake) } } },
  { id: 'leaving-not-staking', props: { ...base, stake: null, steps: { ...base.steps, start: locked } } },
  {
    id: 'leaving-countdown',
    props: { ...base, stake: demoStake.unstaking, release: releaseSoon,
      steps: { start: done(demoHashes.unstake), retire: waiting, withdraw: locked, pay: locked } },
  },
  {
    id: 'leaving-countdown-jailed',
    props: { ...base, stake: demoStake.unstaking,
      release: { ...releaseSoon, jailed: true,
        releaseBlock: releaseSoon.releaseBlock + 345_600,
        remainingBlocks: releaseSoon.remainingBlocks + 345_600,
        estimatedReleaseAt: releaseSoon.estimatedReleaseAt + 345_600_000 },
      steps: { start: done(demoHashes.unstake), retire: waiting, withdraw: locked, pay: locked } },
  },
  {
    id: 'leaving-release-unknown',
    props: { ...base, stake: demoStake.unstaking, release: null,
      steps: { start: done(null), retire: waiting, withdraw: locked, pay: locked } },
  },
  {
    id: 'leaving-releasable',
    props: { ...base, stake: demoStake.unstaking,
      release: { ...releaseSoon, remainingBlocks: 0, estimatedReleaseAt: sceneNow },
      headBlock: demoRelease.releaseBlock + 12,
      steps: { start: done(demoHashes.unstake), retire: available, withdraw: locked, pay: locked } },
  },
  {
    id: 'leaving-releasable-ticked',
    props: { ...base, stake: demoStake.unstaking, confirmTicked: true,
      release: { ...releaseSoon, remainingBlocks: 0, estimatedReleaseAt: sceneNow },
      headBlock: demoRelease.releaseBlock + 12,
      steps: { start: done(demoHashes.unstake), retire: available, withdraw: locked, pay: locked } },
  },
  {
    id: 'leaving-retire-pending',
    props: { ...base, stake: demoStake.unstaking,
      steps: { start: done(demoHashes.unstake), retire: pending(demoHashes.retire),
        withdraw: locked, pay: locked } },
  },
  {
    // A retire the chain included but did not execute, *after* the release — which is the only
    // way the step machine reports `failed` for step two. A retire that failed before the
    // release reads `waiting` instead, because the stake is still locked and offering the tap
    // again would only spend a second fee (server/core/leave-steps.ts).
    id: 'leaving-retire-failed',
    props: { ...base, stake: demoStake.unstaking,
      release: { ...releaseSoon, remainingBlocks: 0, estimatedReleaseAt: sceneNow },
      headBlock: demoRelease.releaseBlock + 12,
      steps: { start: done(demoHashes.unstake), retire: failed(demoHashes.retire),
        withdraw: locked, pay: locked } },
  },
  {
    id: 'leaving-retired',
    props: { ...base, stake: demoStake.retired,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: available, pay: locked } },
  },
  {
    id: 'leaving-withdraw-pending',
    props: { ...base, stake: demoStake.retired,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: pending(demoHashes.remove), pay: locked } },
  },
  {
    id: 'leaving-withdrawn-shared-goal',
    props: { ...base, stake: demoStake.withdrawn,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: done(demoHashes.remove), pay: available } },
  },
  {
    id: 'leaving-withdrawn-together-goals',
    props: { ...base, stake: demoStake.withdrawn, payUrl: null,
      squad: { ...base.squad, name: 'Winter buffers', mode: 'B' },
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: done(demoHashes.remove), pay: null } },
  },
  {
    // A payment on the wire: the transaction block above step four already says it is being
    // checked, so the step itself must not also say "finish withdrawing first".
    id: 'leaving-pay-pending',
    props: { ...base, stake: demoStake.withdrawn,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: done(demoHashes.remove), pay: pending(demoHashes.pay) } },
  },
  {
    id: 'leaving-paid',
    props: { ...base, stake: demoStake.withdrawn,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: done(demoHashes.remove), pay: done(demoHashes.pay) } },
  },
  {
    id: 'leaving-pay-failed',
    props: { ...base, stake: demoStake.withdrawn,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: done(demoHashes.remove), pay: failed(demoHashes.pay) } },
  },
  {
    id: 'leaving-deadline-passed',
    props: { ...base, now: demoLeaveBy + 3 * 3_600_000, readAt: demoLeaveBy + 3 * 3_600_000 - 24_000 },
  },
  {
    id: 'leaving-chain-unavailable',
    props: { ...base, stake: null, readAt: null, onRetry: noop,
      // A read that failed is not a verdict, so no step claims to be anybody's turn.
      steps: { start: locked, retire: locked, withdraw: locked, pay: locked },
      // The catalog's CHAIN_UNAVAILABLE entry verbatim: this is what the container passes.
      // Every step is locked in this state, so without the pinned retry below the screen has
      // no control on it at all except the quiet refresh at the foot of the page.
      error: { message: 'The chain could not be read just now.',
        nextAction: 'Nothing is lost. Refresh in a moment.' } },
  },
  {
    // The state reported from the phone: a withdrawal that was about to go through when the
    // network dropped. The retired balance is still on the chain, so step three is still the
    // member's to take, and the failure carries the way back to it.
    id: 'leaving-withdraw-network-failed',
    props: { ...base, stake: demoStake.retired, onRetry: noop,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: available, pay: locked },
      error: { message: 'The connection was interrupted.',
        nextAction: 'Check your connection and try again. Nothing was sent.' } },
  },
  {
    // The same failure once a hash exists: the step is `pending`, so the container withholds
    // `onRetry` and the only controls are the ones that read the chain. Nothing can be sent
    // twice from this screen.
    id: 'leaving-withdraw-failed-no-resend',
    props: { ...base, stake: demoStake.retired,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: pending(demoHashes.remove), pay: locked },
      error: { message: 'It is not clear whether that transaction was sent.',
        nextAction: 'Check it in Nimiq Pay before sending another.' } },
  },
  {
    /**
     * The state the phone was actually left in, and the one the screen had no answer for:
     * "initially it said transaction failed it was included in a block but didnt execute and
     * the fee was spent so what do i do" (2026-11-09).
     *
     * There is deliberately **no** `error` and **no** `onRetry` here, because that is what a
     * reload looks like — the React state that held the failure is gone and all that is left
     * is what the chain says. The way on therefore has to come from the step itself.
     */
    id: 'leaving-withdraw-failed',
    props: { ...base, stake: demoStake.retired,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: failed(demoHashes.remove), pay: locked } },
  },
  {
    // Mid-read: the control says so rather than looking like a tap that did nothing.
    id: 'leaving-refreshing',
    props: { ...base, stake: demoStake.retired, refreshing: true,
      steps: { start: done(demoHashes.unstake), retire: done(demoHashes.retire),
        withdraw: available, pay: locked } },
  },
  { id: 'leaving-busy', props: { ...base, busy: true } },
];
