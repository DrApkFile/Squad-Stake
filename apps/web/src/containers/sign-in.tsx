'use client';

import { useEffect, useRef, useState } from 'react';
import { SignInScreen, type SignInState } from '@squad-stake/ui';
import { errors } from '../core/errors/catalog';
import { signIn } from '../wallet/sign-in';

export function SignInContainer({ devIdentity, initialAddress, openInPayUrl }: {
  devIdentity: string | null; initialAddress: string | null; openInPayUrl: string;
}) {
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
      if (result.ok) setState({ status: 'success', address: result.address });
      else {
        const error = errors[result.code];
        setOutsideHost(result.code === 'OUTSIDE_HOST');
        setState({ status: result.code === 'DECLINED' ? 'declined' : 'error', message: error.message, nextAction: error.nextAction });
      }
    } finally { pending.current = false; }
  }
  return <SignInScreen state={state} onSignIn={handleSignIn}
    {...(outsideHost ? { openInPayUrl } : {})}
    {...(devIdentity ? { demoLabel: `DEV IDENTITY: ${devIdentity} — never fund this wallet` } : {})} />;
}
