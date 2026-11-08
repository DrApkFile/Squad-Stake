import type { MemberStatusBadgeProps } from '../MemberStatusBadge';
import recording from './chain-recording.json';

const readAt = Date.parse(recording.recordedAt);
const now = readAt + 30_000;
const releaseBlock = recording.releaseBlock;
const estimatedReleaseAt = readAt + (releaseBlock - recording.headBlock) * 1000;
// Catalog text is verified by Q17 without importing application code into pure UI.
const refreshError = { message: 'The chain could not be read just now.',
  nextAction: 'Nothing is lost. Refresh in a moment.' };

// Six derived UI states, including a one-luna SHORT boundary. These are explicitly
// synthetic cases based on S2/S3 testnet response shapes, NOT mainnet demo evidence.
export const memberStatusScenes: readonly { id: string; props: MemberStatusBadgeProps }[] = [
  { id: 'member-awaiting-read', props: { state: null, readAt: null, now } },
  { id: 'member-read-error', props: { state: null, readAt: null, now, refreshError } },
  { id: 'member-backed', props: { state: { status: 'BACKED' }, readAt, now } },
  { id: 'member-short', props: { state: { status: 'SHORT', shortBy: 1 }, readAt, now } },
  { id: 'member-unstaking', props: { state: { status: 'UNSTAKING', releaseBlock }, readAt, now, estimatedReleaseAt } },
  { id: 'member-releasable', props: { state: { status: 'RELEASABLE' }, readAt, now } },
  { id: 'member-retired', props: { state: { status: 'RETIRED' }, readAt, now } },
  { id: 'member-not-staking', props: { state: { status: 'NOT_STAKING' }, readAt, now } },
  { id: 'member-stale', props: { state: { status: 'BACKED' }, readAt, now: readAt + 180_000, refreshError } },
  { id: 'member-release-unknown', props: { state: { status: 'UNSTAKING', releaseBlock: null }, readAt, now } },
  { id: 'member-waiting-for-chain', props: { state: { status: 'UNSTAKING', releaseBlock }, readAt, now: estimatedReleaseAt, estimatedReleaseAt } },
];
