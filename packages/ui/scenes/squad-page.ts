import {
  demoBackedTotal,
  demoStages,
  demoHashes,
  demoRecipient,
  demoTzOffsetMinutes,
  demoCommittedTotal,
  demoGoalAt,
  demoInviteUrl,
  demoLeaveBy,
  demoNow,
  demoCardMembers,
  demoProofHref,
  demoProofUrl,
  demoReadAt,
  demoRoster,
  demoSquadPage,
} from './demo/squad';
import { stageTotalsOf } from '../progress';
import { strings } from '../i18n';
import type { MemberRowView } from '../MemberList';
import type { MySquadsScreenProps, SquadCardView } from '../MySquadsScreen';
import type { ProofScreenProps } from '../ProofScreen';
import type { SquadScreenProps } from '../SquadScreen';

/** The fixtures render in English, like every other scene; the `lang-*` scenes cover the rest. */
const noticeStrings = strings('en').notice;

const CARDS: readonly SquadCardView[] = [
  {
    id: 'sample-squad-1',
    name: 'Lisbon in April',
    mode: 'A',
    href: '/squads/sample-squad-1',
    goalAt: demoGoalAt,
    targetLuna: 1_200_000_000,
    committedLuna: 200_000_000,
    squadCommittedLuna: demoCommittedTotal,
    memberCount: 4,
    members: demoCardMembers(4),
  },
  {
    id: 'sample-squad-2',
    name: 'Winter buffers',
    mode: 'B',
    href: '/squads/sample-squad-2',
    goalAt: demoGoalAt + 20 * 86_400_000,
    targetLuna: null,
    committedLuna: 150_000_000,
    squadCommittedLuna: 450_000_000,
    memberCount: 3,
    members: demoCardMembers(3),
  },
  {
    id: 'sample-squad-3',
    name: 'Studio deposit',
    mode: 'A',
    href: '/squads/sample-squad-3',
    goalAt: demoGoalAt + 60 * 86_400_000,
    targetLuna: 3_000_000_000,
    committedLuna: 400_000_000,
    squadCommittedLuna: 2_480_000_000,
    memberCount: 6,
    members: demoCardMembers(6),
  },
];

export const mySquadsScenes: readonly { id: string; props: MySquadsScreenProps }[] = [
  { id: 'my-squads-empty', props: { squads: [], now: demoNow, createUrl: '/squads/new', t: 4 } },
  { id: 'my-squads-loading', props: { squads: [], now: demoNow, createUrl: '/squads/new', loading: true, t: 0 } },
  { id: 'my-squads-one', props: { squads: CARDS.slice(0, 1), now: demoNow, createUrl: '/squads/new', t: 4 } },
  { id: 'my-squads-several', props: { squads: CARDS, now: demoNow, createUrl: '/squads/new', t: 4 } },
  {
    id: 'my-squads-error',
    props: {
      squads: [],
      now: demoNow,
      createUrl: '/squads/new',
      t: 4,
      // The catalog's CHAIN_UNAVAILABLE entry verbatim: this is what the container passes.
      error: { message: 'The chain could not be read just now.',
        nextAction: 'Nothing is lost. Refresh in a moment.' },
    },
  },
];

/** The sample head, and a release a little over half a day out: testnet's own distance between
 * an inactivation and its release (briefing/knowledge/staking.md). */
const DEMO_HEAD = 16_246_426;
/** The release, anchored to whichever clock the scene runs on. */
const releaseAt = (now: number) => ({
  releaseBlock: 16_290_000, remainingBlocks: 43_574,
  estimatedReleaseAt: now + 12 * 3_600_000 + 59 * 60_000, jailed: false,
});
const DEMO_RELEASE = releaseAt(demoNow);
/** Two days before the leave-by deadline: where the banner used to offer a second start. */
const LEAVE_BY_NOW = demoLeaveBy - 2 * 86_400_000;

/** `en.squad.leaveByInfoBody`, quoted so the fixture shows the screen's own words. */
const INFO_BODY = 'Nimiq releases staked NIM only after the reporting window that follows the '
  + 'next election block — about a day on this chain, and longer if your validator is jailed. '
  + 'Nothing starts by itself: your stake stays where it is until you tap Start leaving and '
  + 'approve it in Nimiq Pay. Starting the day before goal day leaves no room for that wait.';

