import type { CSSProperties } from 'react';

/**
 * Per-frame values reach CSS as custom properties; the rules that consume them stay in
 * styles.css and the palette stays in tokens.css (AGENTS.md "UI purity" 3). React's
 * CSSProperties has no index signature for `--*`, so the cast lives here only.
 */
export function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}
