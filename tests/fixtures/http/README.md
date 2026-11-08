# HTTP recordings (not JSON-RPC)

Two third-party responses, captured unmodified at their `recordedAt` timestamps so the
parsers that read them can fail offline instead of only against a live service.

## `validators-testnet.json`
`GET https://validators-api-test.je-cf9.workers.dev/api/v1/validators`, the endpoint Nimiq's
own Validators API README names for testnet (github.com/nimiq/validators-api README lines
22–23 and 111–117). The body is the whole testnet set as returned on the recorded date —
thirteen validators, base64 logos and score objects included, nothing removed — because the
point of the recording is that `src/server/lib/pool-directory.ts` parses the real payload,
with all the upstream fields it does not use.

Facts the tests rely on and that this recording shows:
* `payoutType` takes the three values of upstream `PayoutType` (`server/utils/types.ts`):
  the set recorded here is mostly `restake` with one `direct`.
* `fee` is a fraction of 1 (`0.05` is 5 %), and is `null` for some validators on mainnet.
* **No field anywhere carries a pool's payout address.** That is why "earned since joining"
  answers `PAYOUT_ADDRESS_UNKNOWN` for a `direct` pool (`src/server/core/earned.ts`).

Tests that need an ineligible (`payoutType: 'none'`) or malformed entry build it by changing
named fields of a recorded one. Those cases are synthetic; the envelope and the field names
are recorded.

## `coingecko-nim.json`
`GET https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=eur`, no API key.
`nimiq-2` is CoinGecko's id for NIM. The value is units of the quote currency per **one NIM**.
A recorded price is a recorded price: it is used to test the parser and the ten-minute cache,
and never shown anywhere as a current rate.
