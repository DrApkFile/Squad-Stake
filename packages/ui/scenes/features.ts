import { LANGS, strings, type Lang } from '../i18n';
import {
  demoCommittedTotal, demoBackedTotal, demoEarnedMeasured, demoEarnedUnknown, demoFiat,
  demoGoalAt, demoInviteUrl, demoLeaveBy, demoNow, demoPoolDirect, demoPoolFallback,
  demoPoolRestake, demoProofUrl, demoReadAt, demoRoster, demoSharedSquad, demoSquadPage,
  demoTemplateDates, demoTzOffsetMinutes,
} from './demo/squad';
import type { CreateSquadScreenProps } from '../CreateSquadScreen';
import type { JoinCommitSheetProps } from '../JoinCommitSheet';
import type { MySquadsScreenProps } from '../MySquadsScreen';
import type { SquadScreenProps } from '../SquadScreen';

/**
 * Fixture scenes for the four features added on top of P0: the pool shown before a first
 * stake (§7.7), what a stake has earned (§9.12), the fiat estimate (§9.11) and the
 * create-screen templates (§10) — plus the same screens in every language.
 *
 * The language scenes exist for one reason: German, French, Spanish and Portuguese run longer
 * than English, and the narrowest phone this app supports is 375 px. `pnpm check:scenes`
 * measures every scene at 390 **and** 375 in both themes, so a translation that would push a
 * control off the frame fails there instead of on someone's phone.
 */
/** The way out, in the scene's own language: a container passes the same catalogue string.
 * A function declaration, because the scene lists below call it while this module loads. */
function backTo(lang: Lang) {
  return { label: strings(lang).common.backSquads, href: '/squads' };
}

const commitBase = {
  squad: demoSharedSquad, now: demoNow, readAt: demoReadAt, amountNim: '2000',
  back: { label: 'Squads', href: '/squads' },
} satisfies Partial<JoinCommitSheetProps>;

/** The sheet that asks for the approval creating a staker, which is the only screen a pool
 * ever appears on (PRD §7.7: the name and fee are shown *before* the approval). */
const needsStaker = { status: 'needs-stake', shortfallLuna: 200_000_000,
  action: 'create', feeLuna: 300 } as const;

export const featureCommitScenes: readonly { id: string; props: JoinCommitSheetProps }[] = [
  { id: 'pool-restake', props: { ...commitBase, state: needsStaker, pool: demoPoolRestake } },
  { id: 'pool-direct', props: { ...commitBase, state: needsStaker, pool: demoPoolDirect } },
  { id: 'pool-fallback', props: { ...commitBase, state: needsStaker, pool: demoPoolFallback } },
  // A pool is never shown beside a commitment that stakes nothing new.
  { id: 'pool-not-shown-when-ready',
    props: { ...commitBase, state: { status: 'ready', freeLuna: 350_000_000 }, pool: demoPoolRestake } },
  ...languageScenes<JoinCommitSheetProps>('commit', (lang) => ({
    ...commitBase, state: needsStaker, pool: demoPoolRestake, lang, back: backTo(lang) })),
];

const squadBase = {
  squad: demoSquadPage,
  members: demoRoster,
  backedLuna: demoBackedTotal,
  committedLuna: demoCommittedTotal,
  leaveBy: demoLeaveBy,
  now: demoNow,
  readAt: demoReadAt,
  inviteUrl: demoInviteUrl,
  proofUrl: demoProofUrl,
  commitUrl: '/s/4f1c8a7b2d9e0315a6c4b8d7e2f10934',
  leavingUrl: '/squads/sample-squad-1/leaving',
  tzOffsetMinutes: demoTzOffsetMinutes,
  t: 4,
  back: { label: 'Squads', href: '/squads' },
} satisfies Omit<SquadScreenProps, 'lang' | 'fiat' | 'members'> & Partial<SquadScreenProps>;

export const featureSquadScenes: readonly { id: string; props: SquadScreenProps }[] = [
  { id: 'earned-measured', props: { ...squadBase, members: demoEarnedMeasured } },
  { id: 'earned-unknown', props: { ...squadBase, members: demoEarnedUnknown } },
  { id: 'fiat-estimate', props: { ...squadBase, fiat: demoFiat } },
  { id: 'fiat-and-earned', props: { ...squadBase, members: demoEarnedMeasured, fiat: demoFiat } },
  ...languageScenes<SquadScreenProps>('squad', (lang) => ({
    ...squadBase, members: demoEarnedMeasured, fiat: demoFiat, lang, back: backTo(lang) })),
];

export const featureMySquadsScenes: readonly { id: string; props: MySquadsScreenProps }[] = [
  { id: 'fiat-my-squads', props: { squads: cards(), now: demoNow, createUrl: '/squads/new',
    t: 4, fiat: demoFiat } },
];

const emptyValues = {
  name: '', mode: 'A' as const, targetNim: '', recipient: '', personalTargetNim: '', goalDate: '',
};
export const featureCreateScenes: readonly { id: string; props: CreateSquadScreenProps }[] = [
  { id: 'templates-offered', props: { values: emptyValues, minGoalDate: '2026-11-11',
    templateDates: demoTemplateDates } },
  { id: 'templates-picked', props: { minGoalDate: '2026-11-11', templateDates: demoTemplateDates,
    values: { ...emptyValues, name: 'Lisbon in April', goalDate: demoTemplateDates.trip } } },
  ...languageScenes<CreateSquadScreenProps>('create', (lang) => ({
    values: emptyValues, minGoalDate: '2026-11-11', templateDates: demoTemplateDates, lang,
    back: backTo(lang) })),
];

/** One scene per language other than English, named `lang-<code>-<screen>`. English already
 * has a scene for each of these screens elsewhere in the gallery. */
function languageScenes<P>(screen: string, props: (lang: Lang) => P) {
  return LANGS.filter((lang) => lang !== 'en')
    .map((lang) => ({ id: `lang-${lang}-${screen}`, props: props(lang) }));
}

/** Two sample cards, enough to show an estimate under a target and under a total. */
function cards(): MySquadsScreenProps['squads'] {
  return [
    { id: 'sample-squad-1', name: demoSharedSquad.name, mode: 'A', href: '/squads/sample-squad-1',
      goalAt: demoGoalAt, targetLuna: demoSharedSquad.targetLuna, committedLuna: 200_000_000,
      squadCommittedLuna: demoCommittedTotal, memberCount: 4, members: [] },
    { id: 'sample-squad-2', name: 'Winter buffers', mode: 'B', href: '/squads/sample-squad-2',
      goalAt: demoGoalAt + 20 * 86_400_000, targetLuna: null, committedLuna: 150_000_000,
      squadCommittedLuna: 450_000_000, memberCount: 3, members: [] },
  ];
}
