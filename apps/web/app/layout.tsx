import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@squad-stake/ui/styles.css';
import { currentLang } from '../src/i18n/server';

export const metadata: Metadata = {
  title: 'Squad Stake',
  description: 'Save together. Keep it yours.',
  // Every file here is written by `pnpm brand:export` from packages/ui/brand, so the tab, the
  // home screen and the app's own header are one drawing (docs/DECISIONS.md).
  icons: {
    icon: [
      { url: '/brand/favicon.ico', sizes: '16x16 32x32' },
      { url: '/brand/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/brand/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/brand/icon-180.png', sizes: '180x180' }],
  },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
/** `lang` is the server's best guess from Accept-Language (PRD §10, five languages); the
 * screens then follow Nimiq Pay's own choice after mount, which is what the member set. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  return <html lang={await currentLang()}><body>{children}</body></html>;
}
