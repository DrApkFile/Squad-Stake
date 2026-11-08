import { demoExample, demoOrbitMembers } from './demo/squad';
import type { OrbitSceneProps } from '../OrbitSquad';

/** The orbit on its own, at the sizes a squad actually reaches: 3, 6 and 12 members, mixed
 * statuses, a squad with no chain read yet, and the still preview used on list cards. */
export const orbitScenes: readonly { id: string; props: OrbitSceneProps }[] = [
  {
    id: 'orbit-three',
    props: {
      heading: 'Three members',
      goal: 'Lisbon in April',
      members: demoOrbitMembers(3),
      backedLuna: 430_000_000,
      targetLuna: 1_200_000_000,
      t: 4,
    },
  },
  {
    id: 'orbit-six',
    props: {
      heading: 'Six members, mixed statuses',
      goal: 'Winter buffers',
      members: demoOrbitMembers(6),
      backedLuna: 740_000_000,
      targetLuna: 1_200_000_000,
      t: 9,
    },
  },
  {
    id: 'orbit-twelve',
    props: {
      heading: 'Twelve members',
      goal: 'Studio deposit',
      members: demoOrbitMembers(12),
      backedLuna: 2_480_000_000,
      targetLuna: 3_000_000_000,
      t: 17,
    },
  },
  {
    id: 'orbit-counting-up',
    props: {
      heading: 'Counting up (t = 0.6 s)',
      goal: 'Lisbon in April',
      members: demoOrbitMembers(4),
      backedLuna: 740_000_000,
      targetLuna: 1_200_000_000,
      t: 0.6,
    },
  },
  {
    id: 'orbit-no-read',
    props: {
      heading: 'No chain read yet',
      goal: 'Lisbon in April',
      members: demoOrbitMembers(4),
      backedLuna: null,
      targetLuna: 1_200_000_000,
      t: 4,
    },
  },
  {
    id: 'orbit-together-mode',
    props: {
      heading: 'Together goals (no shared target)',
      goal: 'Winter buffers',
      members: demoOrbitMembers(3),
      backedLuna: 540_000_000,
      targetLuna: null,
      t: 4,
    },
  },
  {
    id: 'orbit-still-preview',
    props: {
      heading: 'Still preview (list card)',
      goal: 'Example squad',
      members: demoExample.members,
      backedLuna: demoExample.backedLuna,
      targetLuna: demoExample.targetLuna,
      still: true,
    },
  },
];
