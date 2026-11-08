import { notFound, redirect } from 'next/navigation';
import { PayShareContainer } from '../../../../src/containers/pay-share';
import { serverEnv } from '../../../../src/server/lib/env';
import { leavePlanView } from '../../../../src/server/lib/plan-view';
import { currentAddress } from '../../../../src/server/lib/session-page';

export const dynamic = 'force-dynamic';

const EXPLORERS = {
  mainnet: 'https://nimiq.watch/#',
  testnet: 'https://test.nimiq.watch/#',
} as const;

/**
 * Screen 8 (PRD §7.6). Mode A only: a Together-goals squad has no recipient, so there is
 * nothing to pay and the member is sent back to the squad rather than shown an empty sheet.
 */
export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const address = await currentAddress();
  if (address === null) redirect('/');
  const result = await leavePlanView(id, address);
  if (!result.ok) {
    if (result.code === 'NOT_A_MEMBER') redirect(`/proof/${id}`);
    notFound();
  }
  if (result.view.squad.mode !== 'A' || result.view.squad.recipient === null) {
    redirect(`/squads/${id}`);
  }
  return <PayShareContainer initial={result.view} now={Date.now()}
    explorerBase={EXPLORERS[serverEnv().NIMIQ_NETWORK]} />;
}
