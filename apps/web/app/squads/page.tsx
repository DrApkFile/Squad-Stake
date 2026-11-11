import { redirect } from 'next/navigation';
import { MySquadsContainer } from '../../src/containers/my-squads';
import { currentLang } from '../../src/i18n/server';
import { identiconsFor } from '../../src/server/lib/identicon';
import { currentAddress, signInFirstUrl } from '../../src/server/lib/session-page';
import { mySquadsView } from '../../src/server/lib/squad-view';
import { statusTone } from '@squad-stake/ui';

export const dynamic = 'force-dynamic';

/** Screen 3. The first screen after signing in, and where "Create squad" lives. */
export default async function MySquadsPage() {
  const address = await currentAddress();
  // Signed out: say so on the entry screen and come straight back here (not a bare '/').
  if (address === null) redirect(signInFirstUrl('/squads'));
  const squads = await mySquadsView(address);
  const identicons = await identiconsFor(squads.flatMap((squad) => squad.members));
  const cards = squads.map((squad) => ({
    id: squad.id,
    name: squad.name,
    mode: squad.mode,
    href: `/squads/${squad.id}`,
    goalAt: squad.goalAt,
    targetLuna: squad.targetLuna,
    committedLuna: squad.committedLuna,
    squadCommittedLuna: squad.squadCommittedLuna,
    memberCount: squad.memberCount,
    // A card makes no claim about the chain, so every seat is neutral until the squad page
    // reads it (AGENTS.md "Never fabricate").
    members: squad.members.map((member) => ({
      id: member,
      identiconSvg: identicons[member] ?? null,
      tone: statusTone('NOT_STAKING'),
      label: member,
    })),
  }));
  return <MySquadsContainer squads={cards} now={Date.now()}
    initialLang={await currentLang()} />;
}
