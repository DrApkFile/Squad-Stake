import type { ReactNode } from 'react';
import { ScreenHeader } from './ScreenHeader';
import { TxStatus } from './TxStatus';
import { countdown, formatCount, formatLuna, formatMoment, readAge } from './format';
import { DEFAULT_LANG, strings, type Lang } from './i18n';

export type LeavingStepState =
  | { state: 'locked' }
  | { state: 'available' }
  /** Inactive stake exists, but the chain has not released it yet (Q11). */
  | { state: 'waiting' }
  | { state: 'pending'; hash: string }
  | { state: 'failed'; hash: string }
  | { state: 'done'; hash: string | null };

export interface LeavingStepsProps {
  squad: { name: string; shortId: string; mode: 'A' | 'B'; goalAt: number };
  leaveBy: number;
  now: number;
  /** Minutes east of UTC. A prop, never read from the machine, so the app, the video and a
   * test all render the same frame (AGENTS.md "UI purity" 1). */
  tzOffsetMinutes: number;
  /** The viewer's own stake. Null when they are not staking at all. */
  stake: { activeLuna: number; inactiveLuna: number; retiredLuna: number } | null;
  shareLuna: number;
  /** What step one will inactivate, as typed in NIM; the container converts at the edge. */
  amountNim: string;
  steps: {
    start: LeavingStepState; retire: LeavingStepState; withdraw: LeavingStepState;
    pay: LeavingStepState | null;
  };
  /** Null when the release cannot be derived yet, which keeps retire switched off. */
  release: {
    releaseBlock: number; remainingBlocks: number; estimatedReleaseAt: number; jailed: boolean;
  } | null;
  headBlock: number | null;
  /** Other squads that would show this member short once step one lands (PRD §7.5). */
  affected: readonly { squadId: string; name: string; committedLuna: number }[];
  shortfallLuna: number;
  confirmTicked: boolean;
  readAt: number | null;
  retireFeeLuna: number;
  unstakeFeeLuna: number;
  busy?: boolean | undefined;
  stalled?: boolean | undefined;
  error?: { message: string; nextAction: string } | undefined;
  /** Offered when what just failed can be attempted again and nothing was sent. The container
   * decides that from the error catalogue's own flags and from the step the chain now reports,
   * so this is never a blind resend of a wallet call (AGENTS.md invariant 8). */
  onRetry?: (() => void) | undefined;
  explorerBase?: string | null | undefined;
  /** Mode A only: where "Pay my share" lives once the NIM is back in the wallet. */
  payUrl?: string | null | undefined;
  t?: number | undefined;
  onAmountChange?: ((value: string) => void) | undefined;
  onStartLeaving?: (() => void) | undefined;
  onConfirmTick?: ((ticked: boolean) => void) | undefined;
  onRetire?: (() => void) | undefined;
  onWithdraw?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  back?: { label: string; href: string } | undefined;
  demoLabel?: string | undefined;
  lang?: Lang | undefined;
}

function chip(state: LeavingStepState['state'], lang: Lang) {
  const s = strings(lang).leaving;
  const chips: Record<LeavingStepState['state'], string> = {
    locked: s.chipLocked, available: s.chipAvailable, waiting: s.chipWaiting,
    pending: s.chipPending, failed: s.chipFailed, done: s.chipDone,
  };
  return chips[state];
}

function Step({ index, title, state, lang, children }: {
  index: number; title: string; state: LeavingStepState; lang: Lang; children?: ReactNode;
}) {
  return (
    <section className="step" data-state={state.state}>
      <h2 className="step-title">
        <span className="step-index" aria-hidden="true">{index}</span>
        {title}
        <span className="step-chip" data-state={state.state}>{chip(state.state, lang)}</span>
      </h2>
      <div className="step-body">{children}</div>
    </section>
  );
}

/**
 * Screen 7 (PRD §7.5). Three taps, each its own Nimiq Pay approval, in order, and never
 * automatic: the only thing that happens by itself on this screen is reading the chain.
 */
