/**
 * Arc maths for the brand marks. Pure trigonometry with no clock and no randomness, so a mark
 * renders byte-for-byte the same in the app, in a test and in the video (AGENTS.md "UI purity").
 *
 * Angles are degrees clockwise from twelve o'clock, which is how the marks are described in
 * `docs/design/` and in the comments below: 0 is the top, 90 is the right.
 */
export interface Point { x: number; y: number }

export function polar(cx: number, cy: number, radius: number, degrees: number): Point {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

/** A stroked arc from `from` to `to`, clockwise. Used with a round cap and no fill. */
export function arc(
  cx: number, cy: number, radius: number, from: number, to: number,
): string {
  const start = polar(cx, cy, radius, from);
  const end = polar(cx, cy, radius, to);
  const sweep = ((to - from) % 360 + 360) % 360;
  const large = sweep > 180 ? 1 : 0;
  // Three decimals: enough for a 1024 px render, and stable across machines.
  const fixed = (value: number) => value.toFixed(3);
  return `M ${fixed(start.x)} ${fixed(start.y)} A ${radius} ${radius} 0 ${large} 1 `
    + `${fixed(end.x)} ${fixed(end.y)}`;
}

/**
 * Scales and moves a path made of absolute `M`/`L`/`Q`/`Z` commands, which is the only shape
 * `scripts/build-wordmark.mjs` emits. Every number in such a path is a coordinate, alternating
 * x and y, so they can be mapped in order — there are no arc flags or relative commands to
 * misread. Three decimals, like `arc`.
 */
export function transformPath(d: string, scale: number, dx: number, dy: number): string {
  let even = true;
  return d.replace(/-?\d+(?:\.\d+)?/g, (raw) => {
    const value = Number(raw) * scale + (even ? dx : dy);
    even = !even;
    return value.toFixed(3);
  });
}
