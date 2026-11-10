import { MemberList } from './MemberList';
import { GradientBorderButton } from './GradientBorderButton';
import { OrbitSquad } from './OrbitSquad';
import { ScreenHeader } from './ScreenHeader';
import { RefreshButton } from './Spinner';
import { InfoButton, InfoSheet } from './InfoSheet';
import { countdown, daysBetween, formatDay, formatLuna, formatMoment, readAge } from './format';
import { fiatLine, fiatNote, type FiatRate } from './fiat';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
import { statusTone } from './status';
import { exitBanner, leavingHint, stageLine, type StageTotalsView, type YourExitView }
  from './progress';
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
  /**
   * The same commitments split by the stage each share has reached. The orbit's centre shows
   * `coveredLuna` — every stage the chain accounts for — so a member who is leaving on
   * schedule is not reported as a missing share (packages/ui/progress.ts). Null before any
   * member has been read, and then the centre renders "—".
   */
  stages?: StageTotalsView | null | undefined;
  /**
   * The viewer's own exit. Anything but `stage: 'none'` replaces the leave-by banner with the
   * countdown and renders **no** start control, because leaving has already started.
   */
  yourExit?: YourExitView | null | undefined;
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
  onCopyInvite?: (() => void) | undefined;
  onCopyProof?: ((url: string) => void) | undefined;
  proofCopied?: boolean | undefined;
  /**
   * The ⓘ sheet, if one is open. The container owns which one, so this component stays pure
   * and the video can render any frame of the rise by passing `openedT` and `t`.
   */
  info?: { title: string; body: string; openedT: number } | null | undefined;
  onOpenInfo?: ((key: 'leaveBy') => void) | undefined;
  onCloseInfo?: (() => void) | undefined;
  onLeave?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  /** True while that read is in flight. */
  refreshing?: boolean | undefined;
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
  stages = null,
  yourExit = null,
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
  onCopyInvite,
  onCopyProof,
  proofCopied = false,
  info,
  onOpenInfo,
  onCloseInfo,
  onLeave,
  onRefresh,
  refreshing = false,
  t = 0,
  demoLabel,
  back,
  lang = DEFAULT_LANG,
}: SquadScreenProps) {
  const s = strings(lang);
  const days = daysBetween(now, squad.goalAt);
  const completed = state === 'COMPLETED';
  const you = members.find((member) => member.isYou);
  // Leaving has already started: the banner reports where the stake is, and the control that
  // starts it is not rendered at all (the second defect found on testnet, docs/PROGRESS.md
  // 2026-11-09). Only a member with nothing in the pipeline is offered the start.
  const exit = exitBanner(yourExit, now, lang);
  const showLeaveBy = exit === null && leaveBy - now <= THREE_DAYS_MS && !completed;
  // The centre counts every stage the chain accounts for, not active stake alone.
  const orbitTotal = stages === null ? backedLuna : stages.coveredLuna;
  return (
    <main className="sheet" aria-busy={loading}>
      <ScreenHeader back={back} title={squad.name} demoLabel={demoLabel} lang={lang} />
      <div className="sheet-body">
        <p className="eyebrow">{squad.mode === 'A' ? s.common.eyebrowModeA : s.common.eyebrowModeB}</p>
        {/* The name is in the top bar, so the orbit no longer repeats it: on a 390 px screen
            that was a whole line spent on the same three words. */}
        <OrbitSquad
          goal=""
          members={orbitMembers(members, s.common.you)}
          backedLuna={loading ? null : orbitTotal}
          targetLuna={squad.targetLuna}
          totalWord="saved"
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
          {stages === null
            ? s.common.backedTotalUnread
            : stageLine(stages, { leavingHint: leavingHint(yourExit, now, lang) }, lang)}
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
          <RefreshButton quiet onClick={onRefresh} refreshing={refreshing} t={t}
            label={s.common.refreshChain} busyLabel={s.common.refreshing} />
        )}

        {exit !== null && (
          <div className="banner" data-tone={exit.tone} role="note">
            <p className="banner-title">{exit.title}</p>
            {exit.note !== null && <p>{exit.note}</p>}
            <p className="banner-action">
              <a className="secondary-button secondary-button-quiet" href={leavingUrl}>
                {s.exit.viewProgress}
              </a>
            </p>
          </div>
        )}

        {showLeaveBy && (
          <div className="banner" data-tone="SHORT" role="note">
            <p className="banner-title">
              {s.squad.leaveByTitle(formatMoment(leaveBy, tzOffsetMinutes, lang))}
              {leaveBy > now
                ? s.squad.leaveByLeft(countdown(leaveBy - now, lang))
                : s.squad.leaveByPassed}
            </p>
            <p>{s.squad.leaveByShort}</p>
            <p className="banner-action">
              <a className="secondary-button secondary-button-quiet" href={leavingUrl}>
                {s.squad.startLeaving}
              </a>
              <InfoButton label={s.common.moreInfo} onOpen={() => onOpenInfo?.('leaveBy')} />
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

        {/* Each group of the page is a card, the way a phone app stacks them, rather than a
            run of headings down one scroll. */}
        <section className="card">
          <h2 className="card-title">{s.common.membersSection}</h2>
          <MemberList members={members} now={now} lang={lang} />
        </section>

        {squad.mode === 'A' && squad.recipient !== null && (
          <p className="meta">{s.squad.recipientNote(squad.recipient)}</p>
        )}

        {payments !== null && (
          <section className="card">
            <h2 className="card-title">{s.common.paymentsSection}</h2>
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
          </section>
        )}

        {/* The invite link is never printed. A link on screen invites a member to select it by
            hand on a phone, and it is the one string here that must not be mistyped; the
            share sheet and the clipboard both carry it exactly. */}
        <section className="card">
          <h2 className="card-title">{s.common.shareSection}</h2>
          {inviteUrl === null ? (
            <p className="meta">{s.squad.inviteMissing}</p>
          ) : (
            <>
              <GradientBorderButton label={s.squad.shareInvite} onClick={onShare} t={t} />
              <button className="link-button" type="button" onClick={onCopyInvite}>
                {shared ? s.common.copied : s.common.copyLink}
              </button>
              <p className="meta">{s.squad.inviteHint}</p>
            </>
          )}
        </section>
        {/* The public view is worth sharing with someone outside the squad, so the link is
            still available — as a copy, like the invite, rather than as printed text. */}
        <section className="card">
          <h2 className="card-title">{s.common.titleProof}</h2>
          <p className="meta">{s.squad.proofNote}</p>
          <button className="link-button" type="button"
            onClick={() => onCopyProof?.(proofUrl)}>
            {proofCopied ? s.common.copied : s.common.copyLink}
          </button>
        </section>
        {fiat !== null && <p className="fine-print fine-print-left">{fiatNote(fiat, now, lang)}</p>}
      </div>
      {/* A settled squad binds no stake any more, and the server refuses both of these with
          SQUAD_CLOSED (`isActive`, server/core/{commitments,squads}.ts). Offering them anyway
          sends the member to a sheet that can only refuse, so the banner above is the whole
          end of the story and the bar is not rendered (docs/AUDIT.md, F-2). */}
      {!completed && (
        <footer className="action-bar">
          <a className="primary-button" href={commitUrl}>
            {you === undefined || you.committedLuna === 0
              ? s.squad.commitMine
              : s.squad.changeCommitment}
          </a>
          {onLeave && (
            <button className="secondary-button" onClick={onLeave}>{s.squad.leaveSquad}</button>
          )}
        </footer>
      )}
      <InfoSheet info={info} t={t} onClose={onCloseInfo} lang={lang} />
    </main>
  );
}
