import {
  demoBackedTotal,
  demoCommittedTotal,
  demoGoalAt,
  demoInviteUrl,
  demoLeaveBy,
  demoNow,
  demoCardMembers,
  demoProofUrl,
  demoReadAt,
  demoRoster,
  demoSquadPage,
} from './demo/squad';
import type { MySquadsScreenProps, SquadCardView } from '../MySquadsScreen';
import type { ProofScreenProps } from '../ProofScreen';
import type { SquadScreenProps } from '../SquadScreen';

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

const squadBase = {
  squad: demoSquadPage,
  members: demoRoster,
  backedLuna: demoBackedTotal,
  committedLuna: demoCommittedTotal,
  leaveBy: demoLeaveBy,
  now: demoNow,
  readAt: demoReadAt,
  inviteUrl: demoInviteUrl,
  proofUrl: demoProofUrl,
  commitUrl: '/s/4f1c8a7b2d9e0315a6c4b8d7e2f10934',
  back: { label: 'Squads', href: '/squads' },
} satisfies Partial<SquadScreenProps> & Omit<SquadScreenProps, 't' | 'loading' | 'error' | 'shared' | 'demoLabel'>;

/** A pending tracked transaction on the second member: a hash is never success, so the row says
 * pending until the chain confirms it (PRD Q10). */
const rosterWithPending = demoRoster.map((member, index) =>
  index === 1
    ? { ...member, pending: { confirmations: 12, requiredConfirmations: 60 } }
    : member,
);

/** What the page shows when the node did not answer for two of the members. */
const rosterPartlyUnread = demoRoster.map((member, index) =>
  index >= 2 ? { ...member, status: null, readAt: null } : member,
);

export const squadPageScenes: readonly { id: string; props: SquadScreenProps }[] = [
  { id: 'squad-page-loading', props: { ...squadBase, backedLuna: null, readAt: null, members: [], loading: true, t: 0 } },
  { id: 'squad-page-backed', props: { ...squadBase, t: 4 } },
  { id: 'squad-page-counting-up', props: { ...squadBase, t: 0.5 } },
  { id: 'squad-page-pending-tx', props: { ...squadBase, members: rosterWithPending, t: 4 } },
  { id: 'squad-page-shared', props: { ...squadBase, shared: true, t: 4 } },
  {
    id: 'squad-page-leave-by',
    props: { ...squadBase, now: demoLeaveBy - 2 * 86_400_000, t: 4 },
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
      backedLuna: demoBackedTotal,
      committedLuna: demoCommittedTotal,
      now: demoNow,
      readAt: demoReadAt,
      network: 'testnet',
      verify: { endpoint: 'https://rpc.testnet.nimiqwatch.com', method: 'getStakerByAddress' },
      apiUrl: 'https://squad.example/api/proof/q7m2bt4h',
    },
  },
  {
    id: 'proof-view-no-read',
    props: {
      squad: demoSquadPage,
      members: demoRoster.map((member) => ({ ...member, isYou: false, status: null, readAt: null })),
      backedLuna: null,
      committedLuna: demoCommittedTotal,
      now: demoNow,
      readAt: null,
      network: 'testnet',
      verify: { endpoint: 'https://rpc.testnet.nimiqwatch.com', method: 'getStakerByAddress' },
      apiUrl: 'https://squad.example/api/proof/q7m2bt4h',
    },
  },
];
