# EVENT: Nimiq Mini Apps Competition — Cycle III

Researched: 2026-10-21
Sources: miniappscompetition.com (rules, scoring, cycle3, submissions/cycle1–3 pages);
nimiq.com blog "Mini Apps Competition Cycle #3: Pay, Save, Earn!" (2026-10-14); scoring
guide pasted by the builder; Cycle 2 scoring post on Skool (found via search, 2026-10-20).

## At a glance

| Item | Detail |
|---|---|
| Build window | 2026-10-14 → 2026-11-11 |
| Deadline | **2026-11-11 23:59 UTC** (we submit 2026-11-10) |
| Submissions go public | start of Week 3 (≈ 2026-10-28) for early-access testing |
| Live calls (Sip & Ship) | Oct 21, Oct 28 at 15:00 UTC; Nov 4 at 16:00 UTC |
| Prizes | 4,000 USDC per category (Pay, Save, Earn, On/Off-Ramp) + 1,000 Community Council bonus |
| Field size | Cycle 1: 62. Cycle 2: 142. Cycle 3: 0 visible on 2026-10-21 |
| Judges | Nimiq Community Council members; they test the live app inside Nimiq Pay |

## Scoring (100 points)

| Criterion | Max | Full marks looks like | Our planned proof |
|---|---|---|---|
| Functionality, reliability, usefulness | **45** | core promise works first time; errors explained; fast; no dead ends; finished; real need; obvious audience; original; repeat value | P0 flow on mainnet; error catalog; proof tiers; "pay any Lightning address" |
| Nimiq Pay + Nimiq integration | 25 | NIM central to the experience, not a logo | NIM pays Lightning; NIM-to-NIM jolts; proof read from the Nimiq chain |
| Real usage | 15 | Cycle 2: unique Nimiq wallets that opened the app in the measurement window | live by Oct 28; Skool + Sip & Ship |
| Design and UX | 10 | polished mobile UI | 390 px checks, states for every outcome |
| Builder promotion | 5 | Cycle 2: Skool post (2) + public social post (3) | both before Nov 10 |

**Heaviest item:** functionality (45). **Fatal gates:** no NIM/USDT integration
(disqualified); not live on mainnet (Cycle 2: testnet apps did not qualify); off-limits
content.

## Eligibility gates (acceptance IDs → test titles)

| ID | Requirement | How we verify | Evidence |
|---|---|---|---|
| A01 | Team ≤ 5, all 18+, one lead with name/pseudonym, GitHub, Nimiq payout address | submission form | form copy in `docs/SUBMISSION.md` |
| A02 | Public GitHub repo, MIT license | `LICENSE` present; repo public | repo URL |
| A03 | Built on the Nimiq Pay Mini Apps framework, follows its docs | uses `@nimiq/mini-app-sdk` providers | `src/wallet/` |
| A04 | Supports NIM and/or USDT as a core part of the experience | NIM pays every jolt | demo video |
| A05 | No hardcoded private keys, API secrets or credentials | secret-scan test in `pnpm gate` | CI log |
| A06 | Fully functional on the first try; no prototype or mockup; live on mainnet | S10 real run; judge path | `PROOF_PLAN.md` |
| A07 | Written description ≤ 250 words: what, who, how it uses Nimiq Pay | word-count check | `docs/SUBMISSION.md` |
| A08 | Category selected: **Pay** | form | — |
| A09 | Nothing off-limits: no gambling/chance, explicit, hateful, deceptive, malware, impersonation | content filters J-tests; no chance mechanics | `tests/` |
| A10 | Third-party code properly licensed and attributed | `THIRD_PARTY_NOTICES.md` | repo |
| A11 | **User data only with clear disclosure, lawful basis, informed consent** | privacy screen before sign-in; `PRIVACY.md` | screenshot |
| A12 | Submitted through the portal before the deadline | confirmation | — |

## Entry type chosen and why (updated for Squad Stake: Save; see IDEA_CHECK.md)

**Pay.** The brief: "Open up a new way for Nimiq Pay to pay … reaching a merchant, bill, or
person that money cannot reach today." Jolt reaches anyone with a Lightning address. Pay is
also where a past winner (emrealt34, NimJump) is building a Lightning shop, so we compete on
proof and reach, not on being first to Lightning.

## What judges read, in order (inferred from Cycle 2)

1. The live app inside Nimiq Pay. 2. The 250-word description. 3. The demo video. 4. The
README. They give no individual feedback.

## Rules on commits, history, updates during judging

Not stated on the pages read. Treat the deadline as a code freeze and ask (below).

## Open questions for organisers (ask at Sip & Ship)

1. Is real usage in Cycle 3 measured like Cycle 2 (unique wallets opening the app)?
2. May we push fixes after 2026-11-11 23:59 UTC while judging runs?
3. Is there a testnet Lightning wallet that Fastspot's testnet can pay?

## Past winners and calibration

See `docs/reference/nimiq-winners-pattern-analysis.md`. All seven winners: signature as
identity, server-side authority, strong README. None used Lightning or staking.
