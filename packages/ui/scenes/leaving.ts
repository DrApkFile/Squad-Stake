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
    id: 'leaving-retire-failed',
    props: { ...base, stake: demoStake.unstaking,
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
    props: { ...base, stake: null, readAt: null,
      // The catalog's CHAIN_UNAVAILABLE entry verbatim: this is what the container passes.
      error: { message: 'The chain could not be read just now.',
        nextAction: 'Nothing is lost. Refresh in a moment.' } },
  },
  { id: 'leaving-busy', props: { ...base, busy: true } },
];
