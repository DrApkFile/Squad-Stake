import { NoticeScreen, strings } from '@squad-stake/ui';
import { currentLang } from '../src/i18n/server';

export const dynamic = 'force-dynamic';

/**
 * Every `notFound()` in this app used to end at Next's own 404: an unstyled page in English
 * that says "This page could not be found" and offers nothing. A member who mistypes a proof
 * link, or opens a squad that was removed, deserves to be told what happened and — because
 * this app holds stake — that nothing moved (AGENTS.md "Never fabricate").
 */
export default async function NotFound() {
  const lang = await currentLang();
  const s = strings(lang).notice;
  return <NoticeScreen title={s.notFoundTitle} body={s.notFoundBody}
    action={{ label: s.home, href: '/' }} lang={lang} />;
}
