export interface PrivacyNoticeProps {
  onAccept?: () => void;
  busy?: boolean;
  demoLabel?: string;
}

/** Screen 0. Shown before the first save (PRD §7.2); says what leaves the wallet: nothing. */
export function PrivacyNotice({ onAccept, busy = false, demoLabel }: PrivacyNoticeProps) {
  return <main className="sheet" aria-busy={busy}>
    <header className="brand"><span className="brand-mark" aria-hidden="true">s.</span> Squad Stake</header>
    {demoLabel && <p className="demo-label">{demoLabel}</p>}
    <div className="sheet-body">
      <p className="eyebrow">BEFORE YOU START</p>
      <h1>Your NIM stays<br />in your wallet.</h1>
      <dl className="notice-list">
        <dt>What Squad Stake keeps</dt>
        <dd>Your squads, what you committed, and the transaction hashes you approve.</dd>
        <dt>What it never keeps</dt>
        <dd>Your keys, your seed, your balance. Every status is read from the Nimiq chain
          when you open a squad, never stored as truth.</dd>
        <dt>What your squad sees</dt>
        <dd>Your commitment and whether it is backed or short — not your balance.</dd>
        <dt>What moves money</dt>
        <dd>Only you, by approving a transaction in Nimiq Pay. Squad Stake cannot move
          your NIM, and nobody holds the pot.</dd>
      </dl>
    </div>
    <footer className="sheet-footer">
      <button className="primary-button" onClick={onAccept} disabled={busy}>Got it</button>
      <p className="fine-print">Staking keeps your NIM yours. Leaving a stake takes up to a day.</p>
    </footer>
  </main>;
}
