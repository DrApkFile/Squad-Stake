import { GradientBorderButton } from './GradientBorderButton';
import { OrbitSquad } from './OrbitSquad';
import { ScreenHeader } from './ScreenHeader';
import { daysBetween, formatDay, formatLuna } from './format';
import { fiatLine, fiatNote, type FiatRate } from './fiat';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
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
  /** PRD §9.11. Null or absent when the price source failed, and the estimate is then simply
   * not shown (packages/ui/fiat.ts). */
  fiat?: FiatRate | null | undefined;
  t?: number | undefined;
  demoLabel?: string | undefined;
  lang?: Lang | undefined;
}

/** Screen 3. The first screen after signing in, and the one the empty state has to carry. */
export function MySquadsScreen({
  squads,
  now,
  loading = false,
  error,
  createUrl,
  fiat = null,
  t = 0,
  demoLabel,
  lang = DEFAULT_LANG,
}: MySquadsScreenProps) {
  const s = strings(lang);
  return (
    <main className="sheet" aria-busy={loading}>
      <ScreenHeader demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">{s.mySquads.eyebrow}</p>
        <h1>{squads.length === 0 ? s.mySquads.headingEmpty : s.mySquads.heading}</h1>
        {loading && <p className="intro">{s.common.unknownValue}</p>}
        {!loading && squads.length === 0 && !error && (
          <p className="intro">{s.mySquads.introEmpty}</p>
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
                    lang={lang}
                    still
                  />
                </span>
                <span className="squad-card-main">
                  <span className="squad-card-name">{squad.name}</span>
                  <span className="squad-card-meta">
                    {s.mySquads.cardMeta(
                      squad.mode === 'A' ? s.common.modeA : s.common.modeB,
                      s.common.members(squad.memberCount),
                    )}
                  </span>
                  <span className="squad-card-meta">
                    {s.common.goalDayIn(
                      formatDay(squad.goalAt, lang),
                      daysBetween(now, squad.goalAt) >= 0 ? daysBetween(now, squad.goalAt) : null,
                    )}
                  </span>
                  <span className="squad-card-figure">
                    {s.mySquads.cardFigure(
                      formatLuna(squad.squadCommittedLuna, lang),
                      squad.targetLuna === null ? null : formatLuna(squad.targetLuna, lang),
                    )}
                  </span>
                  {/* The estimate sits under the real figure, never instead of it. */}
                  {fiat !== null && (
                    <span className="squad-card-meta squad-card-fiat">
                      {fiatLine(squad.targetLuna ?? squad.squadCommittedLuna, fiat, lang)}
                    </span>
                  )}
                  <span className="squad-card-meta">
                    {s.mySquads.cardYours(formatLuna(squad.committedLuna, lang))}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        {fiat !== null && squads.length > 0 && (
          <p className="fine-print fine-print-left">{fiatNote(fiat, now, lang)}</p>
        )}
      </div>
      <footer className="sheet-footer">
        <GradientBorderButton label={s.mySquads.createSquad} href={createUrl} t={t} />
        <p className="fine-print">{s.common.neverHolds}</p>
      </footer>
    </main>
  );
}
