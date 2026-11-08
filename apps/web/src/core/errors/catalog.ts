import { DEFAULT_LANG, strings, type Lang, type Strings } from '@squad-stake/ui/i18n';

/**
 * Every user-visible error, as AGENTS.md "Errors" requires: `{ code, message, retryable,
 * nextAction, changedAnything }`.
 *
 * The **words** live in the one string catalogue (`packages/ui/i18n`), keyed by the same
 * codes, so the five languages and this file can never drift apart: a new code has to be
 * added in both or `pnpm typecheck` fails. What stays here is the part that is not language —
 * whether retrying makes sense, and whether NIM may already have moved. `changedAnything` is
 * true whenever a fee may have been paid, so the UI never says "nothing happened" when it
 * cannot know that.
 */
type ErrorFlags = { retryable: boolean; changedAnything: boolean };

const FLAGS: Record<keyof Strings['errors'], ErrorFlags> = {
  CHAIN_UNAVAILABLE: { retryable: true, changedAnything: false },
  DECLINED: { retryable: true, changedAnything: false },
  OUTSIDE_HOST: { retryable: false, changedAnything: false },
  WRONG_NETWORK: { retryable: true, changedAnything: false },
  AUTH_REFUSED: { retryable: true, changedAnything: false },
  INVALID_INPUT: { retryable: true, changedAnything: false },
  UNAVAILABLE: { retryable: true, changedAnything: false },
  NETWORK_ERROR: { retryable: true, changedAnything: false },
  WALLET_ERROR: { retryable: true, changedAnything: false },
  TX_DECLINED: { retryable: true, changedAnything: false },
  TX_REJECTED: { retryable: true, changedAnything: false },
  TX_UNSUPPORTED: { retryable: false, changedAnything: false },
  TX_SUBMIT_FAILED: { retryable: true, changedAnything: false },
  TX_OUTCOME_UNKNOWN: { retryable: false, changedAnything: true },
  TX_PENDING: { retryable: true, changedAnything: true },
  TX_FAILED: { retryable: true, changedAnything: true },
  TX_NOT_CONFIRMED: { retryable: true, changedAnything: false },
  NOT_TRACKED: { retryable: false, changedAnything: false },
  DUPLICATE_HASH: { retryable: false, changedAnything: false },
  OVER_COMMITTED: { retryable: true, changedAnything: false },
  NOT_STAKING: { retryable: true, changedAnything: false },
  GOAL_TOO_SOON: { retryable: true, changedAnything: false },
  INVITE_INVALID: { retryable: false, changedAnything: false },
  SQUAD_CLOSED: { retryable: false, changedAnything: false },
  SQUAD_NOT_FOUND: { retryable: false, changedAnything: false },
  NOT_A_MEMBER: { retryable: false, changedAnything: false },
  STALE_READ: { retryable: true, changedAnything: false },
  LEAVE_BLOCKED: { retryable: true, changedAnything: false },
  NOT_RELEASABLE: { retryable: true, changedAnything: false },
  NOTHING_TO_RETIRE: { retryable: false, changedAnything: false },
  NOTHING_TO_WITHDRAW: { retryable: false, changedAnything: false },
  INVALID_AMOUNT: { retryable: true, changedAnything: false },
  AMOUNT_EXCEEDS_STAKE: { retryable: true, changedAnything: false },
  NO_RECIPIENT: { retryable: false, changedAnything: false },
  NOT_MODE_A: { retryable: false, changedAnything: false },
  WRONG_RECIPIENT: { retryable: true, changedAnything: true },
  PAYMENT_SHORT: { retryable: true, changedAnything: true },
  PAYMENT_DATA_MISMATCH: { retryable: true, changedAnything: true },
  PAYMENT_NOT_VERIFIED: { retryable: true, changedAnything: true },
  // §7.7: no validator could be chosen, so nothing was offered and nothing was sent.
  NO_VALIDATOR: { retryable: true, changedAnything: false },
};

export type ErrorCode = keyof typeof FLAGS;

export interface CatalogError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  nextAction: string;
  changedAnything: boolean;
}

function entries(lang: Lang): Record<ErrorCode, CatalogError> {
  const words = strings(lang).errors;
  const built = {} as Record<ErrorCode, CatalogError>;
  for (const code of Object.keys(FLAGS) as ErrorCode[]) {
    built[code] = { code, ...FLAGS[code], ...words[code] };
  }
  return built;
}

/** English, for server responses, logs and tests. The screens translate by code. */
export const errors: Record<ErrorCode, CatalogError> = entries(DEFAULT_LANG);

const BY_LANG = new Map<Lang, Record<ErrorCode, CatalogError>>([[DEFAULT_LANG, errors]]);

/** The same entry in the viewer's language. An unknown code is UNAVAILABLE rather than a
 * blank screen: a route that answers with a code we do not know is still an outage to show. */
export function catalogError(code: string, lang: Lang = DEFAULT_LANG): CatalogError {
  let table = BY_LANG.get(lang);
  if (table === undefined) {
    table = entries(lang);
    BY_LANG.set(lang, table);
  }
  return Object.hasOwn(table, code) ? table[code as ErrorCode] : table.UNAVAILABLE;
}

/**
 * Every documented NimiqProviderError type, plus a default branch (SDK 0.2.x keeps a
 * host-supplied type verbatim, so unlisted types reach us). For a send call an unknown
 * cause must not claim nothing happened, so it maps to TX_OUTCOME_UNKNOWN.
 */
export function providerErrorCode(type: string): ErrorCode {
  switch (type) {
    case 'PERMISSION_DENIED': return 'TX_DECLINED';
    case 'INVALID_TRANSACTION': case 'INVALID_REQUEST': return 'TX_REJECTED';
    case 'UNKNOWN_REQUEST': return 'TX_UNSUPPORTED';
    case 'NETWORK_ERROR': case 'INTERNAL_ERROR': return 'TX_SUBMIT_FAILED';
    default: return 'TX_OUTCOME_UNKNOWN';
  }
}
