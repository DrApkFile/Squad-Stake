import { daysBetween, formatDay, formatLuna, readAge } from './format';
import { ScreenHeader } from './ScreenHeader';

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
}

/** Screen 6. One sheet for every outcome of joining and committing (PRD §7.3). */
export function JoinCommitSheet({
  squad, amountNim, state, now, readAt, onAmountChange, onCommit, onApprove, onRefresh,
  stalled = false, demoLabel, back,
}: JoinCommitSheetProps) {
  const busy = state.status === 'waiting' || state.status === 'pending';
  const done = state.status === 'committed';
  const days = daysBetween(now, squad.goalAt);
  return <main className="sheet" aria-busy={busy}>
    <ScreenHeader back={back} demoLabel={demoLabel} />
    <div className="sheet-body">
      <p className="eyebrow">{squad.mode === 'A' ? 'SHARED GOAL' : 'TOGETHER GOALS'}</p>
      <h1>{squad.name}</h1>
      <p className="intro">
        {squad.targetLuna === null ? 'Own targets, shared date.' : `${formatLuna(squad.targetLuna)} together.`}
        {' '}Goal day {formatDay(squad.goalAt)}{days >= 0 ? `, in ${days} ${days === 1 ? 'day' : 'days'}` : ''}.
      </p>
      <p className="fine-print fine-print-left">
        {squad.memberCount} {squad.memberCount === 1 ? 'member' : 'members'} · your NIM never leaves your wallet
      </p>

      {!done && <label className="field">
        <span className="field-label">Your commitment (NIM)</span>
        <input className="field-input" type="text" inputMode="decimal" value={amountNim}
          placeholder="2000" disabled={busy}
          onChange={(event) => onAmountChange?.(event.target.value)} />
      </label>}

      <div className="sheet-status" data-status={state.status} role="status" aria-live="polite">
        {state.status === 'not-staking' && <>
          <p className="status-title">You are not staking yet</p>
          <p>Create a staker with at least {formatLuna(state.minimumLuna)} to back your commitment.
            It stays yours and it earns.</p>
        </>}
        {state.status === 'ready' && <>
          <p className="status-title">Backed by your stake</p>
          <p>{formatLuna(state.freeLuna)} of your active stake is free to commit.</p>
        </>}
        {state.status === 'needs-stake' && <>
          <p className="status-title">{formatLuna(state.shortfallLuna)} more stake needed</p>
          <p>{state.action === 'create' ? 'Create a staker' : 'Add to your stake'} in Nimiq Pay
            (fee {formatLuna(state.feeLuna)}), then commit.</p>
        </>}
        {state.status === 'waiting' && <>
          <p className="status-title">Approve in Nimiq Pay</p>
          <p>Nothing is sent until you approve.</p>
        </>}
        {state.status === 'pending' && <>
          <p className="status-title">Waiting for the chain</p>
          <p>{state.confirmations} of {state.requiredConfirmations} confirmations. A hash is not
            success, so your commitment is saved once the chain confirms it.</p>
          {stalled && <p>Still unconfirmed after two minutes. Nothing was resent — check again
            when you like.</p>}
        </>}
        {state.status === 'failed' && <>
          <p className="status-title">{state.message}</p>
          <p>{state.nextAction}</p>
          {!state.changedAnything && <p>Nothing changed.</p>}
        </>}
        {done && <>
          <p className="status-title">Committed {formatLuna(state.committedLuna)}</p>
          <p>Backed by your own stake. {formatLuna(state.freeLuna)} still free.</p>
        </>}
        <p className="member-status-age">{readAge(readAt, now)}</p>
      </div>
    </div>
    <footer className="sheet-footer">
      {state.status === 'not-staking' || state.status === 'needs-stake'
        ? <button className="primary-button" onClick={onApprove} disabled={busy}>
          {state.status === 'not-staking' ? 'Create staker in Nimiq Pay' : 'Add stake in Nimiq Pay'}
        </button>
        : <button className="primary-button" onClick={onCommit} disabled={busy || done}>
          {busy ? 'Waiting…' : done ? 'Committed' : 'Commit'}
        </button>}
      {stalled && <button className="secondary-button" onClick={onRefresh}>Check status again</button>}
      <p className="fine-print">Squad Stake cannot move your NIM. Only your approval can.</p>
    </footer>
  </main>;
}
