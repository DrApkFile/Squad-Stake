# FAILURE_MODES — Squad Stake

Decided before building. Each guard names where it lives and its acceptance test (PRD §12).
Evidence ids refer to `REALITY_SPIKES.md`.

## Nimiq Pay provider (sign, 6 staking calls, sendBasicTransactionWithData)
| Mode | Guard | Where | Test |
|---|---|---|---|
| User declines | `PERMISSION_DENIED` → calm "Nothing changed" | `apps/web/src/core/errors/catalog.ts` | Q09 |
| Hash returned but tx failed on-chain (NimJar, testnet 12 Sep 2026) | every hash tracked to `INCLUDED_OK` / `INCLUDED_FAILED` via RPC `executionResult`; UI never says done on a hash alone | `apps/web/src/server/core/tx-tracker.ts` | Q10 |
| Retire before release | button disabled until `head ≥ releaseBlock`; if sent anyway, shown as failed, nothing lost | planner + tracker | Q11 |
| Remove amount ≠ whole retired balance | always `value = retiredBalance` read fresh from chain, `fee = 0` (NimJar pattern) | `apps/web/src/core/staking-actions.ts` | Q12 |
| Missing/low staking fee | explicit fees in one constants file (create 300, add 200, unstake 300, retire 300 luna; remove 0) | `apps/web/src/config/constants.ts` | — |
| Double tap | button disabled while a call is pending; one tracked hash per action | UI + tracker | Q13 |
| Not inside Nimiq Pay | `init()` throws plain Error → "Open in Nimiq Pay" screen with deeplink | `apps/web/src/wallet/` | — |
| Wrong network | `window.nimiqPay.network` must equal `NIMIQ_NETWORK`; else block all actions | `apps/web/src/wallet/network.ts` | Q14 |

## Nimiq JSON-RPC (public nimiqwatch nodes)
| Mode | Guard |
|---|---|
| Method not allowed (`getStakersByValidatorAddress`, `getBlockAfterCollateralLockup`) | never used; use `getBlockAfterReportingWindow` (allowed alias) — S1 v2 |
| Param shape | positional, optional params passed explicitly as `null` (`getTransactionsByAddress [addr, max, null]`) — S2 v3 |
| "Internal error" for a non-staker | means "no staker", mapped to `NOT_STAKING`, not to an outage |
| Slow first call (~1 s), warm ~200 ms | one keep-alive client; 60 s cache per address; 5 s timeout |
| Node down / timeout | show last known state with its age ("checked 3 min ago"); never invent a fresh value |
| Included but not final | status `PENDING` until finality |

## Protocol timing
| Mode | Guard |
|---|---|
| Unstake takes 12–24 h | planner: `release = getBlockAfterReportingWindow(getElectionBlockAfter(now))`; "start leaving by" = goal time − worst case (24 h) − 2 h margin |
| Validator jailed (up to 8 epochs ≈ 4 days) | if `jailedFrom` is set on the member's validator: `release = max(window, getBlockAfterJail(jailedFrom))`, warn the squad |
| Member in several squads | Σ commitments ≤ active balance enforced; unstaking for one squad shows the effect on the others before approval |

## People
| Mode | Guard |
|---|---|
| Member leaves early / unstakes | status from chain: `SHORT by X`; squad sees it; Mode A organiser sees who is short before goal day |
| Member never pays (Mode A) | payment verified on-chain; roster shows unpaid; no automatic consequences (self-custody) |
| Organiser disappears (Mode A) | recipient address fixed at creation and visible to all; payments go straight to it |
| Privacy | squad sees each member's commitment and **backed / short**, not their full balance |

## Data / infra (Vercel + Postgres)
| Mode | Guard |
|---|---|
| Concurrent updates | state changes via `UPDATE … WHERE state = $from`; 0 rows = refused |
| Missing env | validated at startup |
| Invite link guessing | random 128-bit invite tokens; joining needs a signed-in wallet |
