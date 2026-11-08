'use client';

import { MySquadsScreen, type FiatRate, type Lang, type SquadCardView } from '@squad-stake/ui';
import { useFiat } from '../hooks/use-fiat';
import { useLang } from '../i18n/client';
import { useSceneTime } from '../hooks/use-scene-time';

export type MySquadsCard = SquadCardView;

export function MySquadsContainer({ squads, now, initialLang, fiat = null, demoLabel }: {
  squads: readonly MySquadsCard[];
  now: number;
  initialLang: Lang;
  /** PRD §9.11: null when the price source failed, and then no estimate is shown. */
  fiat?: FiatRate | null | undefined;
  demoLabel?: string | undefined;
}) {
  const t = useSceneTime();
  const lang = useLang(initialLang);
  // PRD §9.11: read after mount, because only Nimiq Pay knows the member's currency.
  const hostRate = useFiat();
  return (
    <MySquadsScreen
      squads={squads}
      now={now}
      createUrl="/squads/new"
      t={t}
      lang={lang}
      fiat={fiat ?? hostRate}
      demoLabel={demoLabel}
    />
  );
}
