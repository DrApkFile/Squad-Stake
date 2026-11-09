import { Logo } from './brand/Logo';
import { LogoMark } from './brand/LogoMark';
import { DEFAULT_LANG, strings, type Lang } from './i18n';

export interface ScreenHeaderProps {
  /** The way out of this screen. Every screen but the entry screen has one, so no page is a
   * dead end. Omitted on the welcome screen, where there is nowhere to go back to. */
  back?: { label: string; href: string } | undefined;
  /** The centred title of a native top bar. Omitted on the entry screen, which shows the
   * full lockup instead, and on screens whose own first heading is the title. */
  title?: string | undefined;
  demoLabel?: string | undefined;
  lang?: Lang | undefined;
}

/** The entry screen's lockup, in mark units of height. The bar's 44 px columns cannot hold a
 * lockup 5.8× as wide as it is tall, so the welcome screen gets a row of its own instead of a
 * squeezed corner: this is the first thing a visitor sees and it has to carry the name. */
const LOCKUP_HEIGHT = 36;

/**
 * A compact app top bar: a back chevron on the left, the screen's title centred, the brand on
 * the right. It replaces the "← Squads" text link, which read like a website's breadcrumb.
 *
 * The chevron is an icon with an accessible name rather than a visible word, which is what a
 * phone's own navigation looks like; the destination's name is still announced, so nothing is
 * lost to a screen reader. The three-column grid keeps the title optically centred whether or
 * not a back control is present — a flex row would shift it by the chevron's width.
 */
export function ScreenHeader({ back, title, demoLabel, lang = DEFAULT_LANG }: ScreenHeaderProps) {
  const brand = strings(lang).common.brand;
  // No title and nowhere back: the entry screen. It shows the lockup at reading size rather
  // than a bar with two empty columns.
  if (back === undefined && title === undefined) {
    return (
      <>
        <header className="topbar topbar-lockup">
          <Logo size={LOCKUP_HEIGHT} tone="colour-current" id="header-logo" title={brand} />
        </header>
        {demoLabel && <p className="demo-label">{demoLabel}</p>}
      </>
    );
  }
  return (
    <>
      <header className="topbar" data-has-title={title ? 'yes' : 'no'}>
        <span className="topbar-lead">
          {back && (
            <a className="icon-button" href={back.href} aria-label={back.label}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
                <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
        </span>
        {title
          ? <h1 className="topbar-title">{title}</h1>
          : <span className="topbar-title" aria-hidden="true" />}
        <span className="topbar-trail">
          {/* The ink is `currentColor` (packages/ui/brand/tone.ts), so one drawing serves the
              light and the dark theme; its warm centre stays gold in both. Beside a title the
              mark alone carries the brand, so the two do not crowd a 375 px bar. */}
          <LogoMark size={26} tone="colour-current" id="header-mark" title={brand} />
        </span>
      </header>
      {demoLabel && <p className="demo-label">{demoLabel}</p>}
    </>
  );
}
