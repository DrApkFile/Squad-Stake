// Shared by client and server; no imports, so both boundaries can read it.

export const LUNA_PER_NIM = 100_000;

/** getPolicyConstants.minimumStake, testnet + mainnet (read 2026-11-06) = 100 NIM. */
export const MINIMUM_STAKE_LUNA = 10_000_000;

/**
 * Explicit staking fees in luna (FAILURE_MODES "missing/low staking fee"; NimJar observed
 * 200–300). Remove is 0 because the staking contract pays it from the retired balance
 * (AGENTS.md 6): asking for the full balance plus a fee never lands.
 */
export const STAKING_FEES_LUNA = {
  create: 300,
  add: 200,
  unstake: 300,
  retire: 300,
  remove: 0,
} as const;

/**
 * One batch is 60 blocks and ends in a macro block, which is where Albatross finalises it
 * (getPolicyConstants.blocksPerBatch = 60, read 2026-11-06). Waiting a whole batch of
 * confirmations therefore guarantees the including block's macro block has passed.
 */
export const FINALITY_CONFIRMATIONS = 60;

/** PRD §7.2: a goal date must be at least three days ahead when the squad is created. */
export const GOAL_MIN_AHEAD_MS = 3 * 24 * 60 * 60 * 1000;

/** FAILURE_MODES "invite link guessing": 128-bit tokens, stored only as a hash. */
export const INVITE_TOKEN_BYTES = 16;

/** Short id goes into Mode A payment data as `sq:<short_id>` (PRD §7.6). */
export const SHORT_ID_LENGTH = 8;

/**
 * PRD §7.5 / Q08: a member who wants their stake liquid on goal day has to start leaving
 * before `goalTime − 24 h − 2 h margin`, because unstaking waits for an election block and
 * then a reporting window (up to about a day), and nothing starts by itself.
 */
export const LEAVE_BY_LEAD_MS = 26 * 60 * 60 * 1000;

/** The leave-by banner appears from three days before the deadline (PRD §7.5). */
export const LEAVE_BY_WARNING_MS = 3 * 24 * 60 * 60 * 1000;

/** Client-driven tx polling: Vercel route handlers are short-lived, so there is no background
 * loop (ARCHITECTURE "Vercel notes"). Two minutes of five-second checks, then a manual retry. */
export const TX_POLL_INTERVAL_MS = 5_000;
export const TX_POLL_ATTEMPTS = 24;

/**
 * PRD §7.7 "spread members": how many member addresses the spread count samples. The count
 * comes from one staker read per address (through the 60 s cache), on the one screen where a
 * member is about to create a staker, so it is bounded rather than growing with the app. A
 * smaller sample only makes the spread less even; it can never pick an ineligible validator.
 */
export const SPREAD_SAMPLE_LIMIT = 200;

/** PRD §9.12: how many of an address's transactions are scanned for pool payouts. The upstream
 * `max` is an `Option<u16>` (rpc-schemas.ts), and a pool paying every 3 hours produces a few
 * hundred a year, so this is a page, not a promise of completeness. */
export const EARNED_TX_PAGE = 500;
