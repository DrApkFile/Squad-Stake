import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@squad-stake/ui/styles.css';

export const metadata: Metadata = { title: 'Squad Stake', description: 'Save together. Keep it yours.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
