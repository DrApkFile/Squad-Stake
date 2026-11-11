/**
 * English: formatting data, the words shared by several screens, the status labels and the
 * error catalogue. English is also the **shape** of every other language (see types.ts), so
 * this file and `en-screens.ts` are the only place a new string is invented.
 *
 * Longer than the ~180-line guide on purpose: it is one table whose entries have to sit
 * beside each other to be translated and reviewed, not code (docs/DECISIONS.md, 2026-11-08).
 */
export const enCore = {
  /**
   * Formatting words and separators, per language and **without `Intl`**: a number formatted
   * by ICU differs between Node builds and browsers, and `packages/ui` has to render the same
   * glyphs in the app and in the HyperFrames video (AGENTS.md "UI purity" 3).
   */
  fmt: {
    /** Thousands separator and decimal mark (CLDR: en uses "1,234.5"). */
    group: ',',
    decimal: '.',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as readonly string[],
    /** `18 Dec 2026`: day first in all five languages, so the order is shared. */
    day: (day: number, month: string, year: number) => `${day} ${month} ${year}`,
    dayTime: (day: string, time: string, zone: string) => `${day}, ${time} ${zone}`,
    readAgeNone: 'Chain read: —',
    readAgeSeconds: (seconds: number) => `Checked ${seconds} s ago`,
    readAgeMinutes: (minutes: number) => `Checked ${minutes} min ago`,
    /** Past an hour, minutes stop being readable: a stale snapshot keeps its original
     * timestamp when a refresh fails, so this figure can run into the hundreds
     * (docs/AUDIT.md, m-5). */
    readAgeHours: (hours: number, minutes: number) =>
      `Checked ${hours} h ${minutes} min ago`,
    countdownNow: 'any moment now',
    countdownDaysHours: (days: number, hours: number) => `${days} d ${hours} h`,
    countdownHoursMinutes: (hours: number, minutes: number) => `${hours} h ${minutes} min`,
    countdownMinutes: (minutes: number) => `${minutes} min`,
    countdownUnderMinute: 'under a minute',
    /** CLDR: English writes "5%" closed up, the other four put a space before the sign. */
    percent: (value: string) => `${value}%`,
  },

  common: {
    brand: 'Squad Stake',
    you: 'You',
    members: (count: number) => `${count} ${count === 1 ? 'member' : 'members'}`,
    modeA: 'Shared goal',
    modeB: 'Together goals',
    eyebrowModeA: 'SHARED GOAL',
    eyebrowModeB: 'TOGETHER GOALS',
    goalDay: (day: string) => `Goal day ${day}`,
    /** "Goal day 18 Dec 2026, in 12 days" — the tail is dropped once the day has passed. */
    goalDayIn: (day: string, days: number | null) =>
      `Goal day ${day}${days === null ? '' : `, in ${days} ${days === 1 ? 'day' : 'days'}`}`,
    backSquads: 'Squads',
    backSquad: 'Squad',
    openSquadStake: 'Open Squad Stake',
    refreshChain: 'Refresh',
    checkStatusAgain: 'Refresh',
    /* While a read is in flight. A tap that changed nothing on screen read as a dead
     * control on a real phone, so the label changes as well as the spinner turning —
     * reduced motion freezes `t`, and the words have to carry it alone. */
    refreshing: 'Refreshing…',
    waiting: 'Waiting…',
    approveInPay: 'Approve in Nimiq Pay',
    nothingSentUntilApprove: 'Nothing is sent until you approve.',
    nothingChanged: 'Nothing changed.',
    unknownValue: '—',
    backedTotalUnread: 'Not checked yet',
    cannotMoveNim: 'Squad Stake cannot move your NIM. Only your approval can.',
    neverHolds: 'Squad Stake never holds your NIM. Only your approval moves it.',
    membersSection: 'Members',
    paymentsSection: 'Payments',
    shareSection: 'Share',
    paidOf: (paid: number, owing: number) => `${paid} of ${owing} paid`,
    paymentVerified: 'Paid · verified on-chain',
    paymentNone: 'Not paid yet',
    paymentUncounted: 'Payment not counted yet',
    payMyShare: 'Pay my share',
    // Top-bar titles. A native bar names the screen you are on, not the one you came from,
    // so these are nouns rather than the "← Squads" breadcrumb they replace.
    titleSquads: 'My squads',
    titleSquad: 'Squad',
    titleNewSquad: 'New squad',
    titleJoin: 'Join squad',
    titleLeaving: 'Leaving',
    titlePay: 'Pay my share',
    titleProof: 'Public proof',
    titlePrivacy: 'Privacy',
    titleLeave: 'Leave squad',
    titleTx: 'Transaction',
    copyLink: 'Copy link',
    copied: 'Copied',
    /* A clipboard write can be refused — an insecure context, a browser that asks first, a
     * denied permission. It used to fail silently, which left a tap that did nothing. */
    copyFailed: 'Could not copy. Use Share instead.',
    viewProofPage: 'View proof page',
    /* The shortened link under a share card: enough to recognise, never enough to retype. */
    linkPreviewLabel: 'Link',
    /* The control beside a failure. A read that failed is re-read; a send that was never made
     * is offered again. Neither ever resends a wallet call by itself (AGENTS.md invariant 8). */
    tryAgain: 'Try again',
    checkAgain: 'Check the chain',
    moreInfo: 'More about this',
    close: 'Close',
  },

  /** The nine member statuses (PRD §7.4). The word is always beside the dot. */
  /**
   * The same statuses in the words a member uses. The technical set above stays on the
   * proof page, which is written for someone checking the chain rather than saving on it.
   */
  statusPlain: {
    BACKED: 'Saved',
    SHORT: 'Short',
    UNSTAKING: 'Leaving',
    RELEASABLE: 'Ready to confirm',
    RETIRED: 'Ready to withdraw',
    NOT_STAKING: 'Not saving yet',
    LEFT: 'Left the squad',
    WITHDRAWN: 'Back in your wallet',
    PAID: 'Paid',
    notReadYet: 'Not checked yet',
    shortBy: (amount: string) => `Short by ${amount}`,
  },
  status: {
    BACKED: 'Backed',
    SHORT: 'Short',
    UNSTAKING: 'Unstaking',
    RELEASABLE: 'Ready to retire',
    RETIRED: 'Ready to withdraw',
    NOT_STAKING: 'Not staking',
    LEFT: 'Left the squad',
    WITHDRAWN: 'Withdrawn',
    PAID: 'Paid',
    shortBy: (amount: string) => `Short by ${amount}`,
    notReadYet: 'Not read yet',
  },

  /**
   * Every entry of `apps/web/src/core/errors/catalog.ts`, which takes its English from here so
   * there is one catalogue of strings and not two (AGENTS.md "Errors").
   */
  errors: {
    CHAIN_UNAVAILABLE: { message: 'The chain could not be read just now.', nextAction: 'Nothing is lost. Refresh in a moment.' },
    DECLINED: { message: 'Sign-in declined. Nothing changed.', nextAction: 'Try again when you’re ready.' },
    OUTSIDE_HOST: { message: 'Open Squad Stake in Nimiq Pay to sign in.', nextAction: 'Open in Nimiq Pay.' },
    WRONG_NETWORK: { message: 'Nimiq Pay is on a different network.', nextAction: 'Switch to the app’s network in Nimiq Pay.' },
    AUTH_REFUSED: { message: 'Your session is no longer valid.', nextAction: 'Sign in with Nimiq Pay again.' },
    INVALID_INPUT: { message: 'That request was not valid.', nextAction: 'Check what you entered and try again.' },
    UNAVAILABLE: { message: 'Squad Stake is unavailable right now.', nextAction: 'Please try again shortly.' },
    NETWORK_ERROR: { message: 'The connection was interrupted.', nextAction: 'Check your connection and try again. Nothing was sent.' },
    TIMEOUT: { message: 'That read ran out of time.', nextAction: 'Try again; nothing was sent.' },
    NO_QUOTE: { message: 'No exchange rate for that currency.', nextAction: 'Amounts are shown in NIM only.' },
    WALLET_ERROR: { message: 'Nimiq Pay could not complete sign-in.', nextAction: 'Try again when you’re ready.' },
    TX_DECLINED: { message: 'Approval declined. Nothing was sent.', nextAction: 'Tap again when you’re ready.' },
    TX_REJECTED: { message: 'Nimiq Pay could not accept this transaction.', nextAction: 'Check the amount and try again.' },
    TX_UNSUPPORTED: { message: 'Nimiq Pay does not support this action.', nextAction: 'Update Nimiq Pay, then try again.' },
    TX_SUBMIT_FAILED: { message: 'The transaction could not be submitted.', nextAction: 'Check your connection and try again.' },
    TX_OUTCOME_UNKNOWN: { message: 'It is not clear whether that transaction was sent.', nextAction: 'Check it in Nimiq Pay before sending another.' },
    TX_PENDING: { message: 'Waiting for the chain to confirm.', nextAction: 'This usually takes about a minute.' },
    TX_FAILED: { message: 'The transaction was included but failed.', nextAction: 'Nothing moved; the fee was spent. You can try again.' },
    TX_NOT_CONFIRMED: { message: 'That transaction is not confirmed yet.', nextAction: 'Wait for confirmation, then commit.' },
    NOT_TRACKED: { message: 'That transaction is not tracked here.', nextAction: 'Start the action again.' },
    DUPLICATE_HASH: { message: 'That transaction is already being tracked.', nextAction: 'Check its status.' },
    OVER_COMMITTED: { message: 'That is more than your stake can back.', nextAction: 'Commit your free amount, or add stake first.' },
    NOT_STAKING: { message: 'You are not staking yet.', nextAction: 'Create a staker to back your commitment.' },
    GOAL_TOO_SOON: { message: 'Pick a goal date at least three days ahead.', nextAction: 'Leaving a stake can take a day.' },
    INVITE_INVALID: { message: 'That invite link is not valid.', nextAction: 'Ask the organiser for a new link.' },
    SQUAD_CLOSED: { message: 'This squad is closed.', nextAction: 'Ask the organiser about a new squad.' },
    SQUAD_NOT_FOUND: { message: 'That squad no longer exists.', nextAction: 'Go back to your squads.' },
    NOT_A_MEMBER: { message: 'You are not in this squad.', nextAction: 'Open the invite link, or view the public proof.' },
    LEAVE_BLOCKED: { message: 'This squad could not release you.', nextAction: 'Refresh the squad and try again. Your stake is untouched.' },
    ALREADY_LEAVING: { message: 'You have already started leaving.', nextAction: 'Follow the steps you started. Nothing was sent twice.' },
    NOT_RELEASABLE: { message: 'This stake is not released yet.', nextAction: 'Wait for the countdown to finish, then confirm.' },
    NOTHING_TO_RETIRE: { message: 'There is no unstaking balance to confirm.', nextAction: 'Start leaving first.' },
    NOTHING_TO_WITHDRAW: { message: 'There is nothing withdrawn to collect.', nextAction: 'Confirm the withdrawal first.' },
    INVALID_AMOUNT: { message: 'That is not an amount of NIM.', nextAction: 'Enter the NIM you want to free up.' },
    AMOUNT_EXCEEDS_STAKE: { message: 'That is more than your active stake.', nextAction: 'Leave at most what you have staked.' },
    NO_RECIPIENT: { message: 'This squad has no recipient.', nextAction: 'Together-goals squads never pay anybody.' },
    NOT_MODE_A: { message: 'There is nothing to pay in this squad.', nextAction: 'Together goals means nobody pays anybody.' },
    WRONG_RECIPIENT: { message: 'That payment went somewhere else.', nextAction: 'Pay the recipient shown on the squad page.' },
    PAYMENT_SHORT: { message: 'That payment is less than your share.', nextAction: 'Pay the rest of your share to count it.' },
    PAYMENT_DATA_MISMATCH: { message: 'That payment carries no squad marker.', nextAction: 'Use “Pay my share” so the squad reference is attached.' },
    PAYMENT_NOT_VERIFIED: { message: 'That payment has not been verified yet.', nextAction: 'The chain is still confirming it. Check again shortly.' },
    NO_VALIDATOR: { message: 'No validator could be chosen just now.', nextAction: 'Either no active validator is running a pool that pays stakers, or the validator list could not be read. Try again in a moment.' },
  },
};
