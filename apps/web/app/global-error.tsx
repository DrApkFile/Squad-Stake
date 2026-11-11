'use client';

import '@squad-stake/ui/styles.css';
import { DEFAULT_LANG, NoticeScreen, strings } from '@squad-stake/ui';

/**
 * The last boundary: a fault in the root layout itself, where `app/error.tsx` is not rendered
 * and Next falls back to a bare "Application error" page in its own markup. This one replaces
 * the layout, so it brings its own `<html>`, `<body>` and stylesheet.
 *
 * No `useLang` here: the hook reads the SDK, and the thing that just failed may be the reason
 * it cannot. English, which is this app's documented fallback.
 */
export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string }; reset: () => void;
}) {
  const s = strings(DEFAULT_LANG).notice;
  return (
    <html lang={DEFAULT_LANG}>
      <body>
        <NoticeScreen
          title={s.errorTitle}
          body={s.errorBody}
          {...(error.digest ? { reference: s.errorReference(error.digest) } : {})}
          action={{ label: s.home, href: '/' }}
          onRetry={reset}
          lang={DEFAULT_LANG} />
      </body>
    </html>
  );
}
