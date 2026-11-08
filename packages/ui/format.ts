// Formatting happens only at the UI edge (AGENTS.md 10): amounts travel as integer luna.

/** Luna as a NIM figure with no unit, for places that write the unit themselves. */
export function formatNim(luna: number) {
  const whole = Math.floor(luna / 100_000).toLocaleString('en-US');
  const fraction = String(luna % 100_000).padStart(5, '0').replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''}`;
}

export function formatLuna(luna: number) {
  return `${formatNim(luna)} NIM`;
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

/**
 * The age of a chain read, always shown beside the value it describes: a node that is down must
 * show the last known state with its age, never an invented fresh one
 * (briefing/FAILURE_MODES.md, AGENTS.md "Never fabricate").
 */
export function readAge(readAt: number | null, now: number) {
  if (readAt === null) return 'Chain read: —';
  const seconds = Math.max(0, Math.floor((now - readAt) / 1000));
  return `Checked ${seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min`} ago`;
}

/**
 * A Nimiq address shortened for a roster or a public proof: first two groups and the last one.
 * The proof view also prints the address in full, because that is what a reader re-checks.
 */
export function shortAddress(address: string) {
  const parts = address.split(' ');
  const last = parts[parts.length - 1];
  if (parts.length < 4 || last === undefined) return address;
  return `${parts[0]} ${parts[1]} … ${last}`;
}
