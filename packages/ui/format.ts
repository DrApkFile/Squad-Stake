// Formatting happens only at the UI edge (AGENTS.md 10): amounts travel as integer luna.

export function formatLuna(luna: number) {
  const whole = Math.floor(luna / 100_000).toLocaleString('en-US');
  const fraction = String(luna % 100_000).padStart(5, '0').replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''} NIM`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/**
 * UTC and a fixed month list on purpose: the web app and the Remotion render must produce
 * the same glyphs whatever the machine's timezone or ICU data (AGENTS.md "UI purity").
 */
export function formatDay(milliseconds: number) {
  const date = new Date(milliseconds);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()] ?? ''} ${date.getUTCFullYear()}`;
}

/** Whole days between two instants, floored — used for "goal in N days" copy. */
export function daysBetween(from: number, to: number) {
  return Math.floor((to - from) / 86_400_000);
}
