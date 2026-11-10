import type { MetadataRoute } from 'next';

/**
 * The icons `pnpm brand:export` writes are referenced here rather than left in the folder
 * unused: 192 and 512 are the sizes a home-screen install reads. Both purposes are honest for
 * this drawing — the app icon carries 18% clear space on every side (`ICON_INSET` in
 * packages/ui/brand/shapes.ts), so a launcher may crop it to any shape without cutting the ring.
 *
 * Each size is listed twice, once per purpose. The manifest spec allows a space-separated list
 * ("any maskable"), but Next's `MetadataRoute.Manifest` types `purpose` as a single member of
 * the enum, so that string fails `next build` (Vercel, 2026-11-09). Two entries sharing one
 * `src` say the same thing to a launcher and typecheck.
 */
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Squad Stake',
    short_name: 'Squad Stake',
    description: 'Save together. Keep it yours.',
    start_url: '/',
    display: 'standalone',
    // The shipped skin is white-and-black (packages/ui/tokens.css: --page #ffffff, --ink
    // #0b0b0c in the default theme). These two were still Nimiq's navy and gold from before
    // that change, so an installed icon's splash screen and the status-bar tint did not match
    // the app that opened behind them (docs/AUDIT.md, m-2).
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
