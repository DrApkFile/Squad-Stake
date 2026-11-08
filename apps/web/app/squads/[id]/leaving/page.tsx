import { notFound, redirect } from 'next/navigation';
import { LeavingContainer } from '../../../../src/containers/leaving';
import { networkConfig } from '../../../../src/config/network';
import { currentLang } from '../../../../src/i18n/server';
import { serverEnv } from '../../../../src/server/lib/env';
import { leavePlanView } from '../../../../src/server/lib/plan-view';
import { currentAddress } from '../../../../src/server/lib/session-page';

export const dynamic = 'force-dynamic';

/** Screen 7 (PRD §7.5). Members only: the plan carries the viewer's own balances. */
export default async function LeavingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const address = await currentAddress();
  if (address === null) redirect('/');
  const result = await leavePlanView(id, address);
  if (!result.ok) {
    if (result.code === 'NOT_A_MEMBER') redirect(`/proof/${id}`);
    notFound();
  }
  return <LeavingContainer initial={result.view} now={Date.now()}
    explorerBase={networkConfig(serverEnv().NIMIQ_NETWORK).explorerBase}
    initialLang={await currentLang()} />;
}
