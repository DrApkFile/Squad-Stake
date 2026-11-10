import { GoalTicker } from './GoalTicker';
import { OrbitSquad } from './OrbitSquad';
import { ScreenHeader } from './ScreenHeader';
import { TypewriterHeading } from './TypewriterHeading';
import { entranceProgress } from './motion';
import { Spinner } from './Spinner';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
import { vars } from './css';
import type { OrbitMember } from './OrbitSquad';

export type SignInState =
  | { status: 'idle' }
  | { status: 'waiting' }
  | { status: 'declined'; message: string; nextAction: string }
  | { status: 'error'; message: string; nextAction: string }
  | { status: 'success'; address: string };

export interface SignInScreenProps {
  state: SignInState;
  /** The orbit on the welcome screen shows an invented squad, labelled as one: it is a picture
   * of the idea, never a real squad and never a usage figure (AGENTS.md "Never fabricate"). */
  example: {
    goal: string;
    label: string;
    members: readonly OrbitMember[];
    backedLuna: number;
    targetLuna: number | null;
  };
  /** Example saving goals for the ticker. Also samples, also labelled. */
  goals: readonly string[];
  onSignIn?: (() => void) | undefined;
  disabled?: boolean | undefined;
  openInPayUrl?: string | undefined;
  /** Where a signed-in visitor goes next, so the screen is never a dead end even without JS. */
  onwardUrl?: string | undefined;
  /** Seconds since the screen appeared; drives the typewriter, the orbit and the entrances. */
  t?: number | undefined;
  demoLabel?: string | undefined;
  lang?: Lang | undefined;
}

/** Screens 1 and 2: welcome and sign in, one screen. */
export function SignInScreen({
  state,
  example,
  goals,
  onSignIn,
  disabled = false,
  openInPayUrl,
  onwardUrl = '/squads',
  t = 0,
  demoLabel,
  lang = DEFAULT_LANG,
}: SignInScreenProps) {
  const s = strings(lang);
  const waiting = state.status === 'waiting';
  const success = state.status === 'success';
  return (
    <main className="sign-in" aria-busy={waiting}>
      <ScreenHeader demoLabel={demoLabel} lang={lang} />
      <div className="sign-in-body">
        <TypewriterHeading lead={s.signIn.headingLead} emphasis={s.signIn.headingEmphasis} t={t} />
        <p className="intro" style={vars({ '--enter': entranceProgress(t, 18) })}>
          {s.signIn.intro}
        </p>
        {/* What the app actually is. The screen used to open on "nobody holds the pot", which
            answers an objection a first-time visitor has not had yet; these three rows answer
            the question they do have. Each is one short sentence, per the native-UI rule. */}
        <section className="card how-card" style={vars({ '--enter': entranceProgress(t, 22) })}>
          <h2 className="card-title">{s.signIn.howTitle}</h2>
          <ol className="how-list">
            {[
              { title: s.signIn.how1Title, body: s.signIn.how1Body },
              { title: s.signIn.how2Title, body: s.signIn.how2Body },
              { title: s.signIn.how3Title, body: s.signIn.how3Body },
            ].map((row, index) => (
              <li className="how-row" key={row.title}>
                <span className="how-index" aria-hidden="true">{index + 1}</span>
                <span className="how-main">
                  <span className="how-title">{row.title}</span>
                  <span className="how-body">{row.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <div className="sign-in-orbit" style={vars({ '--enter': entranceProgress(t, 28) })}>
          <OrbitSquad
            goal={example.label}
            members={example.members}
            backedLuna={example.backedLuna}
            targetLuna={example.targetLuna}
            t={t}
            lang={lang}
          />
        </div>
        <GoalTicker goals={goals} caption={s.signIn.exampleGoals} t={t} />
        <div className="sign-in-status" role="status" aria-live="polite">
          {state.status === 'idle' && <p>{s.signIn.idle}</p>}
          {waiting && <><p className="status-title">{s.common.approveInPay}</p><p>{s.signIn.waitingSignature}</p></>}
          {(state.status === 'declined' || state.status === 'error') && <>
            <p className="status-title">{state.message}</p><p>{state.nextAction}</p>
          </>}
          {success && <><p className="status-title">{s.signIn.signedIn}</p><p className="address">{state.address}</p></>}
        </div>
      </div>
      {/* The screen now explains itself, so it is taller than one phone. The action sticks to
          the bottom inside the safe area, so "Sign in" is never scrolled out of reach. */}
      <footer className="action-bar">
        {/* Filled ink, like every other screen's main action. It used to be the outlined
            gradient pill, which is this app's quiet style for a secondary action — and on the
            one screen whose *only* control it is, that read as optional
            (docs/AUDIT.md n-5, docs/DECISIONS.md). */}
        {success
          ? <a className="primary-button" href={onwardUrl}>{s.signIn.goToSquads}</a>
          : openInPayUrl
            ? <a className="primary-button" href={openInPayUrl}>{s.signIn.openInPay}</a>
            : <button className="primary-button" type="button" onClick={onSignIn}
              disabled={disabled || waiting} aria-busy={waiting}>
              {waiting && <Spinner t={t} />}
              {waiting ? s.signIn.waitingApproval
                : state.status === 'idle' ? s.signIn.signIn : s.signIn.tryAgain}
            </button>}
        <p className="fine-print">{s.signIn.fineprint}</p>
      </footer>
    </main>
  );
}
