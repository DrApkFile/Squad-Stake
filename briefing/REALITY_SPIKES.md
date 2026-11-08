# REALITY_SPIKES — Squad Stake

## Confirmed from source (2026-10-21)
| # | Claim | Check | Result |
|---|---|---|---|
| R1 | Mini apps can stake | Nimiq Pay `useMiniAppHost.ts` | 6 staking calls routed to the wallet approval flow |
| R2 | Staker = user's local address | `src/lib/tx.ts` add-stake uses `useLocalWallet().localAddress` | confirmed → server can derive it from sign-in |
| R3 | Provider can read staking state | tech reference §staking | **no**: reads must use RPC |
| R4 | RPC method names and staker fields | core-rs-albatross `rpc-interface` | `getStakerByAddress` → address, balance, delegation, inactiveBalance, inactiveFrom, retiredBalance |
| R5 | Release-time helpers exist | `rpc-interface/src/policy.rs` | `getElectionBlockAfter`, `getBlockAfterCollateralLockup`, `getBlockAfterJail` |
| R6 | Nimiq Pay has native staking UI | searched `src/` | **no** |
| R7 | Mini apps can use an EVM testnet | `mini-app-launcher.ts` | Sepolia allowed (not needed for Squad Stake) |

## Open
| # | Question | How | Who | Pass |
|---|---|---|---|---|
| S1 | RPC reachable, latency | `cd spikes && npm run chain` | Claude (needs domains allowed) or builder | p95 < 1 s |
| S2 | Real staker records readable | same script | same | fields present for ≥ 10 stakers |
| S3 | "Money back by" computable | same script | same | block number returned for an inactive stake |
| S4 | How rewards arrive (payout vs restake) | same script (+ mainnet run) | same | classification for 3+ stakers |
| S4b | Which senders are pool payout addresses | Nimiq Validators API (pool payout addresses) vs S4 senders | Claude | ≥ 1 sender matched to a pool |
| S5 | `sign()` → server-derived address == staker address | phone, testnet | builder | match |
| S6 | Each of the 6 staking calls succeeds from a mini app on testnet | phone, testnet, faucet NIM | builder | 6 tx hashes, states seen via RPC |
| S7 | Time from inactivate → removable on testnet | S6 run + RPC | builder + Claude | measured, recorded |
| S8 | Pay from staked funds after remove (Mode A) | phone | builder | payment verified |

## Result log
| Date | # | Result | Evidence |
|---|---|---|---|
| 2026-10-21 | R1–R7 | as above | file paths in Nimiq Pay @ eb1c1f2; core-rs-albatross raw files |
| 2026-10-21 | S1 | **blocked in Claude's sandbox** (domain not allowed) | curl → no connection |
| 2026-10-21 | S1 (builder) | testnet + mainnet reachable; first call ~6.0–6.3 s (cold, re-measuring warm in v2); policy: epoch 43,200 blocks × 1 s = 12 h, minimumStake 100 NIM, jailEpochs 8 (≈4 days), tx validity window 7,200 blocks (2 h) | builder terminal output |
| 2026-10-21 | S2 (builder) | `getStakersByValidatorAddress` → **"Method not allowed"** on public RPC (testnet + mainnet). Not needed by the product (members are known); v2 samples stakers from staking-contract txs instead | builder terminal output |
| 2026-10-21 | S1 v2 (builder) | warm latency ~200 ms (first ~1 s) on both networks ✅ | builder output |
| 2026-10-21 | S1 v2 methods | ✅ getAccountByAddress, getElectionBlockAfter, getBlockAfterReportingWindow, getBlockAfterJail, getEpochNumber · ❌ getBlockAfterCollateralLockup ("Method not allowed": use the deprecated alias) · ❌ getTransactionsByAddress ("Invalid params": shape TBD, v3) · ❓ getStakerByAddress / getValidatorByAddress ("Internal error" when given a non-staker; v3 tests real stakers) | builder output |
| 2026-10-21 | S3 v2 | v2 counted the window from *now*; correct count is from the election block. Mainnet at block 64,855,225: effective at 64,886,400 (~8.7 h) → retire ≈ 12 h later → **≈ 20.7 h total**. General rule: **12–24 h** | builder output + correction |
| 2026-10-21 | S2 v3 (builder) | ✅ `getTransactionsByAddress` works with params `[address, max, null]`. ✅ `getStakerByAddress` returned real records for 8/8 sampled stakers on **mainnet** and 8/8 on **testnet** (fields: address, balance, delegation, inactiveBalance, inactiveFrom, retiredBalance). Earlier "Internal error" = queried a non-staker | builder output |
| 2026-10-21 | S3 v3 (builder) | ✅ corrected timeline: release = `getBlockAfterReportingWindow(getElectionBlockAfter(now))`. Mainnet block 64,855,xxx → effective ~8.5 h, retire ~20.5 h. Testnet → ~2.2 h, ~14.2 h. Rule confirmed: **12–24 h** | builder output |
| 2026-10-21 | S4 v3 (builder) | ⚠️ stakers receive recurring incoming txs from 1–4 senders (consistent with pool payouts). Attribution needs the pool payout-address list (Validators API) → follow-up S4b | builder output |
| 2026-11-08 | **S4b** | ❌ **not possible from Nimiq's own data, and that is the finding.** The Validators API publishes `name`, `address`, `fee`, `payoutType` and `payoutSchedule` and **no payout address** — verified in `server/utils/schemas.ts` (`validatorSchema`, lines 5–12), `server/utils/types.ts` (`PayoutType`, lines 4–8), the per-validator files under `public/validators/`, and the live mainnet and testnet payloads (21 and 13 validators). So a `direct` pool's payouts cannot be told apart from any other incoming transfer, and no sender can be matched to a pool. Consequence in the build: "earned since joining" measures **restake** pools exactly (active balance − the deposits this app watched land) and answers `PAYOUT_ADDRESS_UNKNOWN` for a direct pool instead of attributing transfers to it | `apps/web/src/server/lib/pool-directory.ts`; `apps/web/src/server/core/earned.ts`; `tests/fixtures/http/validators-testnet.json`; `tests/live/pools.test.ts` |