export function LeavingSteps(props: LeavingStepsProps) {
  const {
    squad, leaveBy, now, tzOffsetMinutes, stake, shareLuna, amountNim, steps, release, headBlock,
    affected, shortfallLuna, confirmTicked, readAt, retireFeeLuna, unstakeFeeLuna, busy = false,
    stalled = false, error, explorerBase = null, payUrl = null, t = 0, onAmountChange,
    onStartLeaving, onConfirmTick, onRetire, onWithdraw, onRefresh, onRetry, back, demoLabel,
    lang = DEFAULT_LANG,
  } = props;
  const s = strings(lang);
  // The one moving value on the screen. `t` is seconds since the screen appeared, so the
  // countdown ticks in the app and renders frame by frame in the video.
  const instant = now + Math.round(t * 1000);
  const explorer = (hash: string) => (explorerBase === null ? null : `${explorerBase}${hash}`);
  const tx = (state: LeavingStepState) =>
    state.state === 'pending' || state.state === 'failed'
      ? <TxStatus state={state.state === 'pending' ? 'pending' : 'failed'} hash={state.hash}
        stalled={stalled} explorerUrl={explorer(state.hash)} lang={lang}
        {...(onRefresh ? { onRefresh } : {})} />
      : null;

  return (
    <main className="sheet" aria-busy={busy}>
      <ScreenHeader back={back} title={s.common.titleLeaving} demoLabel={demoLabel} lang={lang} />
      <div className="sheet-body">
        <p className="eyebrow">{s.leaving.eyebrow(squad.shortId.toUpperCase())}</p>
        <h1>{s.leaving.headingTop}<br />{s.leaving.headingBottom}</h1>
        <p className="intro">{s.leaving.intro(squad.name, formatLuna(shareLuna, lang))}</p>
        <div className="banner" role="note">
          <p className="banner-title">
            {s.leaving.leaveByTitle(formatMoment(leaveBy, tzOffsetMinutes, lang))}
          </p>
          <p>
            {leaveBy > instant
              ? s.leaving.leaveByLeft(countdown(leaveBy - instant, lang))
              : s.leaving.leaveByPassed}{' '}
            {s.leaving.goalDayIs(formatMoment(squad.goalAt, tzOffsetMinutes, lang))}
          </p>
        </div>
        <p className="member-status-age">
          {stake === null
            ? s.leaving.noStake
            : s.leaving.stakeLine(
              formatLuna(stake.activeLuna, lang),
              formatLuna(stake.inactiveLuna, lang),
              formatLuna(stake.retiredLuna, lang),
            )}
          {' · '}{readAge(readAt, now, lang)}
        </p>

        <Step index={1} title={s.leaving.step1} state={steps.start} lang={lang}>
          {steps.start.state === 'available' && <>
            <label className="field">
              <span className="field-label">{s.leaving.amountLabel}</span>
              <input className="field-input" type="text" inputMode="decimal" value={amountNim}
                placeholder="2000" disabled={busy}
                onChange={(event) => onAmountChange?.(event.target.value)} />
              <span className="field-hint">
                {s.leaving.amountHint(
                  formatLuna(shareLuna, lang), formatLuna(unstakeFeeLuna, lang),
                )}
              </span>
            </label>
            {shortfallLuna > 0 && (
              <div className="banner" role="note">
                <p className="banner-title">
                  {s.leaving.shortfallTitle(formatLuna(shortfallLuna, lang))}
                </p>
                <p>
                  {s.leaving.shortfallBody}
                  {affected.length > 0 && s.leaving.shortfallAffected}
                </p>
                {affected.length > 0 && (
                  <ul className="affected-list">
                    {affected.map((squadRow) => (
                      <li key={squadRow.squadId}>
                        {s.leaving.affectedRow(
                          squadRow.name, formatLuna(squadRow.committedLuna, lang),
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <button className="primary-button" onClick={onStartLeaving} disabled={busy}>
              {busy ? s.common.waiting : s.leaving.startButton}
            </button>
          </>}
          {steps.start.state === 'locked' && <p>{s.leaving.step1Locked}</p>}
          {steps.start.state === 'done' && <p>{s.leaving.step1Done}</p>}
          {tx(steps.start)}
        </Step>

        <Step index={2} title={s.leaving.step2} state={steps.retire} lang={lang}>
          {steps.retire.state === 'waiting' && <>
            <p>
              {release === null
                ? s.leaving.releaseUnknown
                : s.leaving.releaseAbout(
                  countdown(Math.max(0, release.estimatedReleaseAt - instant), lang),
                )}
            </p>
            {release !== null && (
              <p className="field-hint">
                {s.leaving.releaseDetail(
                  formatCount(release.releaseBlock, lang),
                  headBlock === null ? null : formatCount(headBlock, lang),
                  formatMoment(release.estimatedReleaseAt, tzOffsetMinutes, lang),
                )}
                {release.jailed && s.leaving.releaseJailed}
              </p>
            )}
          </>}
          {steps.retire.state === 'available' && <>
            <p>{s.leaving.retireBody(formatLuna(retireFeeLuna, lang))}</p>
            <label className="confirm-tick">
              <input type="checkbox" checked={confirmTicked} disabled={busy}
                onChange={(event) => onConfirmTick?.(event.target.checked)} />
              <span>{s.leaving.confirmTick}</span>
            </label>
            <button className="primary-button" onClick={onRetire} disabled={busy || !confirmTicked}>
              {busy ? s.common.waiting : s.leaving.retireButton}
            </button>
          </>}
          {steps.retire.state === 'locked' && <p>{s.leaving.step2Locked}</p>}
          {steps.retire.state === 'done' && <p>{s.leaving.step2Done}</p>}
          {tx(steps.retire)}
        </Step>

        <Step index={3} title={s.leaving.step3} state={steps.withdraw} lang={lang}>
          {steps.withdraw.state === 'available' && <>
            <p>{s.leaving.withdrawBody(formatLuna(stake?.retiredLuna ?? 0, lang))}</p>
            <button className="primary-button" onClick={onWithdraw} disabled={busy}>
              {busy ? s.common.waiting : s.leaving.withdrawButton}
            </button>
          </>}
          {steps.withdraw.state === 'locked' && <p>{s.leaving.step3Locked}</p>}
          {steps.withdraw.state === 'done' && <p>{s.leaving.step3Done}</p>}
          {tx(steps.withdraw)}
        </Step>

        {steps.pay !== null && (
          <Step index={4} title={s.leaving.step4} state={steps.pay} lang={lang}>
            {steps.pay.state === 'available' && payUrl !== null
              ? <>
                <p>{s.leaving.payBody(formatLuna(shareLuna, lang))}</p>
                <a className="primary-button" href={payUrl}>{s.common.payMyShare}</a>
              </>
              : steps.pay.state === 'done'
                ? <p>{s.leaving.payDone}</p>
                : <p>{s.leaving.payLocked}</p>}
            {tx(steps.pay)}
          </Step>
        )}

      </div>
      {/* The failure and its way out are pinned, not printed at the foot of a four-step page.
          A network error used to leave every step locked and the only control — "Refresh" —
          below the fold, which reads as a dead end at exactly the moment a member has NIM
          mid-exit and needs to know what to do next. */}
      <footer className="action-bar">
        {error && (
          <div className="error-note" role="alert">
            <p className="status-title">{error.message}</p>
            <p>{error.nextAction}</p>
          </div>
        )}
        {error && onRetry && (
          <button className="primary-button" onClick={onRetry} disabled={busy}>
            {busy ? s.common.waiting : s.common.tryAgain}
          </button>
        )}
        {/* Always offered: every figure above is a chain read, and an age is only meaningful
            next to a way to renew it. Reading is not sending. */}
        <button className="secondary-button" onClick={onRefresh}>{s.common.refreshChain}</button>
        <p className="fine-print">{s.leaving.fineprint}</p>
      </footer>
    </main>
  );
}
