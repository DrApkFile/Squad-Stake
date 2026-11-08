import { permanentRedirect } from 'next/navigation';

/** `/join/<token>` is an alias. `/s/<token>` stays the canonical invite path because links
 * already handed out point there, and a short path is kinder to paste into a chat. */
export default async function JoinAliasPage({ params }: { params: Promise<{ token: string }> }) {
  permanentRedirect(`/s/${(await params).token}`);
}
