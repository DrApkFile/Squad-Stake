import { Logo } from './brand/Logo';
import { LogoMark } from './brand/LogoMark';
import { DEFAULT_LANG, strings, type Lang } from './i18n';

export interface ScreenHeaderProps {
  /** The way out of this screen. Every screen but the entry screen has one, so no page is a
   * dead end. Omitted on the welcome screen, where there is nowhere to go back to. */
  back?: { label: string; href: string } | undefined;
  demoLabel?: string | undefined;
  lang?: Lang | undefined;
}

/** The brand line, plus the back-or-home control. Shared by every screen so the header is
 * written once rather than copied into each component. */
export function ScreenHeader({ back, demoLabel, lang = DEFAULT_LANG }: ScreenHeaderProps) {
  return (
    <>
      <header className="brand">
        {back && (
          <a className="back-link" href={back.href}>
            <span aria-hidden="true">←</span> {back.label}
          </a>
        )}
        <span className="brand-tag" data-pushed={back ? 'yes' : 'no'}>
          {/* Beside a back control the mark alone carries the brand, so the two do not crowd
              each other in a 375 px header; the name stays in the accessibility tree, because
              the SVG's <title> is what names an img role. The ink is `currentColor`, so one
              drawing serves the light and the dark theme. */}
          {back
            ? <LogoMark size={26} tone="colour-current" id="header-mark"
              title={strings(lang).common.brand} />
            : <Logo size={22} tone="colour-current" id="header-logo"
              title={strings(lang).common.brand} />}
        </span>
      </header>
      {demoLabel && <p className="demo-label">{demoLabel}</p>}
    </>
  );
}