const squadBase = {
  squad: demoSquadPage,
  members: demoRoster,
  backedLuna: demoBackedTotal,
  stages: demoStages,
  // Nothing of the viewer's is in the exit pipeline, so this is the one state in which the
  // page may offer "Start leaving" at all (packages/ui/progress.ts).
  yourExit: { stage: 'none' as const, committedLuna: 200_000_000, release: null,
    headBlock: DEMO_HEAD },
  committedLuna: demoCommittedTotal,
  leaveBy: demoLeaveBy,
  now: demoNow,
  readAt: demoReadAt,
  inviteUrl: demoInviteUrl,
  proofUrl: demoProofUrl,
  proofHref: demoProofHref,
  commitUrl: '/s/4f1c8a7b2d9e0315a6c4b8d7e2f10934',
  leavingUrl: '/squads/sample-squad-1/leaving',
  tzOffsetMinutes: demoTzOffsetMinutes,
  back: { label: 'Squads', href: '/squads' },
} satisfies Partial<SquadScreenProps>
  & Omit<SquadScreenProps, 't' | 'loading' | 'error' | 'shared' | 'demoLabel' | 'payments' | 'state' | 'payUrl'>;

/** Mode A settlement as the squad sees it: three of four paid, one not counted yet, and every
 * hash on screen so a reader can check it (PRD §7.6, PROOF_PLAN "Verify it yourself"). */
const partialPayments = {
  recipient: demoRecipient,
  owing: 4,
  paid: 2,
  rows: [
    { address: demoRoster[0]?.fullAddress ?? '', hash: demoHashes.pay, verified: true, code: null },
    { address: demoRoster[1]?.fullAddress ?? '', hash: demoHashes.payOther, verified: true, code: null },
    { address: demoRoster[2]?.fullAddress ?? '', hash: null, verified: false, code: null },
    { address: demoRoster[3]?.fullAddress ?? '', hash: demoHashes.remove, verified: false,
      code: 'PAYMENT_SHORT' },
  ],
};

/** A pending tracked transaction on the second member: a hash is never success, so the row says
 * pending until the chain confirms it (PRD Q10). */
const rosterWithPending = demoRoster.map((member, index) =>
  index === 1
    ? { ...member, pending: { phase: 'SUBMITTED' as const, confirmations: 12,
      requiredConfirmations: 60 } }
    : member,
);

/**
 * The defect this slice fixed, as a fixture: the chain already shows the member's stake
 * inactive, so the row says it is on the chain and confirming. It can never read
 * "0 of 60 confirmations" again (docs/PROGRESS.md 2026-11-09).
 */
const rosterConfirming = demoRoster.map((member, index) =>
  index === 0
    ? { ...member, status: { status: 'UNSTAKING' as const, releaseBlock: DEMO_RELEASE.releaseBlock },
      pending: { phase: 'INCLUDED_CONFIRMING' as const, confirmations: 12,
        requiredConfirmations: 60 } }
    : member,
);

/** The same row with no count read at all: worded, never printed as a zero. */
const rosterConfirmingUnread = rosterConfirming.map((member, index) =>
  index === 0
    ? { ...member, pending: { phase: 'INCLUDED_CONFIRMING' as const, confirmations: null,
      requiredConfirmations: 60 } }
    : member,
);

/** Every stage of one exit, as the viewer's own row. */
const rosterAt = (status: MemberRowView['status']) =>
  demoRoster.map((member, index) => (index === 0 ? { ...member, status } : member));

/** One squad holding every stage at once, so the staged line can be read in full. */
const MIXED: readonly MemberRowView[] = [
  { ...demoRoster[0] as MemberRowView,
    status: { status: 'UNSTAKING', releaseBlock: DEMO_RELEASE.releaseBlock },
    pending: { phase: 'INCLUDED_CONFIRMING', confirmations: 31, requiredConfirmations: 60 } },
  { ...demoRoster[1] as MemberRowView, status: { status: 'BACKED' } },
  { ...demoRoster[2] as MemberRowView, status: { status: 'SHORT', shortBy: null } },
  { ...demoRoster[3] as MemberRowView, status: { status: 'RETIRED' } },
];

