import { notFound, redirect } from 'next/navigation';
import { LeavingContainer } from '../../../../src/containers/leaving';
import { networkConfig } from '../../../../src/config/network';
import { currentLang } from '../../../../src/i18n/server';
import { serverEnv } from '../../../../src/server/lib/env';
import { leavePlanView } from '../../../../src/server/lib/plan-view';
import { currentAddress, signInFirstUrl } from '../../../../src/server/lib/session-page';

export const dynamic = 'force-dynamic';

/** Screen 7 (PRD §7.5). Members only: the plan carries the viewer's own balances. */
export default async function LeavingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const address = await currentAddress();
  // Not a bare '/': the entry screen says why they are there and returns them here.
  if (address === null) redirect(signInFirstUrl(`/squads/${id}/leaving`));
  const result = await leavePlanView(id, address);
  if (!result.ok) {
    // A stranger is shown the public view — and told that is what happened, rather than
    // being swapped onto another page in silence.
    if (result.code === 'NOT_A_MEMBER') redirect(`/proof/${id}?notice=not-a-member`);
    notFound();
  }
  return <LeavingContainer initial={result.view} now={Date.now()}
    explorerBase={networkConfig(serverEnv().NIMIQ_NETWORK).explorerBase}
    initialLang={await currentLang()} />;
}
