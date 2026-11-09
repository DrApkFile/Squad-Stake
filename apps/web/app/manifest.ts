import type { MetadataRoute } from 'next';

/**
 * The icons `pnpm brand:export` writes are referenced here rather than left in the folder
 * unused: 192 and 512 are the sizes a home-screen install reads. `purpose: 'any maskable'` is
 * honest for this drawing — the app icon carries 18% clear space on every side
 * (`ICON_INSET` in packages/ui/brand/shapes.ts), so a launcher may crop it to any shape
 * without cutting the ring.
 */
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Squad Stake',
    short_name: 'Squad Stake',
    description: 'Save together. Keep it yours.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d102c',
    theme_color: '#e9b213',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png',
        purpose: 'any maskable' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png',
        purpose: 'any maskable' },
    ],
  };
}
