import { formatLuna } from './format';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
import { ScreenHeader } from './ScreenHeader';

export interface LeaveConfirmProps {
  /** Where the back control goes; see ScreenHeader. */
  back?: { label: string; href: string } | undefined;
  squad: { name: string };
  committedLuna: number;
  busy?: boolean | undefined;
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
  squad, committedLuna, busy = false, error, onLeave, onCancel, demoLabel, back,
  lang = DEFAULT_LANG,
}: LeaveConfirmProps) {
  const s = strings(lang);
  return <main className="sheet" aria-busy={busy}>
    <ScreenHeader back={back} demoLabel={demoLabel} />
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
    <footer className="sheet-footer">
      <button className="primary-button" onClick={onLeave} disabled={busy}>
        {busy ? s.leave.leaving : s.leave.leave}
      </button>
      <button className="secondary-button" onClick={onCancel} disabled={busy}>{s.leave.stay}</button>
    </footer>
  </main>;
}
