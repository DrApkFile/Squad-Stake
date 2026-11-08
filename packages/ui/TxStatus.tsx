import { ScreenHeader } from './ScreenHeader';

export type TxStatusState = 'pending' | 'failed' | 'done' | 'unknown';

export interface TxStatusProps {
  state: TxStatusState;
  hash: string;
  confirmations?: number | null | undefined;
  requiredConfirmations?: number | undefined;
  /** Polling ran its whole window without a verdict (five seconds × 24 ≈ two minutes). */
  stalled?: boolean | undefined;
  /** Where a reader can look the hash up themselves; null when no explorer is configured. */
  explorerUrl?: string | null | undefined;
  /** Reads the chain again. It never resends anything — that is the whole point of offering
   * it (briefing/FAILURE_MODES.md: check status before resending, never auto-retry). */
  onRefresh?: (() => void) | undefined;
}

const TITLES: Record<TxStatusState, string> = {
  pending: 'Waiting for the chain',
  failed: 'That transaction failed',
  done: 'Confirmed on-chain',
  unknown: 'Outcome not known yet',
};

/**
 * Screen 9, as a block rather than a screen of its own: it sits inside whichever sheet started
 * the transaction, so the member never loses the step they were on. The hash is always shown
 * and always linkable — a hash is not success, and the way to tell is to look it up (Q10).
 */
export function TxStatus({
  state, hash, confirmations = null, requiredConfirmations, stalled = false,
  explorerUrl = null, onRefresh,
}: TxStatusProps) {
  return (
    <div className="tx-status" data-state={state} role="status" aria-live="polite">
      <p className="status-title">{TITLES[state]}</p>
      {state === 'pending' && requiredConfirmations !== undefined && (
        <p>
          {confirmations ?? 0} of {requiredConfirmations} confirmations. Nothing counts as done
          until the chain has finalised it.
        </p>
      )}
      {state === 'failed' && (
        <p>It was included in a block but did not execute. Nothing moved; the fee was spent.</p>
      )}
      {state === 'unknown' && (
        <p>The chain could not be read for this transaction. It may still be fine — nothing has
          been resent.</p>
      )}
      {stalled && state !== 'done' && (
        <p>Still no verdict after two minutes. Nothing was resent; check again whenever you like.</p>
      )}
      <p className="tx-status-hash mono">{hash}</p>
      {explorerUrl !== null && (
        <p className="field-hint">
          <a className="back-link back-link-inline" href={explorerUrl}>Look it up yourself</a>
        </p>
      )}
      {onRefresh && (
        <button className="secondary-button secondary-button-quiet" onClick={onRefresh}>
          Check status again
        </button>
      )}
    </div>
  );
}

/** The same block inside a sheet, so the fixture gallery measures it the way a member sees it
 * (it is never a screen of its own in the app). */
export function TxStatusScene({ demoLabel, ...props }: TxStatusProps & { demoLabel?: string }) {
  return (
    <main className="sheet">
      <ScreenHeader demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">TRANSACTION</p>
        <h1>A hash is not<br />success.</h1>
        <p className="intro">
          Every transaction Squad Stake starts is followed until the chain says what happened to
          it, and the hash is always shown so anyone can look it up.
        </p>
        <TxStatus {...props} />
      </div>
    </main>
  );
}
