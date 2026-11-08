import { cursorVisible, typedChars } from './motion';
import { vars } from './css';

export interface TypewriterHeadingProps {
  /** Typed first, in the ink colour. */
  lead: string;
  /** Typed second, emphasised. Signal Blue, not gold: gold text is 1.82:1 on the light
   * surface and fails WCAG AA (see tokens.css). */
  emphasis: string;
  /** Seconds since the scene started. */
  t?: number | undefined;
  id?: string | undefined;
}

export function TypewriterHeading({ lead, emphasis, t = 0, id }: TypewriterHeadingProps) {
  const whole = `${lead}${emphasis}`;
  const revealed = typedChars(t, whole.length);
  const leadShown = lead.slice(0, revealed);
  const emphasisShown = revealed > lead.length ? emphasis.slice(0, revealed - lead.length) : '';
  const done = revealed >= whole.length;
  return (
    <h1 className="typewriter" id={id}>
      {/* The full line is in the accessibility tree from the first frame; the visible text is
          the only thing that animates, so a screen reader never reads a half-typed word. */}
      <span className="sr-only">{whole}</span>
      <span aria-hidden="true">
        {leadShown}
        <span className="typewriter-emphasis">{emphasisShown}</span>
        <span
          className="typewriter-cursor"
          data-on={cursorVisible(t, whole.length) ? 'yes' : 'no'}
          data-done={done ? 'yes' : 'no'}
          style={vars({ '--cursor-opacity': cursorVisible(t, whole.length) ? 1 : 0 })}
        />
      </span>
    </h1>
  );
}
