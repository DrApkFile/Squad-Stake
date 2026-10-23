# PROOF_PLAN — Squad Stake

## Verified real run
A mainnet squad, ≥ 3 real wallets: Mode B full cycle (commit → unstake → release → withdraw),
and one Mode A payment verified. Frozen to `evidence/mainnet-squad.json` by
`pnpm evidence:squad <id>` (generated, never hand-written): staker reads with block numbers,
tracked tx hashes with execution results, release blocks, payment checks.

## 60-second judge path
1. Open the demo squad link in Nimiq Pay → see members with **verified on-chain** badges and the
   time of the last chain read.
2. Tap a member → proof view: their staker address, committed vs backed, explorer link.
3. Create a squad, share the link, join from a second wallet.
4. See the leave-by banner and the three leaving steps with a live countdown.

## Verify it yourself
`curl https://<app>/api/proof/<squad>` → JSON with every member's latest chain read and every
payment's tx hash; anyone can re-check the hashes on a Nimiq explorer.

## Live-attackable guards
| Attack | Try | Expected |
|---|---|---|
| Over-commit | commit more than your stake | refused, shows your free amount |
| Fake progress | edit request bodies with a balance | ignored; status comes from chain |
| Early retire | tap retire before release | disabled; if forced, shown as failed, nothing lost |
| Wrong payment | pay wrong amount or without data | not counted, explained |
| Replay sign-in | reuse a challenge | refused |

## Claims ledger
| Claim | Status |
|---|---|
| Members' shares never leave their wallets | PROVEN by design (no custody code) — re-check at audit |
| Progress verified on-chain | NOT PROVEN until the app runs (S2 shows the read works) |
| Planner timing matches the chain | NOT PROVEN until one real cycle (S3 math confirmed) |
| Works first time on mainnet | NOT PROVEN |
| Real usage | NOT PROVEN |
README, UI and submission may repeat only PROVEN claims.
