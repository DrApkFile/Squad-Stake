/**
 * A status hue is never the only signal (Nimiq Pay PRODUCT.md, "Color is never the only
 * signal"): this dot always sits next to the word, and carries the word as its own label for
 * screen readers.
 */
export type SquadStatusTone = 'BACKED' | 'SHORT' | 'UNSTAKING' | 'READY' | 'NEUTRAL';

export interface StatusDotProps {
  tone: SquadStatusTone;
  label: string;
}

export function StatusDot({ tone, label }: StatusDotProps) {
  return <span className="status-dot" data-tone={tone} role="img" aria-label={label} />;
}
