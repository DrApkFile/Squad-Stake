# RPC recording

`testnet.json` contains unmodified JSON-RPC response bodies captured from
`https://rpc.testnet.nimiqwatch.com` at its `recordedAt` timestamp, with each method
and positional params. The address is the S2 v3 spike staker specified for this
slice. This extends the field-level results in `briefing/REALITY_SPIKES.md`; the
old log did not contain raw response bodies.

The `transactions` record was captured later (2026-11-06, its own `recordedAt`) when
`getTransactionsByAddress` was added; its params are the working S2 v3 shape
`[address, max, null]`. Its two transactions are the staker's real history and
carry no chain metadata.

The `validators` record (`getActiveValidators`, empty params) was captured on
2026-11-06 with its own `recordedAt`. It is the whole active testnet set as returned,
twelve validators, and unlike the transaction page it carries chain metadata
(`{ blockNumber, blockHash }`).

The staker is active and its validator has `jailedFrom: null`. The jail policy
was called with the recorded head as a hypothetical input, not an observed jail
event. The transaction hash came from that staker's real transaction history.
The staking contract address produced the recorded non-staker error.

Unit tests derive inactive/retired/mixed balances and jailed-validator edge cases
by changing named fields in the recorded objects. Those cases are synthetic;
their wire field names, envelopes and original policy outputs are recorded.
The transport tests change only the JSON-RPC id to correlate with each request.

`node scripts/build-chain-scenes.mjs` projects the recording's time and policy
blocks into `packages/ui/scenes/chain-recording.json`. Member scenes explicitly
label all derived states as synthetic testnet fixtures. None is mainnet demo
evidence or a claim that a wallet action succeeded.

## The leaving staker (recorded 2026-11-09)

`leavingStaker`, `leavingUnstakeTx` and `failedRetireTx` were captured on 2026-11-09, each with
its own `recordedAt`, for the squad-page defects reported from a testnet phone run.

They are one real staker's real exit, found by reading the staking contract's own transaction
history (`getTransactionsByAddress` on `NQ77 0000 … 0001`) and following it back to the sender:

- `leavingStaker` — `NQ22 11TS NJ8N BMD0 UVUM E0KL 2RPU NHM1 2RS8`, **mid-exit**: active 0,
  `inactiveBalance` 11,000,000 luna, `inactiveFrom` 16,251,210, retired 0.
- `leavingUnstakeTx` — `0ad4e4a1…`, that same member's `setActiveStake` (incoming staking data
  type `08`), included at block 16,208,043, `executionResult: true`, 82,366 confirmations when
  recorded. This is the pair the "0 of 60 confirmations" regression test runs on: a visible
  effect beside a long-confirmed transaction.
- `failedRetireTx` — `70a282c0…`, a `retireStake` (type `09`) from the same address with
  **`executionResult: false`**: a real included-but-failed retire before release. Until this
  recording, that branch of the tracker was only ever tested from derived fixtures.

Note what these two records prove together, and what AGENTS.md invariant 5 depends on:
`inactiveFrom` (16,251,210) is **43,167 blocks after** the inactivation's own inclusion block
(16,208,043), so it is an effective election block and must never be passed to
`calculateRelease` as an inclusion block.

Confirmation counts grow with the chain, so the recorded numbers are the counts at
`recordedAt`; the tests assert they are past finality, not that they are still exact.
