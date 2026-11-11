/*
 * Time-driven motion. AGENTS.md "UI purity" 6: animation comes in as a prop and the component
 * derives its frame from it, so HyperFrames can render frame `n` without ever having played frames
 * 0..n-1. `t` is seconds since the scene started: the web app feeds it from one
 * requestAnimationFrame hook, the video feeds it `frame / fps`, and a fixture feeds it a constant.
 *
 * Everything here is a pure function of `t`. No timers, no clock, no randomness — the purity lint
 * (scripts/ui-purity.mjs) forbids all three inside this package.
 *
 * Results are rounded so that the same `t` always produces byte-identical markup (the Q17
 * determinism tests compare rendered strings).
 */

/** Frozen frame used when the viewer asks for reduced motion: entrances finished, typing
 * complete, rotation and cursor static. Chosen so every entrance and the longest typewriter
 * line are done (0.4 s delay + 36 chars x 35 ms = 1.66 s, count-up ends at 1.6 s). */
export const REDUCED_MOTION_T = 4;

/** Ring periods in seconds, outermost first. Slow on purpose — Nimiq Pay's DESIGN.md puts
 * personality in idle moments, not on money moves — and alternate rings turn the other way. */
export const RING_PERIODS_SECONDS = [38, 52, 30, 46] as const;

export const TYPEWRITER_DELAY_SECONDS = 0.4;
export const TYPEWRITER_SECONDS_PER_CHAR = 0.035;
export const CURSOR_PERIOD_SECONDS = 1;
export const COUNT_UP_SECONDS = 1.6;
export const ENTRANCE_SECONDS = 0.6;
export const ENTRANCE_STAGGER_SECONDS = 0.08;
export const BORDER_PERIOD_SECONDS = 6;
export const TICKER_SECONDS_PER_ITEM = 3.2;

const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export function clamp01(value: number) {
  if (!(value > 0)) return 0;
  return value > 1 ? 1 : value;
}

/** The brief's required easing for entrances and count-ups, as a scalar. */
export function easeOutCubic(progress: number) {
  const p = clamp01(progress);
  return round(1 - (1 - p) ** 3, 5);
}

/** Degrees turned after `t` seconds, normalised to one turn. `direction` -1 reverses. */
export function ringAngle(t: number, periodSeconds: number, direction: 1 | -1 = 1) {
  if (!(periodSeconds > 0)) return 0;
  const turns = (t / periodSeconds) * direction;
  const fraction = turns - Math.floor(turns);
  return round(fraction * 360, 3);
}

/** Direction of ring `index`, outermost first: they alternate. */
export function ringDirection(index: number): 1 | -1 {
  return index % 2 === 0 ? 1 : -1;
}

export function ringPeriod(index: number) {
  return RING_PERIODS_SECONDS[index % RING_PERIODS_SECONDS.length] ?? 38;
}

/** How many characters of a `length`-character line are revealed at `t`. */
export function typedChars(t: number, length: number) {
  if (length <= 0) return 0;
  const elapsed = t - TYPEWRITER_DELAY_SECONDS;
  if (!(elapsed > 0)) return 0;
  const revealed = Math.floor(elapsed / TYPEWRITER_SECONDS_PER_CHAR);
  return revealed > length ? length : revealed;
}

export function typingDoneAt(length: number) {
  return round(TYPEWRITER_DELAY_SECONDS + length * TYPEWRITER_SECONDS_PER_CHAR, 3);
}

/** A cursor that blinks while typing and holds steady once the line is complete. */
export function cursorVisible(t: number, length: number) {
  if (typedChars(t, length) >= length) return true;
  const phase = t / CURSOR_PERIOD_SECONDS;
  return phase - Math.floor(phase) < 0.5;
}

/** Integer luna on the way to `target`, eased, landing exactly on it. Amounts stay integers
 * (AGENTS.md 10) so the same formatter runs on the way up as at rest. */
export function countUp(t: number, target: number, delaySeconds = 0) {
  if (!Number.isFinite(target) || target <= 0) return 0;
  const progress = easeOutCubic((t - delaySeconds) / COUNT_UP_SECONDS);
  return Math.round(target * progress);
}

/** 0..1 entrance progress for the `index`-th element of a staggered group. */
export function entranceProgress(t: number, index = 0) {
  return easeOutCubic((t - index * ENTRANCE_STAGGER_SECONDS) / ENTRANCE_SECONDS);
}

/** 0..1 offset through a looping strip of `count` items. */
export function tickerOffset(t: number, count: number) {
  if (count <= 0) return 0;
  const loop = count * TICKER_SECONDS_PER_ITEM;
  const phase = t / loop;
  return round(phase - Math.floor(phase), 5);
}

/** Where a member sits on a ring: its own angle plus the ring's rotation, and the counter-angle
 * that keeps its identicon upright. */
export function seatAngle(index: number, count: number, ringDegrees: number) {
  if (count <= 0) return 0;
  return round(((index / count) * 360 + ringDegrees) % 360, 3);
}
