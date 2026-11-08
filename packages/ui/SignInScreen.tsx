import { GoalTicker } from './GoalTicker';
import { GradientBorderButton } from './GradientBorderButton';
import { OrbitSquad } from './OrbitSquad';
import { ScreenHeader } from './ScreenHeader';
import { TypewriterHeading } from './TypewriterHeading';
import { entranceProgress } from './motion';
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
      <ScreenHeader demoLabel={demoLabel} />
      <div className="sign-in-body">
        <TypewriterHeading lead={s.signIn.headingLead} emphasis={s.signIn.headingEmphasis} t={t} />
        <p className="intro" style={vars({ '--enter': entranceProgress(t, 18) })}>
          {s.signIn.intro}
        </p>
        <div className="sign-in-orbit" style={vars({ '--enter': entranceProgress(t, 22) })}>
          <OrbitSquad
            goal={example.label}
            members={example.members}
            backedLuna={example.backedLuna}
            targetLuna={example.targetLuna}
            t={t}
            lang={lang}
          />
        </div>
        <div className="sign-in-status" role="status" aria-live="polite">
          {state.status === 'idle' && <p>{s.signIn.idle}</p>}
          {waiting && <><p className="status-title">{s.common.approveInPay}</p><p>{s.signIn.waitingSignature}</p></>}
          {(state.status === 'declined' || state.status === 'error') && <>
            <p className="status-title">{state.message}</p><p>{state.nextAction}</p>
          </>}
          {success && <><p className="status-title">{s.signIn.signedIn}</p><p className="address">{state.address}</p></>}
        </div>
      </div>
      <footer className="sign-in-footer">
        {success
          ? <GradientBorderButton label={s.signIn.goToSquads} href={onwardUrl} t={t} />
          : openInPayUrl
            ? <GradientBorderButton label={s.signIn.openInPay} href={openInPayUrl} t={t} />
            : <GradientBorderButton
              label={waiting ? s.signIn.waitingApproval : state.status === 'idle' ? s.signIn.signIn : s.signIn.tryAgain}
              onClick={onSignIn}
              disabled={disabled || waiting}
              t={t}
            />}
        <p className="fine-print">{s.signIn.fineprint}</p>
        <GoalTicker goals={goals} caption={s.signIn.exampleGoals} t={t} />
      </footer>
    </main>
  );
}
