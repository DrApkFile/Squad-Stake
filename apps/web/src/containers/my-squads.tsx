'use client';

import { MySquadsScreen, type SquadCardView } from '@squad-stake/ui';
import { useSceneTime } from '../hooks/use-scene-time';

export type MySquadsCard = SquadCardView;

export function MySquadsContainer({ squads, now, demoLabel }: {
  squads: readonly MySquadsCard[];
  now: number;
  demoLabel?: string | undefined;
}) {
  const t = useSceneTime();
  return (
    <MySquadsScreen
      squads={squads}
      now={now}
      createUrl="/squads/new"
      t={t}
      demoLabel={demoLabel}
    />
  );
}
