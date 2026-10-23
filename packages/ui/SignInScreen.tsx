export type SignInState =
  | { status: 'idle' }
  | { status: 'waiting' }
  | { status: 'declined'; message: string; nextAction: string }
  | { status: 'error'; message: string; nextAction: string }
  | { status: 'success'; address: string };

export interface SignInScreenProps {
  state: SignInState;
  onSignIn?: () => void;
  disabled?: boolean;
  openInPayUrl?: string;
  demoLabel?: string;
}

export function SignInScreen({ state, onSignIn, disabled = false, openInPayUrl, demoLabel }: SignInScreenProps) {
  const waiting = state.status === 'waiting';
  const success = state.status === 'success';
  return (
    <main className="sign-in" aria-busy={waiting}>
      <header className="brand"><span className="brand-mark" aria-hidden="true">s.</span> Squad Stake</header>
      {demoLabel && <p className="demo-label">{demoLabel}</p>}
      <div className="sign-in-body">
        <div className="squad-symbol" aria-hidden="true"><i /><i /><i /></div>
        <p className="eyebrow">A LITTLE TOGETHER GOES A LONG WAY</p>
        <h1>Save together.<br />Keep it yours.</h1>
        <p className="intro">Your goal. Your friends. Your wallet.<br />Nobody holds the pot.</p>
        <div className="sign-in-status" role="status" aria-live="polite">
          {state.status === 'idle' && <p>Sign in to get started. Your signature proves it’s you.</p>}
          {waiting && <><p className="status-title">Approve in Nimiq Pay</p><p>Waiting for your signature…</p></>}
          {(state.status === 'declined' || state.status === 'error') && <>
            <p className="status-title">{state.message}</p><p>{state.nextAction}</p>
          </>}
          {state.status === 'success' && <><p className="status-title">You’re signed in.</p><p className="address">{state.address}</p></>}
        </div>
      </div>
      <footer className="sign-in-footer">
        {!success && (openInPayUrl ? <a className="primary-button" href={openInPayUrl}>Open in Nimiq Pay <span aria-hidden="true">↗</span></a>
          : <button className="primary-button" onClick={onSignIn} disabled={disabled || waiting}>
            {waiting ? 'Waiting for approval…' : state.status === 'idle' ? 'Sign in with Nimiq Pay' : 'Try sign-in again'}
          </button>)}
        <p className="fine-print">Signing in doesn’t move any NIM.</p>
      </footer>
    </main>
  );
}
