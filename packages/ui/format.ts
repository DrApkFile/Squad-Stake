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

/**
 * A deadline is a moment, not a day, so the planner shows the time too — and in the member's
 * own zone, because "start leaving by 22:00" is only actionable in local time (PRD §7.5, Q08).
 *
 * The offset arrives as a **prop**, never from the environment: a component that read the
 * machine's zone would render differently in the app, in the Remotion render and in a test
 * (AGENTS.md "UI purity" 1). `formatDay` stays UTC for everything that is genuinely a UTC day.
 */
const pad = (value: number) => String(value).padStart(2, '0');

export function formatDayIn(milliseconds: number, offsetMinutes: number) {
  return formatDay(milliseconds + offsetMinutes * 60_000);
}

export function formatTimeIn(milliseconds: number, offsetMinutes: number) {
  const shifted = new Date(milliseconds + offsetMinutes * 60_000);
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** `UTC`, `UTC+1`, `UTC-5:30` — named beside every local time, so a screenshot of the screen
 * is still unambiguous. */
export function zoneLabel(offsetMinutes: number) {
  if (offsetMinutes === 0) return 'UTC';
  const absolute = Math.abs(offsetMinutes);
  const minutes = absolute % 60;
  return `UTC${offsetMinutes > 0 ? '+' : '-'}${Math.floor(absolute / 60)}${minutes === 0 ? '' : `:${pad(minutes)}`}`;
}

export function formatMoment(milliseconds: number, offsetMinutes: number) {
  return `${formatDayIn(milliseconds, offsetMinutes)}, ${formatTimeIn(milliseconds, offsetMinutes)} ${zoneLabel(offsetMinutes)}`;
}

/**
 * How long is left, in the coarsest unit that is still useful. Never negative: a countdown
 * that has run out says so, because the permission it was counting to is the chain's to give
 * and only a chain read can confirm it (Q11).
 */
export function countdown(remainingMs: number) {
  if (remainingMs <= 0) return 'any moment now';
  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min`;
  return 'under a minute';
}
