import { ScreenHeader } from './ScreenHeader';
import { TxStatus } from './TxStatus';
import { formatLuna, formatMoment, readAge } from './format';

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
}: PayShareSheetProps) {
  const busy = state.status === 'waiting' || state.status === 'pending' || state.status === 'checking';
  const done = state.status === 'paid';
  const explorer = (hash: string) => (explorerBase === null ? null : `${explorerBase}${hash}`);
  return (
    <main className="sheet" aria-busy={busy}>
      <ScreenHeader back={back} demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">PAY MY SHARE · SQUAD {squad.shortId.toUpperCase()}</p>
        <h1>{formatLuna(shareLuna)}<br />to the recipient.</h1>
        <p className="intro">
          {squad.name} is a shared goal, so on goal day every share goes to the one address the
          squad agreed on. Goal day is {formatMoment(squad.goalAt, tzOffsetMinutes)}.
        </p>
        <dl className="notice-list">
          <dt>Recipient</dt>
          <dd className="mono">{recipient}</dd>
          <dt>Reference on-chain</dt>
          <dd className="mono">sq:{squad.shortId}</dd>
          <dt>Squad so far</dt>
          <dd>{roster.paid} of {roster.owing} paid</dd>
        </dl>

        <div className="sheet-status" data-status={state.status} role="status" aria-live="polite">
          {state.status === 'ready' && (canPay
            ? <>
              <p className="status-title">Ready to pay</p>
              <p>Nimiq Pay will ask you to approve exactly this amount to exactly this address.</p>
            </>
            : <>
              <p className="status-title">Withdraw first</p>
              <p>Your share is still in the staking contract. Finish the leaving steps, then
                pay from your own wallet.</p>
            </>)}
          {state.status === 'waiting' && <>
            <p className="status-title">Approve in Nimiq Pay</p>
            <p>Nothing is sent until you approve.</p>
          </>}
          {state.status === 'checking' && <>
            <p className="status-title">Checking the chain</p>
            <p>Reading the transaction back to confirm the recipient, the amount and the
              reference.</p>
          </>}
          {state.status === 'refused' && <>
            <p className="status-title">{state.message}</p>
            <p>{state.nextAction}</p>
            <p>The NIM did leave your wallet — this transaction simply does not settle your
              share, so the squad does not count it.</p>
          </>}
          {state.status === 'failed' && <>
            <p className="status-title">{state.message}</p>
            <p>{state.nextAction}</p>
            {!state.changedAnything && <p>Nothing changed.</p>}
          </>}
          {done && <>
            <p className="status-title">Paid and verified</p>
            <p>
              Checked on-chain: the recipient, at least your share, the squad reference, the
              execution result and finality.
              {state.squadCompleted
                ? ' Everyone has paid, so this squad is complete.'
                : ' The squad page shows it to everyone.'}
            </p>
          </>}
          <p className="member-status-age">{readAge(readAt, now)}</p>
        </div>

        {state.status === 'pending' && (
          <TxStatus state="pending" hash={state.hash} confirmations={state.confirmations}
            requiredConfirmations={state.requiredConfirmations} stalled={stalled}
            explorerUrl={explorer(state.hash)} {...(onRefresh ? { onRefresh } : {})} />
        )}
        {(state.status === 'refused' || done) && (
          <TxStatus state={done ? 'done' : 'failed'} hash={state.hash}
            explorerUrl={explorer(state.hash)} />
        )}
      </div>
      <footer className="sheet-footer">
        <button className="primary-button" onClick={onPay} disabled={busy || done || !canPay}>
          {busy ? 'Waiting…' : done ? 'Paid' : 'Pay my share in Nimiq Pay'}
        </button>
        {stalled && !done && (
          <button className="secondary-button" onClick={onRefresh}>Check status again</button>
        )}
        <p className="fine-print">
          Squad Stake never holds this money. It goes straight from your wallet to the
          recipient.
        </p>
      </footer>
    </main>
  );
}
