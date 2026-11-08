import 'server-only';
import { headers } from 'next/headers';
import { pickLang, type Lang } from '@squad-stake/ui/i18n';
import { acceptLanguages } from './accept-language';

/**
 * The language a server-rendered page starts in: what the browser asked for, else English
 * (packages/ui/i18n/types.ts). Nimiq Pay's own setting is only readable in the browser
 * (`getHostLanguage()`), so the client corrects this after mount if the two differ
 * (src/i18n/client.ts) — the first paint is never blocked on it.
 */
export async function currentLang(): Promise<Lang> {
  try {
    return pickLang(acceptLanguages((await headers()).get('accept-language')));
  } catch {
    // A page that cannot read its headers still renders, in English.
    return pickLang([]);
  }
}
