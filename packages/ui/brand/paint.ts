import type { Shape } from './shapes';
import type { ToneColours } from './tone';

export interface MarkProps {
  /** Rendered height in px; the drawing is defined in a 64-unit box. */
  size?: number | undefined;
  tone?: import('./tone').BrandTone | undefined;
  /**
   * Prefix for the gradient's id. Ids come from data, never generated (AGENTS.md "UI purity"
   * 1), so a page showing several logos passes a different one to each.
   */
  id?: string | undefined;
  /** Accessible name, or null for a logo that sits beside the word and adds nothing. */
  title?: string | null | undefined;
  className?: string | undefined;
}

/** Which paint a shape takes: the warm gradient (or its flat stand-in in a one-colour
 * variant), or the ink. */
export function paintOf(shape: Shape, colours: ToneColours, gradientId: string): string {
  if (shape.paint === 'ink') return colours.ink;
  return colours.gradient ? `url(#${gradientId})` : colours.warmFrom;
}
