import { notFound } from 'next/navigation';
import { ProofScreen, shortAddress } from '@squad-stake/ui';
import { networkConfig } from '../../../src/config/network';
import { identiconsFor } from '../../../src/server/lib/identicon';
import { serverEnv } from '../../../src/server/lib/env';
import { proofView } from '../../../src/server/lib/squad-view';

export const dynamic = 'force-dynamic';

/**
 * Screen 10, public: no session, no wallet, no JavaScript needed. Everything on it is a chain
 * read with its own timestamp, and the page prints the call to repeat (PROOF_PLAN).
 */
export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await proofView(id);
  if (!result.ok) notFound();
  const { view } = result;
  const identicons = await identiconsFor(view.members.map((member) => member.address));
  const env = serverEnv();
  return (
    <ProofScreen
      squad={{
        name: view.squad.name, shortId: view.squad.shortId, mode: view.squad.mode,
        targetLuna: view.squad.targetLuna, goalAt: view.squad.goalAt,
      }}
      members={view.members.map((member) => ({
        id: member.address,
        shortAddress: shortAddress(member.address),
        fullAddress: member.address,
        identiconSvg: identicons[member.address] ?? null,
        committedLuna: member.committedLuna,
        status: member.status,
        readAt: member.readAt,
        isYou: false,
        pending: member.pending,
        // §9.12 is never shown here: earned growth plus the deposits behind it is a balance,
        // and this page is public (src/server/core/member-earned.ts).
        earned: null,
      }))}
      backedLuna={view.backedLuna}
      committedLuna={view.committedLuna}
      now={Date.now()}
      readAt={view.readAt}
      network={env.NIMIQ_NETWORK}
      verify={{ endpoint: networkConfig(env.NIMIQ_NETWORK).rpcUrl, method: 'getStakerByAddress' }}
      apiUrl={`${env.APP_ORIGIN}/api/proof/${view.squad.shortId}`}
      payments={view.payments}
    />
  );
}
