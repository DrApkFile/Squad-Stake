import { ScreenHeader } from './ScreenHeader';
import { TxStatus } from './TxStatus';
import { formatLuna, formatMoment, readAge } from './format';
import { DEFAULT_LANG, strings, type Lang } from './i18n';

export type PayShareState =
  | { status: 'ready' }
  /** The approval sheet is open in Nimiq Pay. Not our UI, and never recreated. */
  | { status: 'waiting' }
  | { status: 'pending'; hash: string; confirmations: number; requiredConfirmations: number }
  | { status: 'checking'; hash: string }
  /** The payment is on the chain but does not settle this share (Q15). */
  | { status: 'refused'; hash: string; message: string; nextAction: string }
  | { status: 'failed'; message: string; nextAction: string; changedAnything: boolean }
  | { status: 'paid'; hash: string; squadCompleted: boolean };

export interface PayShareSheetProps {
  squad: { name: string; shortId: string; goalAt: number };
  recipient: string;
  shareLuna: number;
  /** How many of the members who committed have a verified payment (PRD §7.6 roster). */
  roster: { paid: number; owing: number };
  state: PayShareState;
  now: number;
  tzOffsetMinutes: number;
  readAt: number | null;
  /** Null when the member has not withdrawn yet: the sheet then explains instead of offering. */
  canPay: boolean;
  stalled?: boolean | undefined;
  explorerBase?: string | null | undefined;
  onPay?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  back?: { label: string; href: string } | undefined;
  demoLabel?: string | undefined;
  lang?: Lang | undefined;
}

/**
 * Screen 8 (PRD §7.6). The recipient was fixed when the squad was created and is shown in
 * full: this is the one screen where the member hands NIM to someone else, so there is nothing
 * to choose and nothing hidden. The marker `sq:<short_id>` travels with the payment, which is
 * how the server recognises it without ever looking at who sent it.
 */
export function PayShareSheet({
  squad, recipient, shareLuna, roster, state, now, tzOffsetMinutes, readAt, canPay,
  stalled = false, explorerBase = null, onPay, onRefresh, back, demoLabel,
  lang = DEFAULT_LANG,
}: PayShareSheetProps) {
  const s = strings(lang);
  const busy = state.status === 'waiting' || state.status === 'pending' || state.status === 'checking';
  const done = state.status === 'paid';
  const explorer = (hash: string) => (explorerBase === null ? null : `${explorerBase}${hash}`);
  return (
    <main className="sheet" aria-busy={busy}>
      <ScreenHeader back={back} demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">{s.pay.eyebrow(squad.shortId.toUpperCase())}</p>
        <h1>{formatLuna(shareLuna, lang)}<br />{s.pay.headingTail}</h1>
        <p className="intro">
          {s.pay.intro(squad.name, formatMoment(squad.goalAt, tzOffsetMinutes, lang))}
        </p>
        <dl className="notice-list">
          <dt>{s.pay.recipientTerm}</dt>
          <dd className="mono">{recipient}</dd>
          <dt>{s.pay.referenceTerm}</dt>
          <dd className="mono">sq:{squad.shortId}</dd>
          <dt>{s.pay.rosterTerm}</dt>
          <dd>{s.common.paidOf(roster.paid, roster.owing)}</dd>
        </dl>

        <div className="sheet-status" data-status={state.status} role="status" aria-live="polite">
          {state.status === 'ready' && (canPay
            ? <>
              <p className="status-title">{s.pay.readyTitle}</p>
              <p>{s.pay.readyBody}</p>
            </>
            : <>
              <p className="status-title">{s.pay.withdrawFirstTitle}</p>
              <p>{s.pay.withdrawFirstBody}</p>
            </>)}
          {state.status === 'waiting' && <>
            <p className="status-title">{s.common.approveInPay}</p>
            <p>{s.common.nothingSentUntilApprove}</p>
          </>}
          {state.status === 'checking' && <>
            <p className="status-title">{s.pay.checkingTitle}</p>
            <p>{s.pay.checkingBody}</p>
          </>}
          {state.status === 'refused' && <>
            <p className="status-title">{state.message}</p>
            <p>{state.nextAction}</p>
            <p>{s.pay.refusedNote}</p>
          </>}
          {state.status === 'failed' && <>
            <p className="status-title">{state.message}</p>
            <p>{state.nextAction}</p>
            {!state.changedAnything && <p>{s.common.nothingChanged}</p>}
          </>}
          {done && <>
            <p className="status-title">{s.pay.paidTitle}</p>
            <p>
              {s.pay.paidBody}
              {state.squadCompleted ? s.pay.paidAll : s.pay.paidSome}
            </p>
          </>}
          <p className="member-status-age">{readAge(readAt, now, lang)}</p>
        </div>

        {state.status === 'pending' && (
          <TxStatus state="pending" hash={state.hash} confirmations={state.confirmations}
            requiredConfirmations={state.requiredConfirmations} stalled={stalled}
            explorerUrl={explorer(state.hash)} lang={lang}
            {...(onRefresh ? { onRefresh } : {})} />
        )}
        {(state.status === 'refused' || done) && (
          <TxStatus state={done ? 'done' : 'failed'} hash={state.hash}
            explorerUrl={explorer(state.hash)} lang={lang} />
        )}
      </div>
      <footer className="sheet-footer">
        <button className="primary-button" onClick={onPay} disabled={busy || done || !canPay}>
          {busy ? s.common.waiting : done ? s.pay.paidButton : s.pay.payButton}
        </button>
        {stalled && !done && (
          <button className="secondary-button" onClick={onRefresh}>
            {s.common.checkStatusAgain}
          </button>
        )}
        <p className="fine-print">{s.pay.fineprint}</p>
      </footer>
    </main>
  );
}
