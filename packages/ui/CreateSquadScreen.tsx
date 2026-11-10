import { GradientBorderButton } from './GradientBorderButton';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
import { ScreenHeader } from './ScreenHeader';
import { Spinner } from './Spinner';
import { SQUAD_TEMPLATES, TEMPLATE_IDS, templateText, type TemplateId } from './templates';

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
  /**
   * PRD §10: the suggested goal date of each quick-start template, `YYYY-MM-DD`. Dates depend
   * on the clock, so the container computes them (`templateGoalDates(now)`) and this screen
   * stays pure. Absent = no quick starts, which is what the fixture for the bare form shows.
   */
  templateDates?: Record<TemplateId, string> | undefined;
  error?: { message: string; nextAction: string };
  /** Set once the squad exists: the form is replaced by the share step. `squadUrl` is where
   * the creator goes next; `inviteUrl` is what they hand to the squad. */
  created?: { shortId: string; inviteUrl: string; squadUrl: string };
  busy?: boolean;
  /** Seconds since the scene started; drives the spinner. */
  t?: number | undefined;
  onChange?: (patch: Partial<CreateSquadValues>) => void;
  onSubmit?: () => void;
  /** The share step's two controls. The screen never prints the invite URL — it is the one
   * string here that must not be mistyped, and a phone cannot select it comfortably — so the
   * phone's own share sheet and the clipboard carry it instead, exactly as the squad page
   * does (docs/AUDIT.md, M-1). The container owns both calls, so this stays pure. */
  onShare?: (() => void) | undefined;
  onCopyInvite?: (() => void) | undefined;
  /** True once the link has been copied, so the control can say so. */
  shared?: boolean | undefined;
  demoLabel?: string;
  lang?: Lang | undefined;
}

/** Screen 4. Controlled: every value and the minimum date come in as props. */
export function CreateSquadScreen({
  values, minGoalDate, templateDates, error, created, busy = false, t = 0, onChange, onSubmit,
  onShare, onCopyInvite, shared = false, demoLabel, back, lang = DEFAULT_LANG,
}: CreateSquadScreenProps) {
  const s = strings(lang);
  const modeA = values.mode === 'A';
  if (created) {
    return <main className="sheet">
    <ScreenHeader back={back} title={s.common.titleNewSquad} demoLabel={demoLabel} lang={lang} />
      <div className="sheet-body">
        <p className="eyebrow">{s.create.squadEyebrow(created.shortId.toUpperCase())}</p>
        <h1>{values.name}<br />{s.create.readyHeadingTail}</h1>
        <p className="intro">{s.create.readyIntro}</p>
        <GradientBorderButton label={s.squad.shareInvite} onClick={onShare} t={t} />
        <button className="link-button" type="button" onClick={onCopyInvite}>
          {shared ? s.common.copied : s.common.copyLink}
        </button>
        <p className="field-hint">{s.create.inviteHint}</p>
      </div>
      <footer className="action-bar">
        <a className="primary-button" href={created.squadUrl}>{s.create.openSquad}</a>
      </footer>
    </main>;
  }
  return <main className="sheet" aria-busy={busy}>
    <ScreenHeader back={back} title={s.common.titleNewSquad} demoLabel={demoLabel} lang={lang} />
    <div className="sheet-body">
      <p className="eyebrow">{s.create.eyebrow}</p>
      <h1>{s.create.headingTop}<br />{s.create.headingBottom}</h1>

      {/* A template only fills in fields the member can still change, and never the
          recipient address (packages/ui/templates.ts). */}
      {templateDates !== undefined && <div className="templates">
        <p className="field-label">{s.templates.label}</p>
        <div className="template-row">
          {TEMPLATE_IDS.map((id) => {
            const text = templateText(id, lang);
            const picked = values.name === text.name && values.mode === SQUAD_TEMPLATES[id].mode;
            return <button key={id} type="button" disabled={busy}
              className={`template-chip${picked ? ' template-chip-on' : ''}`}
              aria-pressed={picked}
              onClick={() => onChange?.({
                name: text.name, mode: SQUAD_TEMPLATES[id].mode, goalDate: templateDates[id],
              })}>
              {text.label}
            </button>;
          })}
          <button type="button" className="template-chip" disabled={busy}
            onClick={() => onChange?.({ name: '', goalDate: '' })}>
            {s.templates.clear}
          </button>
        </div>
        <p className="field-hint">{s.templates.hint}</p>
      </div>}

      <label className="field">
        <span className="field-label">{s.create.nameLabel}</span>
        <input className="field-input" type="text" value={values.name} maxLength={60}
          placeholder={s.create.namePlaceholder} disabled={busy}
          onChange={(event) => onChange?.({ name: event.target.value })} />
      </label>

      <fieldset className="mode-choice" disabled={busy}>
        <legend className="field-label">{s.create.modeLegend}</legend>
        <label className={`mode-option${modeA ? ' mode-option-on' : ''}`}>
          <input type="radio" name="mode" value="A" checked={modeA}
            onChange={() => onChange?.({ mode: 'A' })} />
          <span className="mode-title">{s.common.modeA}</span>
          <span className="mode-detail">{s.create.modeADetail}</span>
        </label>
        <label className={`mode-option${modeA ? '' : ' mode-option-on'}`}>
          <input type="radio" name="mode" value="B" checked={!modeA}
            onChange={() => onChange?.({ mode: 'B' })} />
          <span className="mode-title">{s.common.modeB}</span>
          <span className="mode-detail">{s.create.modeBDetail}</span>
        </label>
      </fieldset>

      {modeA ? <>
        <label className="field">
          <span className="field-label">{s.create.totalLabel}</span>
          <input className="field-input" type="text" inputMode="decimal" value={values.targetNim}
            placeholder="12000" disabled={busy}
            onChange={(event) => onChange?.({ targetNim: event.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">{s.create.recipientLabel}</span>
          <input className="field-input field-input-mono" type="text" value={values.recipient}
            placeholder="NQ.. .. .." disabled={busy} autoCapitalize="characters" spellCheck={false}
            onChange={(event) => onChange?.({ recipient: event.target.value })} />
          <span className="field-hint">{s.create.recipientHint}</span>
        </label>
      </> : <label className="field">
        <span className="field-label">{s.create.personalLabel}</span>
        <input className="field-input" type="text" inputMode="decimal" value={values.personalTargetNim}
          placeholder="2000" disabled={busy}
          onChange={(event) => onChange?.({ personalTargetNim: event.target.value })} />
        <span className="field-hint">{s.create.personalHint}</span>
      </label>}

      <label className="field">
        <span className="field-label">{s.create.goalDateLabel}</span>
        <input className="field-input" type="date" value={values.goalDate} min={minGoalDate}
          disabled={busy} onChange={(event) => onChange?.({ goalDate: event.target.value })} />
        <span className="field-hint">{s.create.goalDateHint}</span>
      </label>

      <div className="sheet-status" role="status" aria-live="polite">
        {error && <><p className="status-title">{error.message}</p><p>{error.nextAction}</p></>}
      </div>
    </div>
    <footer className="action-bar">
      <button className="primary-button" onClick={onSubmit} disabled={busy}>
        {busy && <Spinner t={t} />}
        {busy ? s.create.creating : s.create.submit}
      </button>
      <p className="fine-print">{s.create.fineprint}</p>
    </footer>
  </main>;
}
