import { BORDER_PERIOD_SECONDS, ringAngle } from './motion';
import { vars } from './css';

export interface GradientBorderButtonProps {
  label: string;
  /** Rendered as a link when set (the "Open in Nimiq Pay" deeplink). */
  href?: string | undefined;
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  t?: number | undefined;
  pressed?: boolean | undefined;
}

/**
 * The playful control: a pill with a rotating gold-to-navy conic border.
 *
 * Nimiq Pay's DESIGN.md reserves pills for navigation and toggles and `rounded-lg` rectangles
 * for committing money, and keeps Honey Coin gold off money-move screens. So this button is only
 * for non-money actions (sign in, create squad, share invite); money uses MoneyButton.
 */
export function GradientBorderButton({
  label,
  href,
  onClick,
  disabled = false,
  t = 0,
  pressed = false,
}: GradientBorderButtonProps) {
  const style = vars({ '--border-angle': `${ringAngle(t, BORDER_PERIOD_SECONDS)}deg` });
  const inner = (
    <>
      <span className="gradient-button-border" aria-hidden="true" />
      <span className="gradient-button-label">{label}</span>
    </>
  );
  if (href) {
    return (
      <a className="gradient-button" href={href} style={style} data-pressed={pressed ? 'yes' : 'no'}>
        {inner}
      </a>
    );
  }
  return (
    <button
      className="gradient-button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={style}
      data-pressed={pressed ? 'yes' : 'no'}
    >
      {inner}
    </button>
  );
}
