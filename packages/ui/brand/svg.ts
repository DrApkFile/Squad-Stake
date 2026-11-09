import { paintOf } from './paint';
import { ICON_INSET, ICON_SCALE, LOGO_WIDTH, MARK_BOX, logoShapes, orbitShapes, type Shape }
  from './shapes';
import { BRAND_COLOURS, toneColours, type BrandTone } from './tone';

/**
 * The same drawings as `LogoMark` and `Logo`, serialised to standalone SVG documents for
 * `scripts/export-brand.mjs`. Both renderers read the one shape list in `shapes.ts`, and
 * `tests/unit/brand.test.ts` pins that they agree, because a logo that differs between the
 * app and the app icon is the kind of bug nobody notices until it has shipped.
 */
function element(shape: Shape, paint: string): string {
  if (shape.kind === 'circle') {
    return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${paint}"/>`;
  }
  if (shape.stroke === undefined) return `<path d="${shape.d}" fill="${paint}"/>`;
  return `<path d="${shape.d}" fill="none" stroke="${paint}" stroke-width="${shape.stroke}" `
    + 'stroke-linecap="round"/>';
}

function document(viewBox: string, width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" `
    + `height="${height}" role="img" aria-label="Squad Stake">${body}</svg>`;
}

function drawing(shapes: readonly Shape[], tone: BrandTone, id: string): string {
  const colours = toneColours(tone);
  const gradient = colours.gradient
    ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">`
      + `<stop offset="0" stop-color="${colours.warmFrom}"/>`
      + `<stop offset="1" stop-color="${colours.warmTo}"/></linearGradient></defs>`
    : '';
  return gradient + shapes.map((shape) => element(shape, paintOf(shape, colours, id))).join('');
}

/** The mark alone, in a square box. */
export function markSvg(tone: BrandTone, size = MARK_BOX): string {
  return document(`0 0 ${MARK_BOX} ${MARK_BOX}`, size, size,
    drawing(orbitShapes(), tone, 'warm'));
}

/** The horizontal lockup: mark plus the words, as outlines. */
export function logoSvg(tone: BrandTone, height = MARK_BOX): string {
  return document(`0 0 ${LOGO_WIDTH} ${MARK_BOX}`,
    Number(((height * LOGO_WIDTH) / MARK_BOX).toFixed(3)), height,
    drawing(logoShapes(), tone, 'warm'));
}

/**
 * The square app icon: the white mark on Nimiq's own warm radial, with 18% clear space on
 * every side so a platform that masks the corners (iOS, Android) never cuts into the ring.
 * The radial repeats `--nq-gold-bg` from tokens.css — 100% at bottom right, Streetlamp into
 * Honey Coin — so the icon and the app's hero are lit the same way.
 */
export function appIconSvg(size = 1024): string {
  const mark = drawing(orbitShapes(), 'white', 'warm');
  return document(`0 0 ${MARK_BOX} ${MARK_BOX}`, size, size,
    '<defs><radialGradient id="tile" cx="1" cy="1" r="1.4142">'
    + `<stop offset="0" stop-color="${BRAND_COLOURS.streetlamp}"/>`
    + `<stop offset="1" stop-color="${BRAND_COLOURS.gold}"/></radialGradient></defs>`
    + `<rect width="${MARK_BOX}" height="${MARK_BOX}" fill="url(#tile)"/>`
    + `<g transform="translate(${ICON_INSET} ${ICON_INSET}) scale(${ICON_SCALE})">${mark}</g>`);
}
