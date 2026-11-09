import { countdown, formatLuna } from './format';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
import type { SquadStatusTone } from './StatusDot';

/**
 * PRD §7.4's squad total, worded by stage. The wire twin of
 * `apps/web/src/server/core/squad-stages.ts`.
 *
 * Why: the squad page read "0 NIM backed" for a member who had started leaving exactly as the
 * plan asks them to, which reads as failure (docs/PROGRESS.md 2026-11-09). Leaving, ready,
 * withdrawn and paid are stages of the same journey and keep counting toward the squad's
 * progress under their own names; only a member who is genuinely short is missing.
 */
export interface StageTotalsView {
  backedLuna: number;
  leavingLuna: number;
  readyLuna: number;
  withdrawnLuna: number;
  paidLuna: number;
  missingLuna: number;
  unreadLuna: number;
  /** backed + leaving + ready + withdrawn + paid: the figure in the orbit's centre. */
  coveredLuna: number;
}

export type ExitStageName = 'none' | 'leaving' | 'ready' | 'withdrawn' | 'paid';

export interface YourExitView {
  stage: ExitStageName;
  committedLuna: number;
  /** Derived from the inactivation's inclusion block on the server; null while unknown, and
   * then the screen says so rather than guessing a time. */
  release: { releaseBlock: number; remainingBlocks: number; estimatedReleaseAt: number;
    jailed: boolean } | null;
  headBlock: number | null;
}

/**
 * "0 saved · 150 leaving (ready in ~14 h)". Only non-zero stages appear, so a squad where
 * everyone is simply saving still reads as one short phrase.
 *
 * `readyIn` is appended to the leaving stage when the viewer's own release time is known: it is
 * their countdown, and nobody else's release is derived on this screen.
 */
export function stageLine(
  stages: StageTotalsView,
  options: { leavingHint?: string | null | undefined } = {},
  lang: Lang = DEFAULT_LANG,
): string {
  const s = strings(lang).stages;
  const amount = (luna: number) => formatLuna(luna, lang);
  const parts: string[] = [];
  // Saved is always said, even at zero: it is the figure the squad is actually about, and
  // hiding it would make "150 leaving" look like the whole story.
  parts.push(s.saved(amount(stages.backedLuna)));
  if (stages.leavingLuna > 0) {
    const hint = options.leavingHint;
    parts.push(hint ? `${s.leaving(amount(stages.leavingLuna))} ${hint}`
      : s.leaving(amount(stages.leavingLuna)));
  }
  if (stages.readyLuna > 0) parts.push(s.ready(amount(stages.readyLuna)));
  if (stages.withdrawnLuna > 0) parts.push(s.withdrawn(amount(stages.withdrawnLuna)));
  if (stages.paidLuna > 0) parts.push(s.paid(amount(stages.paidLuna)));
  if (stages.missingLuna > 0) parts.push(s.missing(amount(stages.missingLuna)));
  if (stages.unreadLuna > 0) parts.push(s.unread(amount(stages.unreadLuna)));
  return parts.join(' · ');
}

/** The parenthesis after "150 leaving", or null when nothing is known about the release. */
export function leavingHint(
  exit: YourExitView | null, now: number, lang: Lang = DEFAULT_LANG,
): string | null {
  const s = strings(lang).stages;
  if (exit === null || exit.stage !== 'leaving') return null;
  if (exit.release === null) return null;
  const released = exit.headBlock !== null && exit.headBlock >= exit.release.releaseBlock;
  if (released) return s.readyNow;
  return s.readyIn(countdown(Math.max(0, exit.release.estimatedReleaseAt - now), lang));
}

export interface ExitBanner {
  title: string;
  note: string | null;
  tone: SquadStatusTone;
}

/**
 * The leave-by banner once leaving has started. Any stage but `none` means the member has
 * already acted, so the banner reports where their stake is instead of inviting them to start
 * again — the second of the three defects found on testnet. The caller renders no start
 * control when this returns a banner.
 */
export function exitBanner(
  exit: YourExitView | null, now: number, lang: Lang = DEFAULT_LANG,
): ExitBanner | null {
  if (exit === null || exit.stage === 'none') return null;
  const s = strings(lang).exit;
  const amount = formatLuna(exit.committedLuna, lang);
  switch (exit.stage) {
    case 'withdrawn':
      return { title: s.withdrawnTitle(amount), note: null, tone: 'READY' };
    case 'paid':
      return { title: s.paidTitle(amount), note: null, tone: 'BACKED' };
    case 'ready':
      return { title: s.readyTitle(amount), note: s.readyNote, tone: 'READY' };
    default: {
      // Leaving. An unknown release time is said plainly: a guess here would be a date the
      // chain has not promised (briefing/FAILURE_MODES.md, "retire before release").
      if (exit.release === null) {
        return { title: s.unlockUnknown(amount), note: s.unlockUnknownNote, tone: 'UNSTAKING' };
      }
      const released = exit.headBlock !== null && exit.headBlock >= exit.release.releaseBlock;
      if (released) return { title: s.readyTitle(amount), note: s.readyNote, tone: 'READY' };
      const left = countdown(Math.max(0, exit.release.estimatedReleaseAt - now), lang);
      return {
        title: s.unlocksIn(amount, left),
        note: exit.release.jailed ? s.jailed : s.unlockNote,
        tone: 'UNSTAKING',
      };
    }
  }
}

/**
 * The same split, computed from member rows, for fixture scenes and for the video — which both
 * hold rosters rather than server totals.
 *
 * This mirrors `apps/web/src/server/core/squad-stages.ts`, which cannot be imported here
 * (`packages/ui` never imports from the app). `tests/unit/squad-stages.test.ts` runs both over
 * the same rows and asserts they agree, so the two cannot drift apart unnoticed.
 */
export function stageTotalsOf(
  rows: readonly { committedLuna: number; status: { status: string } | null }[],
): StageTotalsView | null {
  const active = rows.filter((row) => row.status?.status !== 'LEFT');
  if (active.length === 0 || active.every((row) => row.status === null)) return null;
  const totals = { backedLuna: 0, leavingLuna: 0, readyLuna: 0, withdrawnLuna: 0, paidLuna: 0,
    missingLuna: 0, unreadLuna: 0, coveredLuna: 0 };
  for (const row of active) {
    const luna = row.committedLuna;
    switch (row.status?.status) {
      case 'BACKED': totals.backedLuna += luna; break;
      case 'UNSTAKING': totals.leavingLuna += luna; break;
      case 'RELEASABLE':
      case 'RETIRED': totals.readyLuna += luna; break;
      case 'WITHDRAWN': totals.withdrawnLuna += luna; break;
      case 'PAID': totals.paidLuna += luna; break;
      case undefined: totals.unreadLuna += luna; break;
      default: totals.missingLuna += luna; break;
    }
  }
  totals.coveredLuna = totals.backedLuna + totals.leavingLuna + totals.readyLuna
    + totals.withdrawnLuna + totals.paidLuna;
  return totals;
}
