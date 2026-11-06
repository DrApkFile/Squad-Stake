# RPC recording

`testnet.json` contains unmodified JSON-RPC response bodies captured from
`https://rpc.testnet.nimiqwatch.com` at its `recordedAt` timestamp, with each method
and positional params. The address is the S2 v3 spike staker specified for this
slice. This extends the field-level results in `briefing/REALITY_SPIKES.md`; the
old log did not contain raw response bodies.

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
