import { formatLuna } from './format';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
import { ScreenHeader } from './ScreenHeader';
import { Spinner } from './Spinner';

export interface LeaveConfirmProps {
  /** Where the back control goes; see ScreenHeader. */
  back?: { label: string; href: string } | undefined;
  squad: { name: string };
  committedLuna: number;
  busy?: boolean | undefined;
  /** Seconds since the scene started; drives the spinner. */
  t?: number | undefined;
  error?: { message: string; nextAction: string } | undefined;
  onLeave?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
  demoLabel?: string | undefined;
  lang?: Lang | undefined;
}

/**
 * §7.8. Leaving is not irreversible and moves nothing on-chain, so there is no confirm
 * tick here — that belongs to retire (PRD "Design").
 */
export function LeaveConfirm({
  squad, committedLuna, busy = false, t = 0, error, onLeave, onCancel, demoLabel, back,
  lang = DEFAULT_LANG,
}: LeaveConfirmProps) {
  const s = strings(lang);
  return <main className="sheet" aria-busy={busy}>
    <ScreenHeader back={back} title={s.common.titleLeave} demoLabel={demoLabel} lang={lang} />
    <div className="sheet-body">
      <p className="eyebrow">{s.leave.eyebrow}</p>
      <h1>{s.leave.headingTop}<br />{s.leave.headingBottom(squad.name)}</h1>
      <p className="intro">{s.leave.intro(formatLuna(committedLuna, lang))}</p>
      <dl className="notice-list">
        <dt>{s.leave.stakeTerm}</dt>
        <dd>{s.leave.stakeBody}</dd>
        <dt>{s.leave.unstakingTerm}</dt>
        <dd>{s.leave.unstakingBody}</dd>
      </dl>
      <div className="sheet-status" role="status" aria-live="polite">
        {error && <><p className="status-title">{error.message}</p><p>{error.nextAction}</p></>}
      </div>
    </div>
    <footer className="action-bar">
      <button className="primary-button" onClick={onLeave} disabled={busy}>
        {busy && <Spinner t={t} />}
        {busy ? s.leave.leaving : s.leave.leave}
      </button>
      <button className="secondary-button" onClick={onCancel} disabled={busy}>{s.leave.stay}</button>
    </footer>
  </main>;
}
