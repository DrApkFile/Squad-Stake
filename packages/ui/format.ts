// Formatting happens only at the UI edge (AGENTS.md 10): amounts travel as integer luna.
//
// Every function takes the language, because the separators, the month names and the words
// ("Checked 3 min ago") differ (packages/ui/i18n). `Intl` is deliberately not used: ICU data
// differs between Node builds and browsers, and the web app and the Remotion render must
// produce the same glyphs (AGENTS.md "UI purity" 3), so the separators come from the
// catalogue and the grouping is done here.
import { DEFAULT_LANG, strings, type Lang } from './i18n';

const LUNA_PER_NIM = 100_000;

function group(digits: string, separator: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Luna as a NIM figure with no unit, for places that write the unit themselves. */
export function formatNim(luna: number, lang: Lang = DEFAULT_LANG) {
  const { group: thousands, decimal } = strings(lang).fmt;
  const sign = luna < 0 ? '-' : '';
  const absolute = Math.abs(luna);
  const whole = group(String(Math.floor(absolute / LUNA_PER_NIM)), thousands);
  const fraction = String(absolute % LUNA_PER_NIM).padStart(5, '0').replace(/0+$/, '');
  return `${sign}${whole}${fraction ? `${decimal}${fraction}` : ''}`;
}

export function formatLuna(luna: number, lang: Lang = DEFAULT_LANG) {
  return `${formatNim(luna, lang)} NIM`;
}

/** A plain count — a block number, a confirmation total — grouped the way the language does
 * it. Replaces `toLocaleString`, which depends on the runtime's ICU data. */
export function formatCount(value: number, lang: Lang = DEFAULT_LANG) {
  const sign = value < 0 ? '-' : '';
  return `${sign}${group(String(Math.abs(Math.trunc(value))), strings(lang).fmt.group)}`;
}

/**
 * UTC and the catalogue's month list on purpose: the web app and the Remotion render must
 * produce the same glyphs whatever the machine's timezone or ICU data (AGENTS.md "UI purity").
 */
export function formatDay(milliseconds: number, lang: Lang = DEFAULT_LANG) {
  const { months, day } = strings(lang).fmt;
  const date = new Date(milliseconds);
  return day(date.getUTCDate(), months[date.getUTCMonth()] ?? '', date.getUTCFullYear());
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
export function readAge(readAt: number | null, now: number, lang: Lang = DEFAULT_LANG) {
  const { readAgeNone, readAgeSeconds, readAgeMinutes, readAgeHours } = strings(lang).fmt;
  if (readAt === null) return readAgeNone;
  const seconds = Math.max(0, Math.floor((now - readAt) / 1000));
  if (seconds < 60) return readAgeSeconds(seconds);
  const minutes = Math.floor(seconds / 60);
  // "Checked 184 min ago" is a number the reader has to divide. A snapshot keeps its original
  // timestamp when a refresh fails, so ages past an hour are reachable (docs/AUDIT.md, m-5).
  if (minutes < 60) return readAgeMinutes(minutes);
  return readAgeHours(Math.floor(minutes / 60), minutes % 60);
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

export function formatDayIn(milliseconds: number, offsetMinutes: number, lang: Lang = DEFAULT_LANG) {
  return formatDay(milliseconds + offsetMinutes * 60_000, lang);
}

export function formatTimeIn(milliseconds: number, offsetMinutes: number) {
  const shifted = new Date(milliseconds + offsetMinutes * 60_000);
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** `UTC`, `UTC+1`, `UTC-5:30` — named beside every local time, so a screenshot of the screen
 * is still unambiguous. The label itself is the same in every language. */
export function zoneLabel(offsetMinutes: number) {
  if (offsetMinutes === 0) return 'UTC';
  const absolute = Math.abs(offsetMinutes);
  const minutes = absolute % 60;
  return `UTC${offsetMinutes > 0 ? '+' : '-'}${Math.floor(absolute / 60)}${minutes === 0 ? '' : `:${pad(minutes)}`}`;
}

export function formatMoment(
  milliseconds: number, offsetMinutes: number, lang: Lang = DEFAULT_LANG,
) {
  return strings(lang).fmt.dayTime(
    formatDayIn(milliseconds, offsetMinutes, lang),
    formatTimeIn(milliseconds, offsetMinutes),
    zoneLabel(offsetMinutes),
  );
}

/**
 * How long is left, in the coarsest unit that is still useful. Never negative: a countdown
 * that has run out says so, because the permission it was counting to is the chain's to give
 * and only a chain read can confirm it (Q11).
 */
export function countdown(remainingMs: number, lang: Lang = DEFAULT_LANG) {
  const fmt = strings(lang).fmt;
  if (remainingMs <= 0) return fmt.countdownNow;
  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return fmt.countdownDaysHours(days, hours);
  if (hours > 0) return fmt.countdownHoursMinutes(hours, minutes);
  if (minutes > 0) return fmt.countdownMinutes(minutes);
  return fmt.countdownUnderMinute;
}

/**
 * A pool fee as a percentage. The Validators API publishes it as a fraction of 1 (0.05 = 5 %,
 * `server/utils/schemas.ts`), so the conversion happens here, at the UI edge, with at most two
 * decimals and the language's decimal mark. Rounding is `Math.round`, and the figure is only
 * ever shown beside the pool's name, never used in a calculation.
 */
export function formatPercent(fraction: number, lang: Lang = DEFAULT_LANG) {
  const { decimal, percent } = strings(lang).fmt;
  const rounded = Math.round(fraction * 10_000) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '');
  return percent(text.replace('.', decimal));
}

/**
 * A link shortened for **recognition, not for typing**: `squad-stake.vercel.app/proof/a1b2…9f`.
 *
 * No screen prints a full URL — it is the one string that must not be mistyped, and a phone
 * cannot select it comfortably, so the whole link only ever travels by the share sheet or the
 * clipboard (docs/AUDIT.md, M-1). But a card with two buttons and no link at all gives the
 * organiser nothing to recognise, so this is what is shown instead: enough of the address to
 * see that a link exists and which one it is, and never enough to retype.
 *
 * Deliberately a string walk rather than `new URL`: this runs in `packages/ui`, it must not
 * throw on whatever it is handed, and a relative path shortens just as usefully as an
 * absolute one.
 */
export function shortLink(url: string) {
  const withoutScheme = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^www\./i, '');
  const [path = ''] = withoutScheme.split(/[?#]/);
  const trimmed = path.replace(/\/+$/, '');
  const parts = trimmed.split('/');
  const last = parts.at(-1) ?? '';
  // Short enough to read whole; anything longer is an id, and an id is what gets elided.
  if (parts.length < 2 || last.length <= 9) return trimmed;
  return [...parts.slice(0, -1), `${last.slice(0, 4)}…${last.slice(-3)}`].join('/');
}