/** What the page shows when the node did not answer for two of the members. */
const rosterPartlyUnread = demoRoster.map((member, index) =>
  index >= 2 ? { ...member, status: null, readAt: null } : member,
);

/** Everyone paid: the roster behind the COMPLETED fixture, and behind its own stage totals. */
const PAID_ROSTER: readonly MemberRowView[] = demoRoster.map(
  (member) => ({ ...member, status: { status: 'PAID' as const } }),
);

export const squadPageScenes: readonly { id: string; props: SquadScreenProps }[] = [
  // A refused clipboard write, which used to leave a tap that did nothing at all. The link is
  // not lost: Share is still there, and the message says so.
  { id: 'squad-page-copy-failed',
    props: { ...squadBase, t: 4, copyFailed: true, proofCopyFailed: true } },
  { id: 'squad-page-loading', props: { ...squadBase, backedLuna: null, readAt: null, members: [], loading: true, t: 0 } },
  { id: 'squad-page-backed', props: { ...squadBase, t: 4 } },
  { id: 'squad-page-counting-up', props: { ...squadBase, t: 0.5 } },
  { id: 'squad-page-pending-tx', props: { ...squadBase, members: rosterWithPending, t: 4 } },
  { id: 'squad-page-shared', props: { ...squadBase, shared: true, t: 4 } },
  // The invite link is never printed, so "copied" is the only confirmation the member gets
  // that the right string is on their clipboard.
  { id: 'squad-page-proof-copied', props: { ...squadBase, proofCopied: true, t: 4 } },
  /**
   * The ⓘ sheet that carries the long explanation the leave-by banner used to print inline.
   * Two scenes, because the rise is a function of `t − openedT` and both ends of it have to
   * look right: mid-rise at 40% of the 0.28 s travel, and fully open.
   */
  {
    id: 'squad-page-info-rising',
    props: {
      ...squadBase, now: LEAVE_BY_NOW, t: 4.11,
      info: { title: 'Why start early?', body: INFO_BODY, openedT: 4 },
    },
  },
  {
    id: 'squad-page-info-open',
    props: {
      ...squadBase, now: LEAVE_BY_NOW, t: 5,
      info: { title: 'Why start early?', body: INFO_BODY, openedT: 4 },
    },
  },
  {
    // This scene runs on its own clock, two days before the leave-by deadline, so its read age
    // is re-anchored to that clock too. Left on the base fixture's `readAt` it said "Checked
    // 923 h 45 min ago" — the same class of fixture bug as the countdown one
    // (docs/PROGRESS.md 2026-11-08), found by looking at a rendered video frame.
    id: 'squad-page-leave-by',
    props: {
      ...squadBase,
      members: demoRoster.map((member) => ({ ...member, readAt: LEAVE_BY_NOW - 24_000 })),
      now: LEAVE_BY_NOW,
      readAt: LEAVE_BY_NOW - 24_000,
      t: 4,
    },
  },
  {
    id: 'squad-page-chain-unavailable',
    props: {
      ...squadBase,
      members: rosterPartlyUnread,
      t: 4,
      // The catalog's CHAIN_UNAVAILABLE entry verbatim: this is what the container passes.
      error: { message: 'The chain could not be read just now.',
        nextAction: 'Nothing is lost. Refresh in a moment.' },
    },
  },
  {
    id: 'squad-page-payments-partial',
    props: { ...squadBase, payments: partialPayments, payUrl: '/squads/sample-squad-1/pay', t: 4 },
  },
  {
    id: 'squad-page-completed',
    props: {
      ...squadBase,
      state: 'COMPLETED',
      members: PAID_ROSTER,
      backedLuna: 0,
      // The stages have to come from this roster, not from the base one: the scene said
      // "4,500 NIM saved · 1,100 NIM leaving · 1,800 NIM missing" beside a banner claiming
      // every member had paid (docs/AUDIT.md; the same class of fixture bug as the countdown
      // one on 2026-11-08).
      stages: stageTotalsOf(PAID_ROSTER),
      payments: { ...partialPayments, paid: 4, rows: partialPayments.rows.map((row) => ({
        ...row, hash: row.hash ?? demoHashes.pay, verified: true, code: null })) },
      t: 4,
    },
  },
  /* --- The three defects found on testnet, one fixture each (docs/PROGRESS.md 2026-11-09) --- */
  {
    // The tracker agreeing with the chain: inactive stake is visible, so the row is confirming
    // with a real count. The banner is the countdown, and there is no "Start leaving" control.
    //
    // This scene runs on its own clock — two days before the leave-by deadline, which is where
    // the old screen would have offered "Start leaving" — so its release estimate and its read
    // age are re-anchored to that clock. A fixture whose estimate is anchored to a different
    // `now` reads "any moment now" beside a block the chain has not reached
    // (docs/PROGRESS.md 2026-11-08, the same mistake in the leaving scenes).
    id: 'squad-page-leaving-countdown',
    props: {
      ...squadBase,
      members: rosterConfirming.map((member) => ({ ...member, readAt: LEAVE_BY_NOW - 24_000 })),
      stages: stageTotalsOf(rosterConfirming),
      yourExit: { stage: 'leaving', committedLuna: 200_000_000,
        release: releaseAt(LEAVE_BY_NOW), headBlock: DEMO_HEAD },
      now: LEAVE_BY_NOW,
      readAt: LEAVE_BY_NOW - 24_000,
      t: 4,
    },
  },
  {
    // The same, with no confirmation count read: the row is worded, never a zero.
    id: 'squad-page-leaving-unread-count',
    props: {
      ...squadBase,
      members: rosterConfirmingUnread,
      stages: stageTotalsOf(rosterConfirmingUnread),
      yourExit: { stage: 'leaving', committedLuna: 200_000_000, release: DEMO_RELEASE,
        headBlock: DEMO_HEAD },
      t: 4,
    },
  },
  {
    // Leaving, but the release cannot be derived yet. Said plainly, never guessed.
    id: 'squad-page-leaving-release-unknown',
    props: {
      ...squadBase,
      members: rosterConfirming,
      stages: stageTotalsOf(rosterConfirming),
      yourExit: { stage: 'leaving', committedLuna: 200_000_000, release: null,
        headBlock: DEMO_HEAD },
      t: 4,
    },
  },
  {
    // The head has passed the release block: the countdown becomes "ready to withdraw".
    id: 'squad-page-leaving-ready',
    props: {
      ...squadBase,
      members: rosterAt({ status: 'RELEASABLE' }),
      stages: stageTotalsOf(rosterAt({ status: 'RELEASABLE' })),
      yourExit: { stage: 'ready', committedLuna: 200_000_000, release: DEMO_RELEASE,
        headBlock: DEMO_RELEASE.releaseBlock },
      t: 4,
    },
  },
  {
    // A jailed validator releases later (Q07), and the banner says so.
    id: 'squad-page-leaving-jailed',
    props: {
      ...squadBase,
      members: rosterConfirming,
      stages: stageTotalsOf(rosterConfirming),
      yourExit: { stage: 'leaving', committedLuna: 200_000_000,
        release: { ...DEMO_RELEASE, jailed: true }, headBlock: DEMO_HEAD },
      t: 4,
    },
  },
  {
    id: 'squad-page-withdrawn',
    props: {
      ...squadBase,
      members: rosterAt({ status: 'WITHDRAWN' }),
      stages: stageTotalsOf(rosterAt({ status: 'WITHDRAWN' })),
      yourExit: { stage: 'withdrawn', committedLuna: 200_000_000, release: null,
        headBlock: DEMO_HEAD },
      t: 4,
    },
  },
  {
    id: 'squad-page-share-paid',
    props: {
      ...squadBase,
      members: rosterAt({ status: 'PAID' }),
      stages: stageTotalsOf(rosterAt({ status: 'PAID' })),
      yourExit: { stage: 'paid', committedLuna: 200_000_000, release: null,
        headBlock: DEMO_HEAD },
      payments: partialPayments,
      t: 4,
    },
  },
  {
    // Every stage at once: saved, leaving, ready, withdrawn, paid and one member genuinely
    // short — the line a squad mid-exit actually reads.
    id: 'squad-page-every-stage',
    props: {
      ...squadBase,
      members: MIXED,
      stages: stageTotalsOf(MIXED),
      yourExit: { stage: 'leaving', committedLuna: 200_000_000, release: DEMO_RELEASE,
        headBlock: DEMO_HEAD },
      t: 4,
    },
  },
  {
    id: 'squad-page-together-mode',
    props: {
      ...squadBase,
      squad: { ...demoSquadPage, name: 'Winter buffers', mode: 'B', targetLuna: null, recipient: null },
      t: 4,
    },
  },
];

