'use client';

import { DEFAULT_LANG, NoticeScreen, strings } from '@squad-stake/ui';
import { useLang } from '../src/i18n/client';

/**
 * The route-level error boundary. Without it, a thrown server error (the database refusing a
 * connection, an unhandled fault in a view) renders Next's own
 * "Application error: a server-side exception has occurred", which names nothing, explains
 * nothing and offers no way on.
 *
 * `reset()` re-renders the segment, which is a *read* being taken again: it cannot send a
 * wallet call, so offering it here does not cross AGENTS.md invariant 8. The digest is Next's
 * own id for the server-side stack, and is the only way a member can name what they hit.
 */
export default function RouteError({ error, reset }: {
  error: Error & { digest?: string }; reset: () => void;
}) {
  // An error boundary takes no props of its own, so the server's Accept-Language guess cannot
  // reach it: the first paint is English and the effect corrects it to the host's language.
  const lang = useLang(DEFAULT_LANG);
  const s = strings(lang).notice;
  return <NoticeScreen
    title={s.errorTitle}
    body={s.errorBody}
    {...(error.digest ? { reference: s.errorReference(error.digest) } : {})}
    action={{ label: s.home, href: '/' }}
    onRetry={reset}
    lang={lang} />;
}
