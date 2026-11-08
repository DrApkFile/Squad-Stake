/**
 * English for the four later features (PRD §7.7, §9.11, §9.12, §10): the pool a new staker
 * joins, what a stake has earned since joining, fiat estimates and the create-screen
 * templates. They share this file because they share one rule: say where the number came
 * from, or show "—" (AGENTS.md "Never fabricate").
 */
export const enFeatures = {
  /** PRD §7.7, shown before the Nimiq Pay approval that creates the staker. */
  pool: {
    term: 'Your validator',
    nameFee: (name: string, fee: string) => `${name} · ${fee} fee`,
    nameOnly: (name: string) => name,
    feeUnknown: 'fee not published',
    payoutRestake: 'Rewards are added to your stake automatically.',
    payoutDirect: 'Rewards are paid out to your wallet.',
    payoutDirectSchedule: (schedule: string) => `Rewards are paid out to your wallet (${schedule}).`,
    spread: 'Picked to spread Squad Stake members across pools.',
    source: 'Name, fee and payout type come from Nimiq’s own Validators API.',
    fallbackTitle: 'Pool details unavailable',
    fallbackBody: 'Nimiq’s Validators API could not be read, so this validator was picked from chain data alone: active, not jailed, not retired, with the fewest Squad Stake members. Its fee and payout type are not shown, because they are not known.',
    chosenFor: (name: string) => `New stake goes to ${name}.`,
  },

  /** PRD §9.12 / spike S4b. One row per member, and "—" whenever it cannot be measured. */
  earned: {
    term: 'Earned since joining',
    amount: (amount: string) => `+${amount}`,
    unknown: '—',
    why: 'Why “—”?',
    restakeBasis: (deposits: string) =>
      `Active stake today minus the ${deposits} of deposits you approved here.`,
    directBasis: (payouts: number) =>
      `${payouts} ${payouts === 1 ? 'payout' : 'payouts'} from the pool’s payout address since you joined.`,
    measured: 'Measured from the chain, never estimated.',
    reasonNotStaking: 'There is no staker record for this address, so there is nothing to measure.',
    reasonNoPoolData: 'This validator’s payout type is not known — Nimiq’s Validators API could not be read — so rewards cannot be attributed.',
    reasonPayoutAddressUnknown: 'This pool pays rewards straight to the wallet but has not published the address it pays from, so its payouts cannot be told apart from ordinary transfers.',
    reasonPaysNothing: 'This validator states that it pays stakers nothing, so there is nothing to earn.',
    reasonOutsideStake: 'This stake was not created through Squad Stake, so what was deposited before is unknown and growth cannot be separated from deposits.',
    reasonUntrackedDeposit: 'This address has staking transactions Squad Stake did not send, so deposits cannot be added up exactly.',
    reasonLeaving: 'Some of this stake has already started leaving, so growth cannot be separated from what moved out.',
    reasonChainUnavailable: 'The chain could not be read for this address just now.',
  },

  /** PRD §9.11. Always "≈", always labelled an estimate, hidden when the price fails. */
  fiat: {
    line: (value: string, currency: string) => `≈ ${value} ${currency} · estimate`,
    note: (source: string, age: string) =>
      `Fiat is an estimate from ${source}, priced ${age}. NIM moves; the NIM figures above are the real ones.`,
    sourceCoinGecko: 'CoinGecko',
    priceAgeMinutes: (minutes: number) => `${minutes} min ago`,
    priceAgeNow: 'just now',
  },

  /** PRD §10 (Nov 9): quick starts on the create screen. The name is a suggestion in the
   * member's own language; the mode and the suggested date are data, not words. */
  templates: {
    label: 'Quick start',
    hint: 'A template fills in the mode, a name and a date. Change any of it.',
    trip: 'Trip',
    tripName: 'Lisbon in April',
    gift: 'Gift',
    giftName: 'Birthday gift',
    gadget: 'Gadget',
    gadgetName: 'New laptop',
    rent: 'Rent buffer',
    rentName: 'Rent buffer',
    event: 'Event',
    eventName: 'Summer festival',
    clear: 'Start from scratch',
  },
};
