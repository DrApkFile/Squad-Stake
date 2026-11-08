import { GoalTicker } from './GoalTicker';
import { GradientBorderButton } from './GradientBorderButton';
import { OrbitSquad } from './OrbitSquad';
import { ScreenHeader } from './ScreenHeader';
import { TypewriterHeading } from './TypewriterHeading';
import { entranceProgress } from './motion';
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
}: SignInScreenProps) {
  const waiting = state.status === 'waiting';
  const success = state.status === 'success';
  return (
    <main className="sign-in" aria-busy={waiting}>
      <ScreenHeader demoLabel={demoLabel} />
      <div className="sign-in-body">
        <TypewriterHeading lead="Save together. " emphasis="Nobody holds the pot." t={t} />
        <p className="intro" style={vars({ '--enter': entranceProgress(t, 18) })}>
          Every share stays in its owner’s wallet, staked and earning, proven on the Nimiq chain.
        </p>
        <div className="sign-in-orbit" style={vars({ '--enter': entranceProgress(t, 22) })}>
          <OrbitSquad
            goal={example.label}
            members={example.members}
            backedLuna={example.backedLuna}
            targetLuna={example.targetLuna}
            t={t}
          />
        </div>
        <div className="sign-in-status" role="status" aria-live="polite">
          {state.status === 'idle' && <p>Sign in to get started. Your signature proves it’s you.</p>}
          {waiting && <><p className="status-title">Approve in Nimiq Pay</p><p>Waiting for your signature…</p></>}
          {(state.status === 'declined' || state.status === 'error') && <>
            <p className="status-title">{state.message}</p><p>{state.nextAction}</p>
          </>}
          {success && <><p className="status-title">You’re signed in.</p><p className="address">{state.address}</p></>}
        </div>
      </div>
      <footer className="sign-in-footer">
        {success
          ? <GradientBorderButton label="Go to my squads" href={onwardUrl} t={t} />
          : openInPayUrl
            ? <GradientBorderButton label="Open in Nimiq Pay ↗" href={openInPayUrl} t={t} />
            : <GradientBorderButton
              label={waiting ? 'Waiting for approval…' : state.status === 'idle' ? 'Sign in with Nimiq Pay' : 'Try sign-in again'}
              onClick={onSignIn}
              disabled={disabled || waiting}
              t={t}
            />}
        <p className="fine-print">Signing in doesn’t move any NIM.</p>
        <GoalTicker goals={goals} caption="Example goals" t={t} />
      </footer>
    </main>
  );
}
