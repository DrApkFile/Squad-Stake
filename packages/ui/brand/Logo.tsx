import { ShapeNodes, WarmGradient } from './LogoMark';
import type { MarkProps } from './paint';
import { LOGO_WIDTH, MARK_BOX, logoShapes } from './shapes';
import { toneColours } from './tone';

/**
 * The full lockup: the mark and the words "Squad Stake". The words are outlines taken from the
 * Mulish 700 file this repository self-hosts (`packages/ui/brand/wordmark.ts`), never live
 * text, so the logo renders identically where no stylesheet exists — an exported `.svg`, a
 * PNG, an app icon — and in the Remotion video.
 */
export function Logo({
  size = 32, tone = 'colour-dark', id = 'sq-logo', title = 'Squad Stake', className,
}: MarkProps) {
  const colours = toneColours(tone);
  const gradientId = `${id}-warm`;
  return (
    <svg viewBox={`0 0 ${LOGO_WIDTH} ${MARK_BOX}`} height={size}
      width={(size * LOGO_WIDTH) / MARK_BOX} className={className}
      role={title === null ? 'presentation' : 'img'}
      aria-hidden={title === null ? true : undefined} xmlns="http://www.w3.org/2000/svg">
      {title !== null && <title>{title}</title>}
      <defs><WarmGradient id={gradientId} colours={colours} /></defs>
      <ShapeNodes shapes={logoShapes()} colours={colours} gradientId={gradientId} />
    </svg>
  );
}
