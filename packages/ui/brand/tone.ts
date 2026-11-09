/**
 * The four ways every Squad Stake mark can be drawn. The mark is two colours plus one
 * gradient; a single-colour variant drops the gradient so it survives a stamp, a favicon
 * mask or a one-colour print.
 */
export type BrandTone = 'colour-dark' | 'colour-light' | 'colour-current' | 'white' | 'navy';

/** Nimiq's own values (packages/ui/tokens.css): Honey Coin, Streetlamp, Plaza Night, white.
 * Hard-coded here rather than read from CSS variables because an exported SVG and a PNG have
 * no stylesheet, and the mark must look the same in both. */
export const BRAND_COLOURS = {
  gold: '#e9b213',
  /** The far end of Nimiq's own gold radial (`--nq-gold-bg`), used by the app icon's tile. */
  streetlamp: '#ec991c',
  orange: '#fc7500',
  navy: '#1f2348',
  white: '#ffffff',
} as const;

export interface ToneColours {
  /** The two ends of the warm gradient, or a single flat colour repeated. */
  warmFrom: string;
  warmTo: string;
  /** Everything that is not the warm shape. */
  ink: string;
  /** True when the gradient is used; false for the single-colour variants. */
  gradient: boolean;
}

export function toneColours(tone: BrandTone): ToneColours {
  const { gold, orange, navy, white } = BRAND_COLOURS;
  if (tone === 'white') return { warmFrom: white, warmTo: white, ink: white, gradient: false };
  if (tone === 'navy') return { warmFrom: navy, warmTo: navy, ink: navy, gradient: false };
  // Inside the app the ink follows the text colour, so one header mark serves both themes and
  // no component has to know which theme is on. `currentColor` means nothing in an exported
  // file, so the export script never asks for this tone.
  if (tone === 'colour-current') {
    return { warmFrom: gold, warmTo: orange, ink: 'currentColor', gradient: true };
  }
  // Full colour: the warm gradient stays the same on either background; only the ink flips,
  // so the mark keeps its contrast on the dark sheet and on paper.
  return { warmFrom: gold, warmTo: orange, ink: tone === 'colour-dark' ? white : navy,
    gradient: true };
}
