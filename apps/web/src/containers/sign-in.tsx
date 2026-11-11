'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInScreen, strings, type Lang, type SignInState } from '@squad-stake/ui';
import { demoExample, demoGoals } from '@squad-stake/ui/scenes';
import { catalogError } from '../core/errors/catalog';
import { useLang } from '../i18n/client';
import { useSceneTime } from '../hooks/use-scene-time';
import { signIn } from '../wallet/sign-in';

export function SignInContainer({ devIdentity, initialAddress, openInPayUrl, onwardUrl = '/squads', invitedTo, notice, initialLang }: {
  devIdentity: string | null;
  initialAddress: string | null;
  openInPayUrl: string;
  /** Where a completed sign-in lands. An invite sends the visitor back to the invite.  */
  onwardUrl?: string;
  invitedTo?: string;
  /** Why the visitor was sent here, when a page redirected them (src/server/lib/session-page.ts). */
  notice?: { title: string; body: string };
  /** The server's guess from Accept-Language; Nimiq Pay's own setting wins after mount. */
  initialLang: Lang;
}) {
  const lang = useLang(initialLang);
  const router = useRouter();
  const t = useSceneTime();
  const [state, setState] = useState<SignInState>(initialAddress
    ? { status: 'success', address: initialAddress } : { status: 'idle' });
  const [outsideHost, setOutsideHost] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (!devIdentity && !initialAddress && typeof window.nimiqPay === 'undefined') {
      setOutsideHost(true);
      const error = catalogError('OUTSIDE_HOST', lang);
      setState({ status: 'error', message: error.message, nextAction: error.nextAction });
    }
  }, [devIdentity, initialAddress, lang]);
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
        const error = catalogError(result.code, lang);
        setOutsideHost(result.code === 'OUTSIDE_HOST');
        setState({ status: result.code === 'DECLINED' ? 'declined' : 'error', message: error.message, nextAction: error.nextAction });
      }
    } finally { pending.current = false; }
  }
  // The orbit and the ticker on this screen are hand-written samples. They are labelled where
  // they are drawn — the orbit's own caption reads "Example squad" and the ticker's reads
  // "Example goals" — so the banner that used to run a "SAMPLE DATA" strip across the top of
  // the first screen a visitor ever sees is gone. Nothing is claimed as real by dropping it:
  // AGENTS.md asks for demo data to be labelled, not for the label to be the headline.
  // The dev-identity warning and an invite's "Invited to …" are not that, and stay.
  const label = invitedTo === undefined
    ? undefined
    : strings(lang).signIn.invitedTo(invitedTo);
  const demoLabel = devIdentity
    ? `DEV IDENTITY: ${devIdentity} — never fund this wallet`
    : label;
  return <SignInScreen state={state} onSignIn={handleSignIn} t={t} lang={lang}
    example={demoExample} goals={demoGoals} onwardUrl={onwardUrl}
    {...(outsideHost ? { openInPayUrl } : {})}
    {...(notice === undefined ? {} : { notice })}
    {...(demoLabel === undefined ? {} : { demoLabel })} />;
}
