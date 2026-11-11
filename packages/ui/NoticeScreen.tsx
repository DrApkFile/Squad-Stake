import { ScreenHeader } from './ScreenHeader';
import { Spinner } from './Spinner';
import { DEFAULT_LANG, strings, type Lang } from './i18n';

export interface NoticeScreenProps {
  title: string;
  body: string;
  /** A second line under the body: the reference of a server fault, so a report can name it. */
  reference?: string | undefined;
  /** Where the member goes from here. Always present: a screen with no way on is a dead end. */
  action: { label: string; href: string };
  /** Only when taking the same page again can help (a server fault, never a wallet call). */
  onRetry?: (() => void) | undefined;
  retrying?: boolean | undefined;
  t?: number | undefined;
  demoLabel?: string | undefined;
  lang?: Lang | undefined;
}

/**
 * The screen a page shows when it cannot show itself.
 *
 * AGENTS.md "Never fabricate" forbids a fake success fallback; the other half of the same rule
 * is that a failure must say what happened. Before this, a missing squad, a bad invite token
 * and a thrown server error all ended at Next's own unstyled 404 or at
 * "Application error: a server-side exception has occurred", which names nothing and offers
 * nothing (docs/PROGRESS.md 2026-11-10).
 *
 * Every notice says three things: what happened, what it means for the member's NIM — the
 * question a stake-backed app has to answer before any other — and one way on. Pure like every
 * other component here: the words, the destination and the retry arrive as props.
 */
export function NoticeScreen({
  title, body, reference, action, onRetry, retrying = false, t = 0,
  demoLabel, lang = DEFAULT_LANG,
}: NoticeScreenProps) {
  const s = strings(lang);
  return (
    <main className="sheet" data-screen="notice">
      <ScreenHeader title={s.common.brand} demoLabel={demoLabel} lang={lang} />
      <div className="sheet-body">
        {/* `role="alert"` so a screen reader is told what happened rather than being left to
            discover a heading that replaced the page it asked for. */}
        <section className="card" role="alert">
          <h1 className="notice-title">{title}</h1>
          <p>{body}</p>
          {reference !== undefined && <p className="meta mono">{reference}</p>}
        </section>
      </div>
      <footer className="action-bar">
        {onRetry !== undefined && (
          <button className="primary-button" type="button" onClick={onRetry}
            disabled={retrying} aria-busy={retrying}>
            {retrying && <Spinner t={t} />}
            {retrying ? s.common.refreshing : s.common.tryAgain}
          </button>
        )}
        <a className={onRetry === undefined ? 'primary-button' : 'secondary-button'}
          href={action.href}>{action.label}</a>
      </footer>
    </main>
  );
}
