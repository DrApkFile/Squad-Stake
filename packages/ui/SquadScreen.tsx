import { MemberList } from './MemberList';
import { GradientBorderButton } from './GradientBorderButton';
import { OrbitSquad } from './OrbitSquad';
import { ScreenHeader } from './ScreenHeader';
import { daysBetween, formatDay, formatLuna, readAge } from './format';
import { statusTone } from './status';
import type { MemberRowView } from './MemberList';
import type { OrbitMember } from './OrbitSquad';

export interface SquadScreenProps {
  squad: {
    name: string;
    shortId: string;
    mode: 'A' | 'B';
    targetLuna: number | null;
    recipient: string | null;
    goalAt: number;
  };
  members: readonly MemberRowView[];
  /** Σ commitments that the chain currently backs — PRD §7.4 "Squad total = Σ backed amounts".
   * `null` means no member has been read yet, and renders as "—". */
  backedLuna: number | null;
  /** Σ commitments on record, backed or not. */
  committedLuna: number;
  /** goal − 24 h − 2 h (PRD §7.5). The banner appears from three days before it. */
  leaveBy: number;
  now: number;
  /** When the oldest chain read behind this page happened; null while loading. */
  readAt: number | null;
  /** Null for squads created before the invite token was kept (migration 003): the page then
   * says the link cannot be recovered instead of showing a broken one. */
  inviteUrl: string | null;
  proofUrl: string;
  commitUrl: string;
  loading?: boolean | undefined;
  error?: { message: string; nextAction: string } | undefined;
  /** True once the container has put the invite link on the clipboard. */
  shared?: boolean | undefined;
  onShare?: (() => void) | undefined;
  onLeave?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  t?: number | undefined;
  demoLabel?: string | undefined;
  back?: { label: string; href: string } | undefined;
}

const THREE_DAYS_MS = 3 * 86_400_000;

function orbitMembers(members: readonly MemberRowView[]): readonly OrbitMember[] {
  return members.map((member) => ({
    id: member.id,
    identiconSvg: member.identiconSvg,
    tone: member.status === null ? 'NEUTRAL' : statusTone(member.status.status),
    label: member.isYou ? 'You' : member.shortAddress,
  }));
}

/** Screen 5. The squad's own page: the orbit, the roster with chain-derived statuses and the
 * age of every read, the leave-by banner and the share link. */
export function SquadScreen({
  squad,
  members,
  backedLuna,
  committedLuna,
  leaveBy,
  now,
  readAt,
  inviteUrl,
  proofUrl,
  commitUrl,
  loading = false,
  error,
  shared = false,
  onShare,
  onLeave,
  onRefresh,
  t = 0,
  demoLabel,
  back,
}: SquadScreenProps) {
  const days = daysBetween(now, squad.goalAt);
  const leaveDays = daysBetween(now, leaveBy);
  const showLeaveBy = leaveBy - now <= THREE_DAYS_MS;
  const you = members.find((member) => member.isYou);
  return (
    <main className="sheet" aria-busy={loading}>
      <ScreenHeader back={back} demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">{squad.mode === 'A' ? 'SHARED GOAL' : 'TOGETHER GOALS'}</p>
        <OrbitSquad
          goal={squad.name}
          members={orbitMembers(members)}
          backedLuna={loading ? null : backedLuna}
          targetLuna={squad.targetLuna}
          t={t}
        />
        <p className="intro">
          {formatLuna(committedLuna)} committed by {members.length}{' '}
          {members.length === 1 ? 'member' : 'members'}. Goal day {formatDay(squad.goalAt)}
          {days >= 0 ? `, in ${days} ${days === 1 ? 'day' : 'days'}` : ''}.
        </p>
        <p className="member-status-age">
          {backedLuna === null
            ? 'Backed total: — · no chain read yet'
            : `${formatLuna(backedLuna)} of that is backed by active stake`}
          {' · '}
          {readAge(readAt, now)}
        </p>
        {/* Every chain figure on this page can be re-read on demand, whether or not the last
            read failed: the age above is only meaningful next to a way to renew it. */}
        {onRefresh && (
          <button className="secondary-button secondary-button-quiet" onClick={onRefresh}>
            Check the chain again
          </button>
        )}

        {showLeaveBy && (
          <div className="banner" data-tone="SHORT" role="note">
            <p className="banner-title">
              Start leaving by {formatDay(leaveBy)}
              {leaveDays >= 0 ? ` — ${leaveDays} ${leaveDays === 1 ? 'day' : 'days'} left` : ''}
            </p>
            <p>
              Unstaking takes up to a day on the Nimiq chain, so a stake you want liquid on goal
              day has to start leaving before then. Nothing starts by itself.
            </p>
          </div>
        )}

        {error && (
          <div className="sheet-status" role="status" aria-live="polite">
            <p className="status-title">{error.message}</p>
            <p>{error.nextAction}</p>
          </div>
        )}

        <h2 className="section-title">Members</h2>
        <MemberList members={members} now={now} />

        {squad.mode === 'A' && squad.recipient !== null && (
          <p className="fine-print fine-print-left">
            On goal day, every share is paid to {squad.recipient}, the recipient fixed when the
            squad was created.
          </p>
        )}

        <h2 className="section-title">Share</h2>
        {inviteUrl === null ? (
          <p className="field-hint">
            This squad was created before invite links could be shown again, so its link cannot
            be recovered. New members need a link from whoever created it.
          </p>
        ) : (
          <>
            <p className="field-input field-input-mono">{inviteUrl}</p>
            <p className="field-hint">
              {shared
                ? 'Invite link copied.'
                : 'Anyone with this link can join, so share it only with your squad.'}
            </p>
          </>
        )}
        <p className="fine-print fine-print-left">
          Anyone can check this squad without signing in: <span className="mono">{proofUrl}</span>
        </p>
      </div>
      <footer className="sheet-footer">
        <a className="primary-button" href={commitUrl}>
          {you === undefined || you.committedLuna === 0 ? 'Commit my share' : 'Change my commitment'}
        </a>
        {inviteUrl !== null && <GradientBorderButton label="Share invite" onClick={onShare} t={t} />}
        {onLeave && (
          <button className="secondary-button" onClick={onLeave}>Leave squad</button>
        )}
      </footer>
    </main>
  );
}
