import { vars } from './css';
import { ringAngle } from './motion';

/** One turn in a little over a second: fast enough to read as "working", slow enough not to
 * strobe. A spinner is the one place in this app where motion carries information. */
export const SPINNER_PERIOD_SECONDS = 1.1;

export interface SpinnerProps {
  /** Seconds since the scene started. Frozen under reduced motion, which is why every caller
   * also changes its label — the words carry the meaning, the turning only reinforces it. */
  t?: number | undefined;
  /** Diameter in px. 16 beside a label, larger on its own. */
  size?: number | undefined;
}

/**
 * A turning arc, as a pure function of `t` (AGENTS.md "UI purity" 6): the angle is computed
 * here and handed to CSS as a custom property, so there is no `@keyframes` loop, no timer, and
 * HyperFrames renders frame `n` of the turn without having played the ones before it.
 *
 * Decorative by itself — it is always `aria-hidden`, and the control that owns it carries the
 * `aria-busy` and the changed label a screen reader actually announces.
 */
export function Spinner({ t = 0, size = 16 }: SpinnerProps) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24"
      aria-hidden="true" focusable="false"
      style={vars({ '--spin': `${ringAngle(t, SPINNER_PERIOD_SECONDS)}deg` })}>
      <circle className="spinner-track" cx="12" cy="12" r="9" />
      {/* A quarter turn of the same circle, so the gap is what shows the rotation. */}
      <path className="spinner-arc" d="M 12 3 a 9 9 0 0 1 9 9" />
    </svg>
  );
}

export interface RefreshButtonProps {
  onClick?: (() => void) | undefined;
  /** True while the read is in flight. */
  refreshing?: boolean | undefined;
  t?: number | undefined;
  label: string;
  /** What the button says while it is reading. Reported from a phone: a tap that changed
   * nothing on screen read as a button that does nothing (docs/PROGRESS.md 2026-11-09). */
  busyLabel: string;
  /** Beside a transaction, where the control is secondary to the status above it. */
  quiet?: boolean | undefined;
}

/**
 * The one control every screen uses to re-read the chain. Reading is never sending, so this is
 * always safe to offer — and it now says so while it happens.
 */
export function RefreshButton({
  onClick, refreshing = false, t = 0, label, busyLabel, quiet = false,
}: RefreshButtonProps) {
  return (
    <button type="button" aria-busy={refreshing} disabled={refreshing} onClick={onClick}
      className={quiet ? 'secondary-button secondary-button-quiet' : 'secondary-button'}>
      {refreshing && <Spinner t={t} />}
      {refreshing ? busyLabel : label}
    </button>
  );
}
