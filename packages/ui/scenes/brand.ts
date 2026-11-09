import type { BrandSheetProps } from '../brand/BrandSheet';

/**
 * The brand, proved at the sizes it is actually used at: the favicon (16), the header (18–28),
 * the app icon and the 256 px hero. Every frame is the same component the app renders.
 */
export const brandScenes: readonly { id: string; props: BrandSheetProps }[] = [
  {
    id: 'brand-logo',
    props: {
      kind: 'logo',
      title: 'Logo · lockup',
      note: 'The mark beside “Squad Stake” in Mulish 700, converted to outlines, so the logo '
        + 'needs no font where no stylesheet exists — an exported SVG, a PNG, the app icon.',
    },
  },
  {
    id: 'brand-mark',
    props: {
      kind: 'mark',
      title: 'Logo · mark',
      note: 'A warm goal in the middle, three members on a ring that breaks at each of them. '
        + 'At 16 px the member discs are still wider than the links, so it reads as people.',
    },
  },
  {
    id: 'brand-icon',
    props: {
      kind: 'icon',
      title: 'App icon',
      note: 'The white mark on Nimiq’s own warm radial, with 18% clear space on every side so '
        + 'a launcher that rounds the corners never cuts the ring.',
    },
  },
];
