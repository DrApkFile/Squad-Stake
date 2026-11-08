'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInScreen, type SignInState } from '@squad-stake/ui';
import { DEMO_LABEL, demoExample, demoGoals } from '@squad-stake/ui/scenes';
import { errors } from '../core/errors/catalog';
import { useSceneTime } from '../hooks/use-scene-time';
import { signIn } from '../wallet/sign-in';

export function SignInContainer({ devIdentity, initialAddress, openInPayUrl, onwardUrl = '/squads', invitedTo }: {
  devIdentity: string | null;
  initialAddress: string | null;
  openInPayUrl: string;
  /** Where a completed sign-in lands. An invite sends the visitor back to the invite.  */
  onwardUrl?: string;
  invitedTo?: string;
}) {
  const router = useRouter();
  const t = useSceneTime();
  const [state, setState] = useState<SignInState>(initialAddress
    ? { status: 'success', address: initialAddress } : { status: 'idle' });
  const [outsideHost, setOutsideHost] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (!devIdentity && !initialAddress && typeof window.nimiqPay === 'undefined') {
      setOutsideHost(true);
      const error = errors.OUTSIDE_HOST;
      setState({ status: 'error', message: error.message, nextAction: error.nextAction });
    }
  }, [devIdentity, initialAddress]);
  async function handleSignIn() {
    if (pending.current) return;
    pending.current = true;
    setState({ status: 'waiting' });
    try {
      const result = await signIn(devIdentity);
      if (result.ok) {
        setState({ status: 'success', address: result.address });
        // The screen is not a destination: a session belongs on the squads it unlocks. The
        // success state still renders (and links onward) in case navigation is blocked.
        router.replace(onwardUrl);
      } else {
        const error = errors[result.code];
        setOutsideHost(result.code === 'OUTSIDE_HOST');
        setState({ status: result.code === 'DECLINED' ? 'declined' : 'error', message: error.message, nextAction: error.nextAction });
      }
    } finally { pending.current = false; }
  }
  // The orbit and the ticker on this screen are hand-written samples, labelled as such.
  const label = invitedTo === undefined ? DEMO_LABEL : `Invited to ${invitedTo} — sign in to join`;
  return <SignInScreen state={state} onSignIn={handleSignIn} t={t}
    example={demoExample} goals={demoGoals} onwardUrl={onwardUrl}
    {...(outsideHost ? { openInPayUrl } : {})}
    demoLabel={devIdentity ? `DEV IDENTITY: ${devIdentity} — never fund this wallet` : label} />;
}
