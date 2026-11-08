import { MemberList } from './MemberList';
import { GradientBorderButton } from './GradientBorderButton';
import { OrbitSquad } from './OrbitSquad';
import { ScreenHeader } from './ScreenHeader';
import { countdown, daysBetween, formatDay, formatLuna, formatMoment, readAge } from './format';
import { fiatLine, fiatNote, type FiatRate } from './fiat';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
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
  /** goal − 24 h − 2 h (PRD §7.5). The banner appears from three days before it, which is a
   * little over four days before goal day. */
  leaveBy: number;
  now: number;
  /** Minutes east of UTC, for the leave-by deadline. A prop, never read from the machine, so
   * the video renders the same frame (AGENTS.md "UI purity" 1). */
  tzOffsetMinutes: number;
  /** When the oldest chain read behind this page happened; null while loading. */
  readAt: number | null;
  /** Null for squads created before the invite token was kept (migration 003): the page then
   * says the link cannot be recovered instead of showing a broken one. */
  inviteUrl: string | null;
  proofUrl: string;
  commitUrl: string;
  /** Screen 7. Offered from the banner, because that is where the member is told to act. */
  leavingUrl: string;
  /** PRD §7.6, Mode A only: the settlement roster. Null for Mode B, where nobody pays
   * anybody, and every hash is public so a reader can re-check it. */
  payments?: {
    recipient: string; owing: number; paid: number;
    rows: readonly { address: string; hash: string | null; verified: boolean; code: string | null }[];
  } | null | undefined;
  /** PRD §8. COMPLETED is the only state this screen says anything about. */
  state?: string | undefined;
  /** Mode A: where this member pays their own share. */
  payUrl?: string | null | undefined;
  /** PRD §9.11: approximate fiat beside the target and the totals. Null when the price source
   * failed, and then nothing is shown (packages/ui/fiat.ts). */
  fiat?: FiatRate | null | undefined;
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
  lang?: Lang | undefined;
}

const THREE_DAYS_MS = 3 * 86_400_000;

