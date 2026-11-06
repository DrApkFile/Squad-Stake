import { formatLuna } from './format';

export interface LeaveConfirmProps {
  squad: { name: string };
  committedLuna: number;
  busy?: boolean;
  error?: { message: string; nextAction: string };
  onLeave?: () => void;
  onCancel?: () => void;
  demoLabel?: string;
}

/**
 * §7.8. Leaving is not irreversible and moves nothing on-chain, so there is no confirm
 * tick here — that belongs to retire (PRD "Design").
 */
export function LeaveConfirm({
  squad, committedLuna, busy = false, error, onLeave, onCancel, demoLabel,
}: LeaveConfirmProps) {
  return <main className="sheet" aria-busy={busy}>
    <header className="brand"><span className="brand-mark" aria-hidden="true">s.</span> Squad Stake</header>
    {demoLabel && <p className="demo-label">{demoLabel}</p>}
    <div className="sheet-body">
      <p className="eyebrow">LEAVE SQUAD</p>
      <h1>Leave<br />{squad.name}?</h1>
      <p className="intro">Your commitment of {formatLuna(committedLuna)} is removed and the squad
        sees it straight away.</p>
      <dl className="notice-list">
        <dt>Your stake</dt>
        <dd>Stays exactly as it is. Leaving sends no transaction and pays no fee.</dd>
        <dt>Unstaking</dt>
        <dd>Separate, and up to you. Start it from your stake when you want your NIM liquid.</dd>
      </dl>
      <div className="sheet-status" role="status" aria-live="polite">
        {error && <><p className="status-title">{error.message}</p><p>{error.nextAction}</p></>}
      </div>
    </div>
    <footer className="sheet-footer">
      <button className="primary-button" onClick={onLeave} disabled={busy}>
        {busy ? 'Leaving…' : 'Leave squad'}
      </button>
      <button className="secondary-button" onClick={onCancel} disabled={busy}>Stay</button>
    </footer>
  </main>;
}
