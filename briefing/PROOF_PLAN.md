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
| Progress verified on-chain | **PROVEN on testnet** 2026-11-08 — real phone in Nimiq Pay: sign-in → create squad (Together goals) → Create staker approved → hash tracked to `INCLUDED_OK` → the squad page showed BACKED derived from a chain read |
| The complete leaving cycle (start → release → confirm → withdraw) | **PROVEN on testnet** — a real phone in Nimiq Pay: *Start leaving* approved 2026-11-09, the countdown held until the chain reached the release block, then *Confirm withdrawal* and *Withdraw* approved, and the member read **Withdrawn**. Completed and reported by 2026-11-11 |
| Planner timing matches the chain | **PROVEN on testnet** by that cycle — the release the planner derived from the inactivation's **inclusion** block is the point at which the chain actually let the withdrawal through |
| The app on mainnet | **PROVEN on mainnet** 2026-11-11 — a real phone in Nimiq Pay on Default at <https://squad-stake.vercel.app>: sign-in, create squad, the squad page and the public proof page, all reading mainnet |
| Mode A settlement by a real payment | **PROVEN on testnet** — a share paid and verified against the chain: recipient, value ≥ share, the `sq:<short_id>` marker, execution and finality, with the sender deliberately never matched. On **mainnet** the refusal side was exercised too: a payment attempted without the NIM to cover it was rightly refused |
| Real usage | **PROVEN** — the app has been used end to end on a real phone in Nimiq Pay, by the builder, on mainnet and on testnet. No outside users and **no usage numbers are claimed** |

The rows updated on 2026-11-11 are **reported by the operator from their own phone**, not
observed by an agent session — the same basis as the 2026-11-08 row (`docs/PROGRESS.md`, "Phone
run on testnet"). No transaction hash, staker address or proof link was supplied with them, so
none is recorded here rather than invented, and no explorer link in any judge-facing file points
at one. Nimiq's RPC finds a transaction only by hash or by address, so without one of those the
runs cannot be located from here; when they are supplied, each hash is to be re-read with
`getTransactionByHash` on that network's node and must exist, be final and carry
`executionResult: true` before it reaches a judge.

## Hashes verified from this machine
Re-read 2026-11-11 with `getTransactionByHash` on `rpc.testnet.nimiqwatch.com`. These are the
recorded transactions the tests are built on, confirmed still live on the chain today:

| Hash | Block | `executionResult` | Confirmations | What it proves |
|---|---|---|---|---|
| [`70a282c0…a879b6`](https://test.nimiq.watch/#70a282c066550f00283f01be6d95c8c8341e44cc839ae45e231dc0a4d4a879b6) | 16,172,568 | **`false`** | 309,250 | **Included but failed is real.** A transaction can sit in a block, spend its fee and do nothing — which is why a hash is never treated as success |
| [`0ad4e4a1…627a91`](https://test.nimiq.watch/#0ad4e4a120a7f88c7f5df55304e9804ff53804017f37c43082c4f346e2627a91) | 16,208,043 | `true` | 273,775 | A real inactivation. Its staker still read `inactiveFrom` 16,251,210 — 43,167 blocks later — which is why the release is derived from the **inclusion** block |
| [`5edc92bd…02ce8f`](https://test.nimiq.watch/#5edc92bd79fb26dbfccb0eda9e23e89de9d5b770b904247cb67f3c9cba02ce8f) | 3,140,555 | `true` | 13,341,264 | The inclusion block the release math was derived from in the live test |

Independently checked from this machine on 2026-11-11, which is not a substitute for the above:
the production JavaScript served by <https://squad-stake.vercel.app> carries the host guard
`"mainnet" !== window.nimiqPay.network → WRONG_NETWORK`, so the deployment judges open is a
mainnet build and blocks any wallet that is not on mainnet.

README, UI and submission may repeat only PROVEN claims. A claim proven on **testnet** must be
repeated with the word testnet in it; "verified on-chain" with no network named reads as mainnet
and is only earned where the row above says mainnet.
