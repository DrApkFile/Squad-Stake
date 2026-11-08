import { daysBetween, formatDay, formatLuna, readAge } from './format';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
import { PoolCard, type PoolView } from './PoolCard';
import { ScreenHeader } from './ScreenHeader';

export type { PoolView } from './PoolCard';

export type JoinCommitState =
  | { status: 'not-staking'; minimumLuna: number }
  | { status: 'ready'; freeLuna: number }
  | { status: 'needs-stake'; shortfallLuna: number; action: 'create' | 'add'; feeLuna: number }
  | { status: 'waiting' }
  | { status: 'pending'; confirmations: number; requiredConfirmations: number }
  | { status: 'failed'; message: string; nextAction: string; changedAnything: boolean }
  | { status: 'committed'; committedLuna: number; freeLuna: number };

export interface JoinCommitSheetProps {
  /** Where the back control goes; see ScreenHeader. */
  back?: { label: string; href: string } | undefined;
  squad: { name: string; mode: 'A' | 'B'; targetLuna: number | null; goalAt: number; memberCount: number };
  /** NIM as typed; the container converts to luna. */
  amountNim: string;
  state: JoinCommitState;
  now: number;
  /** When the balance behind this screen was read from the chain; null = not read yet. */
  readAt: number | null;
  /**
   * PRD §7.7: the validator a **new** staker would join, with the pool's own name, fee and
   * payout type, shown before the Nimiq Pay approval — or the fallback notice when Nimiq's
   * Validators API could not be read. Null when the member is already staking, because this
   * screen then sends no `create` and chooses no validator.
   */
  pool?: PoolView | null | undefined;
  onAmountChange?: (value: string) => void;
  onCommit?: () => void;
  onApprove?: () => void;
  /** Re-check a tracked transaction by hand. Offered once automatic polling has given up, so
   * nothing is ever resent: this reads the chain, it does not call the wallet again
   * (briefing/FAILURE_MODES.md, "after a timeout or submission error, check status before
   * resending"). */
  onRefresh?: () => void;
  /** Polling ran for its two minutes without a verdict. */
  stalled?: boolean;
  demoLabel?: string;
  lang?: Lang | undefined;
}

/** Screen 6. One sheet for every outcome of joining and committing (PRD §7.3). */
export function JoinCommitSheet({
  squad, amountNim, state, now, readAt, pool = null, onAmountChange, onCommit, onApprove,
  onRefresh, stalled = false, demoLabel, back, lang = DEFAULT_LANG,
}: JoinCommitSheetProps) {
  const s = strings(lang);
  const busy = state.status === 'waiting' || state.status === 'pending';
  const done = state.status === 'committed';
  const days = daysBetween(now, squad.goalAt);
  // The pool belongs to the one action that joins a validator: creating the staker.
  const creating = state.status === 'not-staking'
    || (state.status === 'needs-stake' && state.action === 'create');
  return <main className="sheet" aria-busy={busy}>
    <ScreenHeader back={back} demoLabel={demoLabel} />
    <div className="sheet-body">
      <p className="eyebrow">{squad.mode === 'A' ? s.common.eyebrowModeA : s.common.eyebrowModeB}</p>
      <h1>{squad.name}</h1>
      <p className="intro">
        {squad.targetLuna === null
          ? s.commit.introTogether
          : s.commit.introShared(formatLuna(squad.targetLuna, lang))}
        {' '}{s.common.goalDayIn(formatDay(squad.goalAt, lang), days >= 0 ? days : null)}.
      </p>
      <p className="fine-print fine-print-left">
        {s.commit.membersLine(s.common.members(squad.memberCount))}
      </p>

      {!done && <label className="field">
        <span className="field-label">{s.commit.amountLabel}</span>
        <input className="field-input" type="text" inputMode="decimal" value={amountNim}
          placeholder="2000" disabled={busy}
          onChange={(event) => onAmountChange?.(event.target.value)} />
      </label>}

      <div className="sheet-status" data-status={state.status} role="status" aria-live="polite">
        {state.status === 'not-staking' && <>
          <p className="status-title">{s.commit.notStakingTitle}</p>
          <p>{s.commit.notStakingBody(formatLuna(state.minimumLuna, lang))}</p>
        </>}
        {state.status === 'ready' && <>
          <p className="status-title">{s.commit.readyTitle}</p>
          <p>{s.commit.readyBody(formatLuna(state.freeLuna, lang))}</p>
        </>}
        {state.status === 'needs-stake' && <>
          <p className="status-title">{s.commit.needsStakeTitle(formatLuna(state.shortfallLuna, lang))}</p>
          <p>{state.action === 'create'
            ? s.commit.needsCreateBody(formatLuna(state.feeLuna, lang))
            : s.commit.needsAddBody(formatLuna(state.feeLuna, lang))}</p>
        </>}
        {state.status === 'waiting' && <>
          <p className="status-title">{s.common.approveInPay}</p>
          <p>{s.common.nothingSentUntilApprove}</p>
        </>}
        {state.status === 'pending' && <>
          <p className="status-title">{s.commit.pendingTitle}</p>
          <p>{s.commit.pendingBody(state.confirmations, state.requiredConfirmations)}</p>
          {stalled && <p>{s.commit.stalled}</p>}
        </>}
        {state.status === 'failed' && <>
          <p className="status-title">{state.message}</p>
          <p>{state.nextAction}</p>
          {!state.changedAnything && <p>{s.common.nothingChanged}</p>}
        </>}
        {done && <>
          <p className="status-title">{s.commit.committedTitle(formatLuna(state.committedLuna, lang))}</p>
          <p>{s.commit.committedBody(formatLuna(state.freeLuna, lang))}</p>
        </>}
        <p className="member-status-age">{readAge(readAt, now, lang)}</p>
      </div>

      {creating && pool !== null && <PoolCard pool={pool} lang={lang} />}
    </div>
    <footer className="sheet-footer">
      {state.status === 'not-staking' || state.status === 'needs-stake'
        ? <button className="primary-button" onClick={onApprove} disabled={busy}>
          {state.status === 'not-staking' ? s.commit.createStaker : s.commit.addStake}
        </button>
        : <button className="primary-button" onClick={onCommit} disabled={busy || done}>
          {busy ? s.common.waiting : done ? s.commit.committed : s.commit.commit}
        </button>}
      {stalled && <button className="secondary-button" onClick={onRefresh}>
        {s.common.checkStatusAgain}
      </button>}
      <p className="fine-print">{s.common.cannotMoveNim}</p>
    </footer>
  </main>;
}
