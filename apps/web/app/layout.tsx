import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@squad-stake/ui/styles.css';
import { currentLang } from '../src/i18n/server';

export const metadata: Metadata = { title: 'Squad Stake', description: 'Save together. Keep it yours.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
/** `lang` is the server's best guess from Accept-Language (PRD §10, five languages); the
 * screens then follow Nimiq Pay's own choice after mount, which is what the member set. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  return <html lang={await currentLang()}><body>{children}</body></html>;
}
