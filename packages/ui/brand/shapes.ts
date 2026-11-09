import { arc, polar, transformPath } from './geometry';
import { WORDMARK } from './wordmark';

/**
 * The logo as data, so that one drawing serves three consumers that cannot share a renderer:
 * the React components (`LogoMark`, `Logo`), the standalone `.svg` files written by
 * `scripts/export-brand.mjs`, and the PNG/ICO raster made from those files. A test pins that
 * the component and the exported file carry the same shapes, because a logo that differs
 * between the app and the app icon is a bug nobody notices until it ships.
 */
export type Paint = 'warm' | 'ink';
export type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number; paint: Paint }
  | { kind: 'path'; d: string; paint: Paint; stroke?: number };

/** The mark's box. Every size in this file is in these units. */
export const MARK_BOX = 64;

/**
 * **Orbit**: a warm goal at the centre and three members on a ring that is broken at each of
 * them. The squad surrounds the goal without closing around it, and nobody is in the middle,
 * because nobody holds the pot.
 *
 * The member discs (r 9) are wider than the links they sit on (7 thick, 1.75 px at a 16 px
 * favicon), so the mark still reads as three people at the smallest size it is ever drawn.
 */
export function orbitShapes(): readonly Shape[] {
  const ring = 21;
  const seats = [0, 120, 240];
  const links: Shape[] = seats.map((angle) => ({
    kind: 'path',
    // 20° of clear space either side of each member.
    d: arc(MARK_BOX / 2, MARK_BOX / 2, ring, angle + 20, angle + 100),
    paint: 'ink',
    stroke: 7,
  }));
  const members: Shape[] = seats.map((angle) => {
    const at = polar(MARK_BOX / 2, MARK_BOX / 2, ring, angle);
    return { kind: 'circle', cx: Number(at.x.toFixed(3)), cy: Number(at.y.toFixed(3)), r: 9,
      paint: 'ink' };
  });
  return [...links, ...members,
    { kind: 'circle', cx: 32, cy: 32, r: 10, paint: 'warm' }];
}

/** How tall the word's ascenders stand in mark units, and the air between mark and word. */
const WORD_ASCENT = 36;
const GAP = 14;
const SCALE = WORD_ASCENT / -WORDMARK.box.y;
/** Baseline placed so the band from ascender to baseline is centred on the mark's own centre;
 * the `q` then hangs below it, as it should. */
const BASELINE = MARK_BOX / 2 + WORD_ASCENT / 2;
const WORD_X = MARK_BOX + GAP - WORDMARK.box.x * SCALE;

export const LOGO_WIDTH = Number((WORD_X + (WORDMARK.box.x + WORDMARK.box.width) * SCALE)
  .toFixed(3));

/**
 * The app icon's safe area: 18% clear space on every side, so a platform that masks the
 * corners (iOS, Android) never cuts into the ring. Shared by the React `AppIcon` and the
 * exported file, so the two cannot drift apart.
 */
export const ICON_INSET = Number((MARK_BOX * 0.18).toFixed(3));
export const ICON_SCALE = Number(((MARK_BOX - ICON_INSET * 2) / MARK_BOX).toFixed(5));

/** The horizontal lockup: the mark, then "Squad Stake" as outlines (never live text). */
export function logoShapes(): readonly Shape[] {
  return [...orbitShapes(), {
    kind: 'path',
    d: transformPath(WORDMARK.path, SCALE, WORD_X, BASELINE),
    paint: 'ink',
  }];
}
