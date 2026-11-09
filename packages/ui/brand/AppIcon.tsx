import { ShapeNodes } from './LogoMark';
import { ICON_INSET, ICON_SCALE, MARK_BOX, orbitShapes } from './shapes';
import { BRAND_COLOURS, toneColours } from './tone';

/**
 * The square app icon: the white mark on Nimiq's own warm radial (`--nq-gold-bg` in
 * tokens.css — 100% at bottom right, Streetlamp into Honey Coin), with the safe padding from
 * `shapes.ts`. The exported file (`appIconSvg`) is built from the same shapes and the same
 * two constants; `tests/unit/brand.test.ts` pins that they agree.
 */
export function AppIcon({ size = 64, id = 'sq-icon', title = 'Squad Stake', className }: {
  size?: number | undefined;
  id?: string | undefined;
  title?: string | null | undefined;
  className?: string | undefined;
}) {
  const colours = toneColours('white');
  return (
    <svg viewBox={`0 0 ${MARK_BOX} ${MARK_BOX}`} width={size} height={size} className={className}
      role={title === null ? 'presentation' : 'img'}
      aria-hidden={title === null ? true : undefined} xmlns="http://www.w3.org/2000/svg">
      {title !== null && <title>{title}</title>}
      <defs>
        <radialGradient id={`${id}-tile`} cx="1" cy="1" r="1.4142">
          <stop offset="0" stopColor={BRAND_COLOURS.streetlamp} />
          <stop offset="1" stopColor={BRAND_COLOURS.gold} />
        </radialGradient>
      </defs>
      <rect width={MARK_BOX} height={MARK_BOX} fill={`url(#${id}-tile)`} />
      <g transform={`translate(${ICON_INSET} ${ICON_INSET}) scale(${ICON_SCALE})`}>
        <ShapeNodes shapes={orbitShapes()} colours={colours} gradientId={`${id}-warm`} />
      </g>
    </svg>
  );
}
