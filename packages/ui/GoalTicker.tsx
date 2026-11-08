import { tickerOffset } from './motion';
import { vars } from './css';

export interface GoalTickerProps {
  /** Examples of what a squad might save for. Never real squads, never usage figures
   * (AGENTS.md "Never fabricate"). */
  goals: readonly string[];
  caption: string;
  t?: number | undefined;
}

export function GoalTicker({ goals, caption, t = 0 }: GoalTickerProps) {
  const offset = tickerOffset(t, goals.length);
  return (
    <div className="ticker" aria-hidden="true">
      <p className="ticker-caption">{caption}</p>
      <div className="ticker-window">
        <div className="ticker-strip" style={vars({ '--ticker-offset': offset })}>
          {/* Two passes of the same list so the strip reads as continuous at any offset. */}
          {[...goals, ...goals].map((goal, index) => (
            <span className="ticker-item" key={`${goal}-${index}`}>
              {goal}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
