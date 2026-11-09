import { DEFAULT_LANG, strings, type Lang } from './i18n';
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
  lang?: Lang | undefined;
}

function title(state: TxStatusState, lang: Lang) {
  const s = strings(lang).tx;
  if (state === 'pending') return s.pendingTitle;
  if (state === 'failed') return s.failedTitle;
  if (state === 'done') return s.doneTitle;
  return s.unknownTitle;
}

/**
 * Screen 9, as a block rather than a screen of its own: it sits inside whichever sheet started
 * the transaction, so the member never loses the step they were on. The hash is always shown
 * and always linkable — a hash is not success, and the way to tell is to look it up (Q10).
 */
export function TxStatus({
  state, hash, confirmations = null, requiredConfirmations, stalled = false,
  explorerUrl = null, onRefresh, lang = DEFAULT_LANG,
}: TxStatusProps) {
  const s = strings(lang);
  return (
    <div className="tx-status" data-state={state} role="status" aria-live="polite">
      <p className="status-title">{title(state, lang)}</p>
      {state === 'pending' && requiredConfirmations !== undefined && (
        <p>{s.tx.confirmations(confirmations ?? 0, requiredConfirmations)}</p>
      )}
      {state === 'failed' && <p>{s.tx.failedBody}</p>}
      {state === 'unknown' && <p>{s.tx.unknownBody}</p>}
      {stalled && state !== 'done' && <p>{s.tx.stalled}</p>}
      <p className="tx-status-hash mono">{hash}</p>
      {explorerUrl !== null && (
        <p className="field-hint">
          <a className="back-link back-link-inline" href={explorerUrl}>{s.tx.lookUp}</a>
        </p>
      )}
      {onRefresh && (
        <button className="secondary-button secondary-button-quiet" onClick={onRefresh}>
          {s.common.checkStatusAgain}
        </button>
      )}
    </div>
  );
}

/** The same block inside a sheet, so the fixture gallery measures it the way a member sees it
 * (it is never a screen of its own in the app). */
export function TxStatusScene({ demoLabel, ...props }: TxStatusProps & { demoLabel?: string }) {
  const s = strings(props.lang ?? DEFAULT_LANG);
  return (
    <main className="sheet">
      <ScreenHeader title={s.common.titleTx} demoLabel={demoLabel} lang={props.lang ?? DEFAULT_LANG} />
      <div className="sheet-body">
        <p className="eyebrow">{s.tx.sceneEyebrow}</p>
        <h1>{s.tx.sceneHeadingTop}<br />{s.tx.sceneHeadingBottom}</h1>
        <p className="intro">{s.tx.sceneIntro}</p>
        <TxStatus {...props} />
      </div>
    </main>
  );
}
