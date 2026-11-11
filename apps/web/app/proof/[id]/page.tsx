import { notFound } from 'next/navigation';
import { ProofScreen, shortAddress, strings } from '@squad-stake/ui';
import { networkConfig } from '../../../src/config/network';
import { identiconsFor } from '../../../src/server/lib/identicon';
import { serverEnv } from '../../../src/server/lib/env';
import { currentLang } from '../../../src/i18n/server';
import { squadPathFrom } from '../../../src/server/lib/session-page';
import { proofView } from '../../../src/server/lib/squad-view';

export const dynamic = 'force-dynamic';

/**
 * Screen 10, public: no session, no wallet, no JavaScript needed. Everything on it is a chain
 * read with its own timestamp, and the page prints the call to repeat (PROOF_PLAN).
 */
export default async function ProofPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const result = await proofView(id);
  if (!result.ok) notFound();
  const { view } = result;
  const identicons = await identiconsFor(view.members.map((member) => member.address));
  const env = serverEnv();
  const s = strings(await currentLang()).notice;
  /*
   * Two things this page is told by the link that opened it, both of which keep a navigation
   * from being silent:
   *  - `from`: a member tapped "View proof page" on their own squad, so the back chevron
   *    returns there instead of sending them out to the start. The id is this app's own
   *    route, rebuilt here rather than echoed, so the href cannot be steered elsewhere.
   *  - `notice=not-a-member`: a members-only page redirected them here, and this says so.
   */
  const from = squadPathFrom(search.from);
  const notAMember = search.notice === 'not-a-member';
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
      stages={view.stages}
      committedLuna={view.committedLuna}
      now={Date.now()}
      readAt={view.readAt}
      network={env.NIMIQ_NETWORK}
      verify={{ endpoint: networkConfig(env.NIMIQ_NETWORK).rpcUrl, method: 'getStakerByAddress' }}
      apiUrl={`${env.APP_ORIGIN}/api/proof/${view.squad.shortId}`}
      payments={view.payments}
      {...(from === null ? {} : { back: { label: s.mySquads, href: from } })}
      {...(notAMember
        ? { notice: { title: s.notAMemberTitle, body: s.notAMemberBody } }
        : {})}
    />
  );
}
