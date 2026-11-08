import { formatLuna } from './format';
import { DEFAULT_LANG, strings, type Lang } from './i18n';

/**
 * PRD §9.12 — "earned since joining", as it reaches a component: either a measured amount
 * with the basis it was measured from, or the reason for "—". There is no third case: an
 * estimate is never shown (AGENTS.md "Never fabricate").
 *
 * The reason crosses the wire as a code, not as a sentence, so the words follow the member's
 * language and the video renders the same component in any of the five (AGENTS.md "UI purity").
 */
export type EarnedReason = 'NOT_STAKING' | 'NO_POOL_DATA' | 'PAYOUT_ADDRESS_UNKNOWN'
  | 'PAYS_NOTHING' | 'OUTSIDE_STAKE' | 'UNTRACKED_DEPOSIT' | 'LEAVING' | 'CHAIN_UNAVAILABLE';

export type EarnedBasis =
  | { kind: 'restake'; depositsLuna: number }
  | { kind: 'direct'; payouts: number };

export type EarnedView =
  | { known: true; luna: number; basis: EarnedBasis }
  | { known: false; reason: EarnedReason };

/** One place that maps a code to its catalog key, so a new reason cannot be shown untranslated:
 * a missing key fails `pnpm typecheck` in all five languages. */
const REASON_KEYS = {
  NOT_STAKING: 'reasonNotStaking',
  NO_POOL_DATA: 'reasonNoPoolData',
  PAYOUT_ADDRESS_UNKNOWN: 'reasonPayoutAddressUnknown',
  PAYS_NOTHING: 'reasonPaysNothing',
  OUTSIDE_STAKE: 'reasonOutsideStake',
  UNTRACKED_DEPOSIT: 'reasonUntrackedDeposit',
  LEAVING: 'reasonLeaving',
  CHAIN_UNAVAILABLE: 'reasonChainUnavailable',
} as const satisfies Record<EarnedReason, keyof ReturnType<typeof strings>['earned']>;

export function earnedReasonText(reason: EarnedReason, lang: Lang = DEFAULT_LANG): string {
  return strings(lang).earned[REASON_KEYS[reason]] as string;
}

/** What the amount was measured from, in the member's own language. */
export function earnedBasisText(basis: EarnedBasis, lang: Lang = DEFAULT_LANG): string {
  const s = strings(lang).earned;
  return basis.kind === 'restake'
    ? s.restakeBasis(formatLuna(basis.depositsLuna, lang))
    : s.directBasis(basis.payouts);
}

/** The headline figure, or the dash. */
export function earnedAmountText(earned: EarnedView, lang: Lang = DEFAULT_LANG): string {
  const s = strings(lang).earned;
  return earned.known ? s.amount(formatLuna(earned.luna, lang)) : s.unknown;
}

export function earnedWhyText(earned: EarnedView, lang: Lang = DEFAULT_LANG): string {
  return earned.known ? earnedBasisText(earned.basis, lang) : earnedReasonText(earned.reason, lang);
}
