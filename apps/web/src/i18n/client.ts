'use client';

import { useEffect, useState } from 'react';
import { pickLang, type Lang } from '@squad-stake/ui/i18n';
import { hostLanguage } from '../wallet/host';

/**
 * The language the screens render in. The server's guess (from `Accept-Language`) is the
 * first paint, and after mount Nimiq Pay's own setting takes precedence when it names a
 * language we have — the host knows what the user chose, the header only knows the device
 * (AGENTS.md "Host").
 *
 * `navigator.languages` is read as well, because outside Nimiq Pay a proxy or a webview may
 * send a different header than the browser's actual preference list.
 */
export function useLang(initial: Lang): Lang {
  const [lang, setLang] = useState<Lang>(initial);
  useEffect(() => {
    const preferred = pickLang([
      hostLanguage(),
      ...(typeof navigator === 'undefined' ? [] : [...navigator.languages]),
    ]);
    setLang((previous) => (previous === preferred ? previous : preferred));
  }, []);
  return lang;
}
