import { ScreenHeader } from './ScreenHeader';

export interface CreateSquadValues {
  name: string;
  mode: 'A' | 'B';
  /** NIM as typed, not luna: the container converts at the edge (AGENTS.md 10). */
  targetNim: string;
  recipient: string;
  personalTargetNim: string;
  goalDate: string;
}
export interface CreateSquadScreenProps {
  /** Where the back control goes; see ScreenHeader. */
  back?: { label: string; href: string } | undefined;
  values: CreateSquadValues;
  /** Earliest allowed goal date (YYYY-MM-DD), computed from `now` by the container. */
  minGoalDate: string;
  error?: { message: string; nextAction: string };
  /** Set once the squad exists: the form is replaced by the share step. `squadUrl` is where
   * the creator goes next; `inviteUrl` is what they hand to the squad. */
  created?: { shortId: string; inviteUrl: string; squadUrl: string };
  busy?: boolean;
  onChange?: (patch: Partial<CreateSquadValues>) => void;
  onSubmit?: () => void;
  demoLabel?: string;
}

/** Screen 4. Controlled: every value and the minimum date come in as props. */
export function CreateSquadScreen({
  values, minGoalDate, error, created, busy = false, onChange, onSubmit, demoLabel, back,
}: CreateSquadScreenProps) {
  const modeA = values.mode === 'A';
  if (created) {
    return <main className="sheet">
    <ScreenHeader back={back} demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">SQUAD {created.shortId.toUpperCase()}</p>
        <h1>{values.name}<br />is ready.</h1>
        <p className="intro">Share this link. Friends sign in with Nimiq Pay and commit from
          their own wallet.</p>
        <p className="field-input field-input-mono">{created.inviteUrl}</p>
        <p className="field-hint">Anyone with the link can join, so share it only with your squad.</p>
      </div>
      <footer className="sheet-footer">
        <a className="primary-button" href={created.squadUrl}>Open the squad</a>
      </footer>
    </main>;
  }
  return <main className="sheet" aria-busy={busy}>
    <ScreenHeader back={back} demoLabel={demoLabel} />
    <div className="sheet-body">
      <p className="eyebrow">NEW SQUAD</p>
      <h1>What are you<br />saving for?</h1>

      <label className="field">
        <span className="field-label">Squad name</span>
        <input className="field-input" type="text" value={values.name} maxLength={60}
          placeholder="Lisbon in April" disabled={busy}
          onChange={(event) => onChange?.({ name: event.target.value })} />
      </label>

      <fieldset className="mode-choice" disabled={busy}>
        <legend className="field-label">Mode</legend>
        <label className={`mode-option${modeA ? ' mode-option-on' : ''}`}>
          <input type="radio" name="mode" value="A" checked={modeA}
            onChange={() => onChange?.({ mode: 'A' })} />
          <span className="mode-title">Shared goal</span>
          <span className="mode-detail">One total. On goal day everyone pays the recipient.</span>
        </label>
        <label className={`mode-option${modeA ? '' : ' mode-option-on'}`}>
          <input type="radio" name="mode" value="B" checked={!modeA}
            onChange={() => onChange?.({ mode: 'B' })} />
          <span className="mode-title">Together goals</span>
          <span className="mode-detail">Own targets, shared date. Nobody pays anybody.</span>
        </label>
      </fieldset>

      {modeA ? <>
        <label className="field">
          <span className="field-label">Total target (NIM)</span>
          <input className="field-input" type="text" inputMode="decimal" value={values.targetNim}
            placeholder="12000" disabled={busy}
            onChange={(event) => onChange?.({ targetNim: event.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Recipient address</span>
          <input className="field-input field-input-mono" type="text" value={values.recipient}
            placeholder="NQ.. .. .." disabled={busy} autoCapitalize="characters" spellCheck={false}
            onChange={(event) => onChange?.({ recipient: event.target.value })} />
          <span className="field-hint">Fixed now and visible to everyone. Payments go straight here.</span>
        </label>
      </> : <label className="field">
        <span className="field-label">Your target (NIM)</span>
        <input className="field-input" type="text" inputMode="decimal" value={values.personalTargetNim}
          placeholder="2000" disabled={busy}
          onChange={(event) => onChange?.({ personalTargetNim: event.target.value })} />
        <span className="field-hint">Everyone sets their own when they join.</span>
      </label>}

      <label className="field">
        <span className="field-label">Goal date</span>
        <input className="field-input" type="date" value={values.goalDate} min={minGoalDate}
          disabled={busy} onChange={(event) => onChange?.({ goalDate: event.target.value })} />
        <span className="field-hint">At least three days away: leaving a stake takes up to a day.</span>
      </label>

      <div className="sheet-status" role="status" aria-live="polite">
        {error && <><p className="status-title">{error.message}</p><p>{error.nextAction}</p></>}
      </div>
    </div>
    <footer className="sheet-footer">
      <button className="primary-button" onClick={onSubmit} disabled={busy}>
        {busy ? 'Creating…' : 'Create squad'}
      </button>
      <p className="fine-print">Creating a squad moves no NIM and needs no approval.</p>
    </footer>
  </main>;
}