## Status after 2026-10-21
S1 ✅ · S2 ✅ · S3 ✅ · S4 ⚠️ (S4b closed 2026-11-08: Nimiq publishes no pool payout address,
so senders cannot be mapped; see the result log) · S5–S8 open (phone, testnet).
**Foundation verdict: GO.**

## Peer evidence replaces phone spikes S5–S8 (2026-10-22)
Source: NimJar (Cycle 2), github.com/imprint-hash/nimjar, cloned and read.
| # | Evidence | Status |
|---|---|---|
| S6 | `public/app.js` calls `S.provider.sendNewStakerTransaction`, `sendStakeTransaction`, `sendSetActiveStakeTransaction`, `sendRetireStakeTransaction`, `sendRemoveStakeTransaction` on the Nimiq Pay provider (`init()` at line ~853), passing explicit fees: create 300, add 200, unstake 300, retire 300 luna; remove fee 0 with `value` = retired | ✅ by peer |
| S7 | `src/chain.js`: "Found on testnet, 12 Sep 2026: three retire-stake attempts sent before the stake was released all failed." Countdown to release in UI | ✅ by peer |
| S8 | withdraw → spendable; basic sends proven by every winner | ✅ by peer |
| S5 | Nimiq Pay source: `sign()` and `add-stake` both use the local wallet; library self-test passes (`spikes/s5-verify.mjs`) | ✅ by source; live smoke test during build |
| reads | NimJar uses `getStakerByAddress` on `https://rpc.nimiqwatch.com` / `rpc.testnet.nimiqwatch.com` | ✅ matches S2 |

### Traps recorded (from NimJar)
1. A transaction can be included on-chain and still fail (`executionResult: false`). Never treat a hash as success.
2. Staking transactions carry fees (NimJar: 200–300 luna). Remove: when the staking contract is the sender the fee comes out of the retired balance; asking for the full balance plus a fee "never lands" (NimJar, mainnet, 10 Sep 2026). Via the provider NimJar sends `value = retired, fee = 0`.
3. NimJar already covers single-user staking well (validator picking, earned-so-far, 3-step exit). Squad Stake must not compete on that; its product is the **group**.

## Remaining
- Smoke test during the build: sign in + create staker in the real app on testnet (5 min).
- ~~S4b: pool payout addresses for "earned so far"~~ — **closed 2026-11-08** (result log): Nimiq
  publishes no payout address, so only a restake pool's growth can be measured, which is the
  same thing NimJar reads ("what your pool has added to your stake"). Squad Stake measures it
  as active balance − the deposits it watched land, and shows "—" with a reason otherwise.

## Chain reader build verification (2026-10-23)
- Captured raw testnet JSON-RPC envelopes in `tests/fixtures/rpc/testnet.json`, with
  method, positional params, endpoint and recording time. This supplements the
  field-level S2/S3 results above; earlier terminal response bodies were not saved.
- Spike staker: `NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD 83R7`. Validator:
  `NQ35 YFBF ES7X R9PS 36R4 11FG 3HQF YL9Q NL2S`. Upstream `types.rs` and the
  recorded response agree on `inactivityFlag` and `jailedFrom` (both null here).
- `LIVE_RPC=1 npx pnpm@10.18.3 test:live` passed one test exercising all seven
  adapter methods plus the non-staker error mapping. Head 14,820,452 → release
  14,868,811. Two earlier first-call timeouts were observed; five seconds remains
  the adapter's timeout. No automatic request or wallet retries were added.
- Jail policy output is real, but its input was a hypothetical head block. An
  actually jailed validator and leaving balances remain fixture-derived cases.
  No new phone or mainnet execution evidence is claimed by this slice.

## Eighth method added (2026-11-06)
- `getTransactionsByAddress` added to the adapter with params `[address, max, null]`
  (S2 v3 shape). Upstream signature `get_transactions_by_address(address, max:
  Option<u16>, start_at: Option<Blake2bHash>)` read today in `rpc-interface/src/blockchain.rs`
  (L116–L121); `types.rs` `Validator` re-read and unchanged (L956–L967).
- A real response envelope is recorded in `tests/fixtures/rpc/testnet.json` under
  `transactions` with its own `recordedAt`. The result carries `metadata: null`.
- `LIVE_RPC=1 pnpm test:live` passed first attempt: all eight methods against testnet,
  head 16,013,916, release 16,078,411, validator `jailedFrom: null`, two real
  transactions for the spike staker. Still no jailed validator and no mainnet read.
