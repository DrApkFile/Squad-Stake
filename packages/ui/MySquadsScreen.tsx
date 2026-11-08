import { GradientBorderButton } from './GradientBorderButton';
import { OrbitSquad } from './OrbitSquad';
import { ScreenHeader } from './ScreenHeader';
import { daysBetween, formatDay, formatLuna } from './format';
import { entranceProgress } from './motion';
import { vars } from './css';
import type { OrbitMember } from './OrbitSquad';

export interface SquadCardView {
  /** Squad id, from data. */
  id: string;
  name: string;
  mode: 'A' | 'B';
  href: string;
  goalAt: number;
  targetLuna: number | null;
  /** What this member committed. */
  committedLuna: number;
  /** Σ commitments of the squad's active members. This is our own record, not a chain read:
   * the card says "committed", and only the squad page says "backed". */
  squadCommittedLuna: number;
  memberCount: number;
  members: readonly OrbitMember[];
}

export interface MySquadsScreenProps {
  squads: readonly SquadCardView[];
  now: number;
  loading?: boolean | undefined;
  error?: { message: string; nextAction: string } | undefined;
  createUrl: string;
  t?: number | undefined;
  demoLabel?: string | undefined;
}

/** Screen 3. The first screen after signing in, and the one the empty state has to carry. */
export function MySquadsScreen({
  squads,
  now,
  loading = false,
  error,
  createUrl,
  t = 0,
  demoLabel,
}: MySquadsScreenProps) {
  return (
    <main className="sheet" aria-busy={loading}>
      <ScreenHeader demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">YOUR SQUADS</p>
        <h1>{squads.length === 0 ? 'Start a squad.' : 'Your squads.'}</h1>
        {loading && <p className="intro">—</p>}
        {!loading && squads.length === 0 && !error && (
          <p className="intro">
            A squad is a goal, a date and the people saving for it. Every share stays in its
            owner’s wallet.
          </p>
        )}
        {error && (
          <div className="sheet-status" role="status" aria-live="polite">
            <p className="status-title">{error.message}</p>
            <p>{error.nextAction}</p>
          </div>
        )}
        <ul className="card-list">
          {squads.map((squad, index) => (
            <li key={squad.id} style={vars({ '--enter': entranceProgress(t, index) })}>
              <a className="squad-card" href={squad.href}>
                <span className="squad-card-orbit" aria-hidden="true">
                  <OrbitSquad
                    goal=""
                    members={squad.members}
                    backedLuna={squad.squadCommittedLuna}
                    targetLuna={squad.targetLuna}
                    totalWord="committed"
                    still
                  />
                </span>
                <span className="squad-card-main">
                  <span className="squad-card-name">{squad.name}</span>
                  <span className="squad-card-meta">
                    {squad.mode === 'A' ? 'Shared goal' : 'Together goals'} ·{' '}
                    {squad.memberCount} {squad.memberCount === 1 ? 'member' : 'members'}
                  </span>
                  <span className="squad-card-meta">
                    Goal day {formatDay(squad.goalAt)}
                    {daysBetween(now, squad.goalAt) >= 0
                      ? `, in ${daysBetween(now, squad.goalAt)} ${daysBetween(now, squad.goalAt) === 1 ? 'day' : 'days'}`
                      : ''}
                  </span>
                  <span className="squad-card-figure">
                    {formatLuna(squad.squadCommittedLuna)} committed
                    {squad.targetLuna === null ? '' : ` of ${formatLuna(squad.targetLuna)}`}
                  </span>
                  <span className="squad-card-meta">
                    Yours: {formatLuna(squad.committedLuna)} · statuses are read from the chain on
                    the squad page
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <footer className="sheet-footer">
        <GradientBorderButton label="Create squad" href={createUrl} t={t} />
        <p className="fine-print">Squad Stake never holds your NIM. Only your approval moves it.</p>
      </footer>
    </main>
  );
}
