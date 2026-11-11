import { notFound, redirect } from 'next/navigation';
import { SquadContainer } from '../../../src/containers/squad';
import { identiconsFor } from '../../../src/server/lib/identicon';
import { currentLang } from '../../../src/i18n/server';
import { serverEnv } from '../../../src/server/lib/env';
import { currentAddress, signInFirstUrl } from '../../../src/server/lib/session-page';
import { squadDetailView } from '../../../src/server/lib/squad-view';

export const dynamic = 'force-dynamic';

/** Screen 5. Members only; a stranger is sent to the public proof view, which shows the same
 * statuses without the squad's invite link. */
export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const address = await currentAddress();
  // Not a bare '/': the entry screen says why they are there and returns them here.
  if (address === null) redirect(signInFirstUrl(`/squads/${id}`));
  const result = await squadDetailView(id, address);
  if (!result.ok) {
    // A stranger is shown the public view — and told that is what happened, rather than
    // being swapped onto another page in silence.
    if (result.code === 'NOT_A_MEMBER') redirect(`/proof/${id}?notice=not-a-member`);
    notFound();
  }
  const identicons = await identiconsFor(result.view.members.map((member) => member.address));
  return <SquadContainer initial={result.view} identicons={identicons}
    inviteBase={serverEnv().APP_ORIGIN} now={Date.now()}
    initialLang={await currentLang()} />;
}
