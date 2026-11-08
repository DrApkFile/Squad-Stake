import { notFound, redirect } from 'next/navigation';
import { SquadContainer } from '../../../src/containers/squad';
import { identiconsFor } from '../../../src/server/lib/identicon';
import { serverEnv } from '../../../src/server/lib/env';
import { currentAddress } from '../../../src/server/lib/session-page';
import { squadDetailView } from '../../../src/server/lib/squad-view';

export const dynamic = 'force-dynamic';

/** Screen 5. Members only; a stranger is sent to the public proof view, which shows the same
 * statuses without the squad's invite link. */
export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const address = await currentAddress();
  if (address === null) redirect('/');
  const result = await squadDetailView(id, address);
  if (!result.ok) {
    if (result.code === 'NOT_A_MEMBER') redirect(`/proof/${id}`);
    notFound();
  }
  const identicons = await identiconsFor(result.view.members.map((member) => member.address));
  return <SquadContainer initial={result.view} identicons={identicons}
    inviteBase={serverEnv().APP_ORIGIN} now={Date.now()} />;
}
