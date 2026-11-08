export interface ScreenHeaderProps {
  /** The way out of this screen. Every screen but the entry screen has one, so no page is a
   * dead end. Omitted on the welcome screen, where there is nowhere to go back to. */
  back?: { label: string; href: string } | undefined;
  demoLabel?: string | undefined;
}

/** The brand line, plus the back-or-home control. Shared by every screen so the header is
 * written once rather than copied into each component. */
export function ScreenHeader({ back, demoLabel }: ScreenHeaderProps) {
  return (
    <>
      <header className="brand">
        {back && (
          <a className="back-link" href={back.href}>
            <span aria-hidden="true">←</span> {back.label}
          </a>
        )}
        <span className="brand-tag" data-pushed={back ? 'yes' : 'no'}>
          <span className="brand-mark" aria-hidden="true">s.</span>{' '}
          {/* Beside a back control the mark alone carries the brand, so the two do not crowd
              each other in a 375 px header; the name stays in the accessibility tree. */}
          <span className="brand-word">Squad Stake</span>
        </span>
      </header>
      {demoLabel && <p className="demo-label">{demoLabel}</p>}
    </>
  );
}
