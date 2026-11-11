import { notFound, redirect } from 'next/navigation';
import { PayShareContainer } from '../../../../src/containers/pay-share';
import { networkConfig } from '../../../../src/config/network';
import { currentLang } from '../../../../src/i18n/server';
import { serverEnv } from '../../../../src/server/lib/env';
import { leavePlanView } from '../../../../src/server/lib/plan-view';
import { currentAddress, signInFirstUrl } from '../../../../src/server/lib/session-page';

export const dynamic = 'force-dynamic';

/**
 * Screen 8 (PRD §7.6). Mode A only: a Together-goals squad has no recipient, so there is
 * nothing to pay and the member is sent back to the squad rather than shown an empty sheet.
 */
export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const address = await currentAddress();
  // Not a bare '/': the entry screen says why they are there and returns them here.
  if (address === null) redirect(signInFirstUrl(`/squads/${id}/pay`));
  const result = await leavePlanView(id, address);
  if (!result.ok) {
    // A stranger is shown the public view — and told that is what happened, rather than
    // being swapped onto another page in silence.
    if (result.code === 'NOT_A_MEMBER') redirect(`/proof/${id}?notice=not-a-member`);
    notFound();
  }
  if (result.view.squad.mode !== 'A' || result.view.squad.recipient === null) {
    redirect(`/squads/${id}`);
  }
  return <PayShareContainer initial={result.view} now={Date.now()}
    explorerBase={networkConfig(serverEnv().NIMIQ_NETWORK).explorerBase}
    initialLang={await currentLang()} />;
}
