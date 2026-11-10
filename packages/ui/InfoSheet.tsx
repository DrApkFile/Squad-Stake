import { easeOutCubic } from './motion';
import { DEFAULT_LANG, strings, type Lang } from './i18n';

export interface InfoSheetProps {
  /** Null when nothing is open. Non-null carries the scene time at which it opened, so the
   * transition below is a function of `t` rather than of a timer (AGENTS.md UI purity 6). */
  info: { title: string; body: string; openedT: number } | null | undefined;
  t?: number | undefined;
  onClose?: (() => void) | undefined;
  lang?: Lang | undefined;
}

/** How long the sheet takes to rise, in seconds. */
const RISE = 0.28;

/**
 * The long explanation a section used to carry inline. One short sentence stays on the screen;
 * everything else lives behind the ⓘ and arrives here.
 *
 * It is rendered only while open, so a closed sheet costs nothing in the accessibility tree,
 * and its position comes from `t − openedT`: Remotion renders frame 7 of the rise identically
 * every time, and `REDUCED_MOTION_T` freezes it fully open.
 */
export function InfoSheet({ info, t = 0, onClose, lang = DEFAULT_LANG }: InfoSheetProps) {
  if (!info) return null;
  const s = strings(lang).common;
  const progress = Math.min(1, Math.max(0, (t - info.openedT) / RISE));
  const eased = easeOutCubic(progress);
  return (
    /*
     * Tapping outside a bottom sheet is how a phone closes one, and Escape is how a keyboard
     * does; neither worked before (docs/AUDIT.md, n-6). Both are React handlers on this
     * element — no `window` listener and no effect, so the component stays pure and Remotion
     * renders it unchanged. `onKeyDown` sits here rather than on `window` because focus is
     * inside the sheet (see the close button below), so the event bubbles to this node.
     * The scrim is not a control: it carries no role and no label, the close button is the
     * accessible way out, and a tap inside the sheet must not close it, hence the target
     * check rather than `stopPropagation` on the sheet.
     */
    <div
      className="info-scrim"
      style={{ '--info-progress': eased } as React.CSSProperties}
      onClick={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose?.(); } }}
    >
      <section className="info-sheet" role="dialog" aria-modal="true" aria-label={info.title}>
        <span className="info-grip" aria-hidden="true" />
        <h2 className="info-title">{info.title}</h2>
        <p className="info-body">{info.body}</p>
        {/* `aria-modal` says the page behind is unavailable, so focus has to come in with the
            sheet; without this, a screen reader or a keyboard stays on the ⓘ behind the scrim.
            An attribute rather than an effect, so the component stays pure (docs/AUDIT.md,
            m-6). */}
        <button className="secondary-button" onClick={onClose} autoFocus>{s.close}</button>
      </section>
    </div>
  );
}

/** The ⓘ control that opens one. A button, not a link: it changes this screen, it does not
 * navigate. The label is read out in full; the glyph alone would announce as "i". */
export function InfoButton({ label, onOpen }: { label: string; onOpen?: (() => void) | undefined }) {
  return (
    <button className="info-button" onClick={onOpen} aria-label={label} type="button">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="12" cy="7.6" r="1.25" fill="currentColor" />
        <path d="M12 10.9v6.1" fill="none" stroke="currentColor" strokeWidth="1.9"
          strokeLinecap="round" />
      </svg>
    </button>
  );
}
