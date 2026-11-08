import { DEFAULT_LANG, strings, type Lang } from './i18n';

/**
 * PRD §9.11: an approximate fiat value beside the NIM figures. Three rules it never breaks —
 * it is marked "≈" and labelled an estimate, it names its source and the age of the price, and
 * it is absent rather than stale-but-silent when the price source fails (the server passes
 * `null`, see apps/web/src/server/lib/price.ts).
 */
export interface FiatRate {
  /** ISO 4217, as Nimiq Pay reports the user's choice (`getHostFiat()`). */
  currency: string;
  /** Units of that currency per **one NIM**, which is what the price source publishes. */
  perNim: number;
  /** When the price was fetched, so the screen can say how old it is. */
  readAt: number;
  /** The source's id (`'coingecko'`), named on screen through the catalogue: never a figure
   * without a source, and never an internal id shown to a member. */
  source: string;
}

/** The one price source this app uses (apps/web/src/server/lib/price.ts). An id it does not
 * know is printed as it came, rather than silently attributed to CoinGecko. */
const SOURCE_NAMES: Record<string, keyof ReturnType<typeof strings>['fiat']> = {
  coingecko: 'sourceCoinGecko',
};

const LUNA_PER_NIM = 100_000;

/** The fiat value of an amount of luna. Display only: no decision in this app depends on it. */
export function fiatValue(luna: number, rate: FiatRate) {
  return (luna / LUNA_PER_NIM) * rate.perNim;
}

function amountText(value: number, lang: Lang) {
  const { group, decimal } = strings(lang).fmt;
  // Under a cent, two decimals would read "0,00", which looks like nothing rather than little.
  if (value > 0 && value < 0.01) return `< 0${decimal}01`;
  const [whole = '0', fraction = '00'] = value.toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, group)}${decimal}${fraction}`;
}

/** `≈ 3,22 EUR · estimate`. The NIM figure it sits beside is the real one. */
export function fiatLine(luna: number, rate: FiatRate, lang: Lang = DEFAULT_LANG) {
  return strings(lang).fiat.line(amountText(fiatValue(luna, rate), lang), rate.currency);
}

/** One note per screen: where the price came from and how old it is. */
export function fiatNote(rate: FiatRate, now: number, lang: Lang = DEFAULT_LANG) {
  const s = strings(lang).fiat;
  const minutes = Math.max(0, Math.floor((now - rate.readAt) / 60_000));
  const key = SOURCE_NAMES[rate.source];
  const source = key === undefined ? rate.source : (s[key] as string);
  return s.note(source, minutes === 0 ? s.priceAgeNow : s.priceAgeMinutes(minutes));
}
