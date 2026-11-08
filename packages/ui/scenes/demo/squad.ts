import { shortAddress } from '../../format';
import { demoIdenticonList } from './identicons';
import type { MemberRowView } from '../../MemberList';
import type { OrbitMember } from '../../OrbitSquad';
import type { MemberStatusView } from '../../status';

// Hand-written sample data for the how-to walkthrough video and the scene gallery
// (AGENTS.md "UI purity" 5). Realistic but invented: no real squad, no real wallet, and
// never a usage statistic. Fixed instants keep every render deterministic.
export const DEMO_LABEL = 'SAMPLE DATA — not a real squad';

export const demoNow = Date.parse('2026-11-06T10:15:00Z');
export const demoReadAt = demoNow - 24_000;
export const demoGoalAt = Date.parse('2026-12-18T00:00:00Z');

export const demoSharedSquad = {
  name: 'Lisbon in April',
  mode: 'A' as const,
  targetLuna: 1_200_000_000,
  goalAt: demoGoalAt,
  memberCount: 4,
};
export const demoTogetherSquad = {
  name: 'Winter buffers',
  mode: 'B' as const,
  targetLuna: null,
  goalAt: demoGoalAt,
  memberCount: 3,
};
/** 2,000 NIM commitment, 3,500 NIM active stake: the numbers the walkthrough narrates. */
export const demoCommitmentLuna = 200_000_000;
export const demoFreeLuna = 150_000_000;

// --- Sample people, squads and goals for the new screens -------------------
// Invented addresses with real Nimiq identicons (see demo/identicons.ts). Nothing here is a
// real squad, a real wallet or a usage figure.

export const demoLeaveBy = demoGoalAt - 26 * 3_600_000;

export const demoGoals: readonly string[] = [
  'Trip to Lisbon',
  'Wedding gift',
  'New laptop',
  'Rent buffer',
  'Festival tickets',
];

const TONES = ['BACKED', 'BACKED', 'SHORT', 'UNSTAKING', 'READY', 'BACKED'] as const;

/** `count` sample seats with no status at all: what a list card shows, because a card reads no
 * chain and may not imply one (AGENTS.md "Never fabricate"). */
export function demoCardMembers(count: number): readonly OrbitMember[] {
  return demoOrbitMembers(count).map((member) => ({ ...member, tone: 'NEUTRAL' as const,
    label: `${member.label} — status not read on this screen` }));
}

/** `count` sample seats for an orbit, cycling through the generated identicons and tones. */
export function demoOrbitMembers(count: number): readonly OrbitMember[] {
  return Array.from({ length: count }, (_, index) => {
    const identicon = demoIdenticonList[index % demoIdenticonList.length];
    return {
      id: `sample-${index}`,
      identiconSvg: identicon?.svg ?? null,
      tone: TONES[index % TONES.length] ?? 'NEUTRAL',
      label: `Sample member ${index + 1}`,
    };
  });
}

/** The welcome screen's "Example squad": a picture of the idea, labelled as a sample. */
export const demoExample = {
  goal: 'Example squad',
  label: 'Example squad',
  members: demoOrbitMembers(5),
  backedLuna: 740_000_000,
  targetLuna: 1_200_000_000,
};

const STATUSES: readonly MemberStatusView[] = [
  { status: 'BACKED' },
  { status: 'BACKED' },
  { status: 'SHORT', shortBy: null },
  { status: 'UNSTAKING', releaseBlock: null },
];

const COMMITMENTS = [200_000_000, 250_000_000, 180_000_000, 110_000_000];

/** The roster of the sample shared-goal squad. The first row is "you". */
export const demoRoster: readonly MemberRowView[] = demoIdenticonList
  .slice(0, 4)
  .map((identicon, index) => ({
    id: identicon.address,
    shortAddress: shortAddress(identicon.address),
    fullAddress: identicon.address,
    identiconSvg: identicon.svg,
    committedLuna: COMMITMENTS[index] ?? 0,
    status: STATUSES[index] ?? null,
    readAt: demoReadAt,
    isYou: index === 0,
    pending: null,
  }));

/** Σ commitments on record, and the part of it the sample chain read backs. */
export const demoCommittedTotal = COMMITMENTS.reduce((sum, amount) => sum + amount, 0);
export const demoBackedTotal = demoRoster
  .filter((member) => member.status?.status === 'BACKED')
  .reduce((sum, member) => sum + member.committedLuna, 0);

export const demoSquadPage = {
  name: demoSharedSquad.name,
  shortId: 'q7m2bt4h',
  mode: 'A' as const,
  targetLuna: demoSharedSquad.targetLuna,
  recipient: 'NQ33 8T0G YF8K 1U0M 3SMF 5LTA 2DB1 9SKF HNGN',
  goalAt: demoGoalAt,
};

export const demoInviteUrl = 'https://squad.example/s/4f1c8a7b2d9e0315a6c4b8d7e2f10934';
export const demoProofUrl = 'https://squad.example/proof/q7m2bt4h';
