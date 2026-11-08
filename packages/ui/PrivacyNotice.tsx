import { DEFAULT_LANG, strings, type Lang } from './i18n';
import { ScreenHeader } from './ScreenHeader';
export interface PrivacyNoticeProps {
  /** Where the back control goes; see ScreenHeader. */
  back?: { label: string; href: string } | undefined;
  onAccept?: () => void;
  busy?: boolean;
  demoLabel?: string;
  lang?: Lang | undefined;
}

/** Screen 0. Shown before the first save (PRD §7.2); says what leaves the wallet: nothing. */
export function PrivacyNotice({
  onAccept, busy = false, demoLabel, back, lang = DEFAULT_LANG,
}: PrivacyNoticeProps) {
  const s = strings(lang);
  return <main className="sheet" aria-busy={busy}>
    <ScreenHeader back={back} demoLabel={demoLabel} />
    <div className="sheet-body">
      <p className="eyebrow">{s.privacy.eyebrow}</p>
      <h1>{s.privacy.headingTop}<br />{s.privacy.headingBottom}</h1>
      <dl className="notice-list">
        <dt>{s.privacy.keepsTerm}</dt>
        <dd>{s.privacy.keepsBody}</dd>
        <dt>{s.privacy.neverTerm}</dt>
        <dd>{s.privacy.neverBody}</dd>
        <dt>{s.privacy.seesTerm}</dt>
        <dd>{s.privacy.seesBody}</dd>
        <dt>{s.privacy.movesTerm}</dt>
        <dd>{s.privacy.movesBody}</dd>
      </dl>
    </div>
    <footer className="sheet-footer">
      <button className="primary-button" onClick={onAccept} disabled={busy}>{s.privacy.accept}</button>
      <p className="fine-print">{s.privacy.fineprint}</p>
    </footer>
  </main>;
}
