import { paintOf, type MarkProps } from './paint';
import { MARK_BOX, orbitShapes, type Shape } from './shapes';
import { toneColours } from './tone';

/** One shape, drawn the same way here and in `svg.ts`. */
export function ShapeNodes({ shapes, colours, gradientId }: {
  shapes: readonly Shape[];
  colours: ReturnType<typeof toneColours>;
  gradientId: string;
}) {
  return <>{shapes.map((shape, index) => {
    const paint = paintOf(shape, colours, gradientId);
    // The index is the shape's position in a fixed, hand-written list, not a generated id:
    // the list never reorders, so this key is stable (AGENTS.md "UI purity" 1).
    if (shape.kind === 'circle') {
      return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={paint} />;
    }
    if (shape.stroke === undefined) return <path key={index} d={shape.d} fill={paint} />;
    return <path key={index} d={shape.d} fill="none" stroke={paint}
      strokeWidth={shape.stroke} strokeLinecap="round" />;
  })}</>;
}

/** The warm gradient, defined once per drawing. */
export function WarmGradient({ id, colours }: {
  id: string; colours: ReturnType<typeof toneColours>;
}) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={colours.warmFrom} />
      <stop offset="1" stopColor={colours.warmTo} />
    </linearGradient>
  );
}

/**
 * The Squad Stake mark: a warm goal at the centre, three members on a ring that breaks at each
 * of them. The squad surrounds the goal without closing around it, and nobody sits in the
 * middle, because nobody holds the pot.
 *
 * Pure display, no animation of its own: anything that moves takes `t` and lives elsewhere.
 */
export function LogoMark({
  size = 32, tone = 'colour-dark', id = 'sq-mark', title = 'Squad Stake', className,
}: MarkProps) {
  const colours = toneColours(tone);
  const gradientId = `${id}-warm`;
  return (
    <svg viewBox={`0 0 ${MARK_BOX} ${MARK_BOX}`} width={size} height={size} className={className}
      role={title === null ? 'presentation' : 'img'}
      aria-hidden={title === null ? true : undefined} xmlns="http://www.w3.org/2000/svg">
      {title !== null && <title>{title}</title>}
      <defs><WarmGradient id={gradientId} colours={colours} /></defs>
      <ShapeNodes shapes={orbitShapes()} colours={colours} gradientId={gradientId} />
    </svg>
  );
}