function orbitMembers(
  members: readonly MemberRowView[], youLabel: string,
): readonly OrbitMember[] {
  return members.map((member) => ({
    id: member.id,
    identiconSvg: member.identiconSvg,
    tone: member.status === null ? 'NEUTRAL' : statusTone(member.status.status),
    label: member.isYou ? youLabel : member.shortAddress,
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
  tzOffsetMinutes,
  readAt,
  inviteUrl,
  proofUrl,
  commitUrl,
  leavingUrl,
  payments = null,
  state,
  payUrl = null,
  fiat = null,
  loading = false,
  error,
  shared = false,
  onShare,
  onLeave,
  onRefresh,
  t = 0,
  demoLabel,
  back,
  lang = DEFAULT_LANG,
}: SquadScreenProps) {
  const s = strings(lang);
  const days = daysBetween(now, squad.goalAt);
  const showLeaveBy = leaveBy - now <= THREE_DAYS_MS;
  const completed = state === 'COMPLETED';
  const you = members.find((member) => member.isYou);
  return (
    <main className="sheet" aria-busy={loading}>
      <ScreenHeader back={back} demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">{squad.mode === 'A' ? s.common.eyebrowModeA : s.common.eyebrowModeB}</p>
        <OrbitSquad
          goal={squad.name}
          members={orbitMembers(members, s.common.you)}
          backedLuna={loading ? null : backedLuna}
          targetLuna={squad.targetLuna}
          t={t}
          lang={lang}
        />
        <p className="intro">
          {s.squad.intro(
            formatLuna(committedLuna, lang),
            s.common.members(members.length),
            s.common.goalDayIn(formatDay(squad.goalAt, lang), days >= 0 ? days : null),
          )}
        </p>
        <p className="member-status-age">
          {backedLuna === null
            ? s.common.backedTotalUnread
            : s.squad.backedLine(formatLuna(backedLuna, lang))}
          {' · '}
          {readAge(readAt, now, lang)}
        </p>
        {/* The estimate is extra, under the figures it approximates, and it names its source
            and age in the note below (PRD §9.11). */}
        {fiat !== null && (
          <p className="member-status-age squad-fiat">
            {fiatLine(squad.targetLuna ?? committedLuna, fiat, lang)}
          </p>
        )}
        {/* Every chain figure on this page can be re-read on demand, whether or not the last
            read failed: the age above is only meaningful next to a way to renew it. */}
        {onRefresh && (
          <button className="secondary-button secondary-button-quiet" onClick={onRefresh}>
            {s.common.refreshChain}
          </button>
        )}

        {showLeaveBy && !completed && (
          <div className="banner" data-tone="SHORT" role="note">
            <p className="banner-title">
              {s.squad.leaveByTitle(formatMoment(leaveBy, tzOffsetMinutes, lang))}
              {leaveBy > now
                ? s.squad.leaveByLeft(countdown(leaveBy - now, lang))
                : s.squad.leaveByPassed}
            </p>
            <p>{s.squad.leaveByBody}</p>
            <p className="banner-action">
              <a className="secondary-button secondary-button-quiet" href={leavingUrl}>
                {s.squad.startLeaving}
              </a>
            </p>
          </div>
        )}

        {completed && (
          <div className="banner" data-tone="BACKED" role="note">
            <p className="banner-title">{s.squad.completeTitle}</p>
            <p>{s.squad.completeBody}</p>
          </div>
        )}

        {error && (
          <div className="sheet-status" role="status" aria-live="polite">
            <p className="status-title">{error.message}</p>
            <p>{error.nextAction}</p>
          </div>
        )}

        <h2 className="section-title">{s.common.membersSection}</h2>
        <MemberList members={members} now={now} lang={lang} />

        {squad.mode === 'A' && squad.recipient !== null && (
          <p className="fine-print fine-print-left">{s.squad.recipientNote(squad.recipient)}</p>
        )}

        {payments !== null && (
          <>
            <h2 className="section-title">{s.common.paymentsSection}</h2>
            <p className="member-status-age">
              {s.common.paidOf(payments.paid, payments.owing)}
            </p>
            <ul className="payment-list">
              {payments.rows.map((row) => (
                <li className="payment-row" key={row.address} data-verified={row.verified ? 'yes' : 'no'}>
                  <span className="payment-who">{row.address}</span>
                  <span className="payment-state">
                    {row.verified ? s.common.paymentVerified
                      : row.hash === null ? s.common.paymentNone
                        : s.common.paymentUncounted}
                  </span>
                  {/* The hash is public on purpose: a reader re-checks it on an explorer
                      (briefing/PROOF_PLAN.md "Verify it yourself"). */}
                  {row.hash !== null && <span className="payment-hash mono">{row.hash}</span>}
                </li>
              ))}
            </ul>
            {payUrl !== null && (
              <a className="secondary-button secondary-button-quiet" href={payUrl}>
                {s.common.payMyShare}
              </a>
            )}
          </>
        )}

        <h2 className="section-title">{s.common.shareSection}</h2>
        {inviteUrl === null ? (
          <p className="field-hint">{s.squad.inviteMissing}</p>
        ) : (
          <>
            <p className="field-input field-input-mono">{inviteUrl}</p>
            <p className="field-hint">
              {shared ? s.squad.inviteCopied : s.squad.inviteHint}
            </p>
          </>
        )}
        <p className="fine-print fine-print-left">
          {s.squad.proofNote} <span className="mono">{proofUrl}</span>
        </p>
        {fiat !== null && <p className="fine-print fine-print-left">{fiatNote(fiat, now, lang)}</p>}
      </div>
      <footer className="sheet-footer">
        <a className="primary-button" href={commitUrl}>
          {you === undefined || you.committedLuna === 0
            ? s.squad.commitMine
            : s.squad.changeCommitment}
        </a>
        {inviteUrl !== null && <GradientBorderButton label={s.squad.shareInvite} onClick={onShare} t={t} />}
        {onLeave && (
          <button className="secondary-button" onClick={onLeave}>{s.squad.leaveSquad}</button>
        )}
      </footer>
    </main>
  );
}