export const proofScenes: readonly { id: string; props: ProofScreenProps }[] = [
  {
    id: 'proof-view',
    props: {
      squad: demoSquadPage,
      // A public proof has no viewer, so no row is "You" (src/server/core/squad-detail.ts).
      members: demoRoster.map((member) => ({ ...member, isYou: false })),
      stages: demoStages,
      committedLuna: demoCommittedTotal,
      now: demoNow,
      readAt: demoReadAt,
      network: 'testnet',
      verify: { endpoint: 'https://rpc.testnet.nimiqwatch.com', method: 'getStakerByAddress' },
      apiUrl: 'https://squad.example/api/proof/q7m2bt4h',
    },
  },
  // A member-only page redirected a stranger here, and this is the page saying so rather than
  // swapping itself in silently (`app/squads/[id]/page.tsx`). The back chevron is the squad's
  // own when a member opened their proof link from inside the app.
  {
    id: 'proof-view-not-a-member',
    props: {
      squad: demoSquadPage,
      members: demoRoster.map((member) => ({ ...member, isYou: false })),
      stages: demoStages,
      committedLuna: demoCommittedTotal,
      now: demoNow,
      readAt: demoReadAt,
      network: 'testnet',
      verify: { endpoint: 'https://rpc.testnet.nimiqwatch.com', method: 'getStakerByAddress' },
      apiUrl: 'https://squad.example/api/proof/q7m2bt4h',
      notice: {
        title: noticeStrings.notAMemberTitle,
        body: noticeStrings.notAMemberBody,
      },
    },
  },
  {
    id: 'proof-view-from-squad',
    props: {
      squad: demoSquadPage,
      members: demoRoster.map((member) => ({ ...member, isYou: false })),
      stages: demoStages,
      committedLuna: demoCommittedTotal,
      now: demoNow,
      readAt: demoReadAt,
      network: 'testnet',
      verify: { endpoint: 'https://rpc.testnet.nimiqwatch.com', method: 'getStakerByAddress' },
      apiUrl: 'https://squad.example/api/proof/q7m2bt4h',
      back: { label: noticeStrings.mySquads, href: '/squads/0f1d2c3b-4a59-4687-9b0c-1d2e3f405162' },
    },
  },
  {
    id: 'proof-view-payments',
    props: {
      squad: demoSquadPage,
      members: demoRoster.map((member) => ({ ...member, isYou: false })),
      stages: demoStages,
      committedLuna: demoCommittedTotal,
      now: demoNow,
      readAt: demoReadAt,
      network: 'testnet',
      verify: { endpoint: 'https://rpc.testnet.nimiqwatch.com', method: 'getStakerByAddress' },
      apiUrl: 'https://squad.example/api/proof/q7m2bt4h',
      payments: partialPayments,
    },
  },
  {
    id: 'proof-view-no-read',
    props: {
      squad: demoSquadPage,
      members: demoRoster.map((member) => ({ ...member, isYou: false, status: null, readAt: null })),
      stages: null,
      committedLuna: demoCommittedTotal,
      now: demoNow,
      readAt: null,
      network: 'testnet',
      verify: { endpoint: 'https://rpc.testnet.nimiqwatch.com', method: 'getStakerByAddress' },
      apiUrl: 'https://squad.example/api/proof/q7m2bt4h',
    },
  },
];
