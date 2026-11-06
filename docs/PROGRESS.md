# Progress handoff — 2026-11-06

Deadline **2026-11-11 23:59 UTC**. Day plan in `docs/PRD.md` §10 (full scope, nothing cut).

## Done and verified
- Workspace, signature-based sign-in, chain reader, pure member status/release logic
  and the create / join / commit / leave layer are implemented; complete P0 is not.
  The squad layer has never run against a database or a wallet (see its section below).
- Next.js web app, pure shared UI, self-hosted fonts, five sign-in scenes, eleven
  member-status fixture cases (all six statuses, pending/error/stale/unknown release)
  and 23 create / join / commit / leave scenes.
- Server-only RPC: nine typed methods, strict wire schemas, positional signatures,
  five-second abort, per-client/address 60 s staker/validator caches, `readAt`, fresh
  bypass, and original timestamps on `lastKnown` snapshots after refresh failures.
- Validator fields/struct quoted from upstream `rpc-interface/src/types.rs` before
  schema authoring; wire names include `inactivityFlag` and `jailedFrom`.
- Q04–Q07: active stake covers the sum of commitments; exact SHORT luna; exit-stage
  and release-boundary derivation; non-staker mapping; election/window/jail math.
- `apps/video` is a placeholder; no Remotion implementation or live deployment yet.
- Sign-in: one wallet approval, official Nimiq digest, browser-bound five-minute
  single-use challenge, address derived from verified public key, hashed sessions.
- Q01: replay, expiry, wrong key, tampering, browser binding and origin guards pass.
- Q02: derived identity, strict client boundary and secure session cookie tests pass.
- Q16: dev identities, mock switches and `/scenes` refused in production artifacts.
  No mock chain provider is implemented yet.
- Q17: purity lint and deterministic rendering of five sign-in and eleven member
  status scenes pass.
- Preceding sign-in slice: full `pnpm gate` exited 0: typecheck, lint, 11 unit tests,
  5 adversarial tests, Next build, production artifact guards, secret scan,
  dependency-age check and tracked-file diff check. No skipped tests.
- All 18 external pins across 5 manifests are exact and at least 14 days old.
  Evidence: `.cache/dependency-ages.json`; workspace links have no registry age.
- Build leaves `apps/web/tsconfig.json` byte-for-byte unchanged (compared before/after).

## Chain slice validation — 2026-10-23
- Test-first member-status/release command initially failed because the two modules
  did not exist. Standalone typecheck/lint found issues subsequently corrected.
- Final `pnpm gate` ran typecheck, lint, 23 unit tests, 10 adversarial
  tests, Next build, Q16 production-artifact guards, secret scan and dependency ages
  successfully (no skipped unit/adversarial tests; 18 exact pins across 5 manifests).
  It then **exited 1 at `check:tracked`**, because the requested changes are uncommitted.
  The clean-tree guard was preserved. Log: `.cache/chain-gate.log`.
- That build reported a stale scene-export warning. Preserved `.next/cache` in a
  temporary directory and ran `pnpm build` again: exit 0, no scene/export
  or compiler warnings. Log: `.cache/chain-build-clean.log`. Existing npm warnings
  about `store-dir`/`cache-dir` are unrelated to compilation.
- `pnpm test:production` passed again against the clean-cache artifact.
  `git diff --check` exited 0 after the final source/documentation changes.
- `LIVE_RPC=1 pnpm test:live`: the first two runs timed out on the first head read
  at five seconds (network reachability, not the adapter). After connection diagnostics,
  the same command passed its one test, zero skips, in 2.45 s of test execution.
  All seven methods and the non-staker mapping ran against testnet. Observed head
  14,820,452; spike staker `NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD 83R7`;
  `jailedFrom: null`; release 14,868,811. The timeout was never increased.
- `pnpm test:live` without the flag: exit 0, one intentional skip.
- Raw RPC recording: `tests/fixtures/rpc/testnet.json` (provenance in its README).
  `node scripts/build-chain-scenes.mjs` generated the UI time/block projection.
  Synthetic leaving/jail cases are labelled; they are not mainnet demo evidence.
- Headless Chromium loaded dev `/scenes`, then measured standalone renders of the
  final eleven cases in both themes (22 frames) at 390 × 844 and 375 × 844 with no overflow. Inspected light
  SHORT, dark UNSTAKING and dark unavailable-read screenshots; bundled font loaded.
- Unverified live: an actually jailed validator or inactive/retired spike staker
  (those cases use derived fixture tests), mainnet reads in this new adapter,
  real-phone rendering, database migration and wallet smoke test. The live test
  reads an existing transaction; it does not prove tracking/finality or wallet actions.
- No commit, squad routes, commitment persistence, wallet staking or tx tracking.

## 2026-11-06 session
- Schedule: every stale forward-looking date corrected to the real calendar. `docs/PRD.md`
  §10 is now a Nov 6–10 day plan (it had "P0 by 2026-10-30"); `briefing/EVENT.md` real-usage
  row now reads "live on mainnet Nov 8"; `docs/ROADMAP.md` moved pool-aware validators,
  earned-since-joining, fiat estimates, languages and squad templates out of "not in the
  build" into their scheduled days, because full scope is kept. Dated research/provenance
  lines (2026-10-14 → 2026-10-23) were left alone: they record when work happened.
- The chain reader, release math, member status, their Q04–Q07 tests, the fixtures and the
  `MemberStatusBadge` scenes were already built and verified on 2026-10-23, and committed
  in `9811b0a`. Re-checked against this request line by line: the typed server-only client,
  positional params, 5 s timeout, `{ data, metadata }` unwrapping, strict Zod, the
  "Internal error" → NOT_STAKING mapping, the 60 s per-address cache with `readAt`, the
  absence of `getBlockAfterCollateralLockup`, release math, all six statuses, Q04–Q07,
  the live test and a scene per status were already in place. The only gap was the
  eighth RPC method, so nothing was rebuilt and no protected file changed.
- Added `getTransactionsByAddress(address, max, startAt = null)`: positional
  `[address, max, null]` with `start_at` always occupying its slot, `max` parsed as the
  upstream `Option<u16>` (1–65,535), result parsed as an array of the existing strict
  transaction schema, no chain metadata, and its own 60 s cache entry keyed by
  address + max + start hash, since a different page is a different read.
- `blockchain.rs` `get_transactions_by_address` signature quoted in `rpc-schemas.ts` with
  its upstream URL and line range (read 2026-11-06), alongside the `Validator` struct quote.
  Re-read `types.rs` today: `Validator` is still lines 956–967 with `inactivityFlag` and
  `jailedFrom`, matching the existing comment and schema.
- New tests: the eight-method envelope/positional test now covers the page; one unit test
  proves the explicit `null`, per-page caching and `fresh`; two adversarial cases prove bad
  `max`/start hash never reach the network and that an unknown field or a non-array body
  fails closed. A real `transactions` envelope was recorded into
  `tests/fixtures/rpc/testnet.json` with its own `recordedAt` (provenance in its README).
- `pnpm gate` (log `.cache/chain-gate-2026-11-06.log`): typecheck, lint, **24 unit tests,
  11 adversarial tests** (no skips), Next build (6/6 static pages, no warnings),
  Q16 production-artifact guards, secret scan and 18 exact dependency pins all passed.
  It **exited 1 at `check:tracked`** again, because these changes are uncommitted; the
  human commits. Nothing else in the gate failed.
- `LIVE_RPC=1 pnpm test:live`: passed first attempt, one test, zero skips, 2.59 s. All
  eight methods plus the non-staker mapping ran against testnet. Observed head
  16,013,916; staker `NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD 83R7`; validator
  `NQ35 YFBF ES7X R9PS 36R4 11FG 3HQF YL9Q NL2S` with `jailedFrom: null`; release
  16,078,411; transaction page returned two of the staker's real transactions.
- Still unverified: an actually jailed validator, inactive/retired live stakers, mainnet
  reads through this adapter, real-phone rendering, DB migration, wallet actions and
  tx tracking. Nothing about execution or finality of a *new* transaction is proven.

## Inventory against PRD §7 and §9 — 2026-11-06

Checked file by file against the repo and `git log` before building. Tests named with a Q ID
exist and pass; at the time of this pass `pnpm test` + `pnpm test:adversarial` covered Q01,
Q02, Q04–Q07, Q16, Q17 only. **This table is the state before the squad slice below**, which
built §7.2, §7.3, §7.7, §7.8, §9.0, §9.4 and §9.6 and added Q03, Q09, Q10 and Q13; §9.3,
§9.5, §9.7–9.9, §7.4's membership half, §7.5's planner and §7.6 are still missing.

| PRD | Item | State | Evidence |
|---|---|---|---|
| §7.1 | Sign in | **built** | `app/api/auth/{challenge,verify}/route.ts`, `src/server/core/auth.ts`, `src/server/lib/{auth,auth-http,auth-store,nimiq-signature}.ts`, `src/wallet/sign-in.ts` · Q01, Q02 |
| §7.2 | Create squad | **missing** | no `POST /api/squads`, no `squads` table, no create screen |
| §7.3 | Join + commit | **missing** | no invite token, membership, commitment or staker-branch logic; the staker read it needs is built |
| §7.4 | Progress | **partly** | chain-derived six statuses in `src/server/core/member-status.ts` + `release.ts` + `src/server/lib/rpc.ts` (Q04–Q07); no `GET /api/squads/:id`, no squad page. §7.4 also lists WITHDRAWN / PAID / LEFT, which need membership and payment rows, not a staker record |
| §7.5 | Goal-day planner | **partly** | release math built (`release.ts`, Q06, Q07); `leaveBy` (Q08), three leaving steps, `sendSetActiveStake/Retire/RemoveStake`, `GET /api/plan/:id` missing |
| §7.6 | Mode A settlement | **missing** | no `payment-check.ts`, no `sendBasicTransactionWithData`, no Q15 |
| §7.7 | Validator choice | **missing** | no selection logic; `getActiveValidators` is not in the RPC client either |
| §7.8 | Leave a squad | **missing** | no leave route or screen |
| §9.0 | Privacy notice | **missing** | — |
| §9.1 | Open in Nimiq Pay | **built** | `SignInScreen` deeplink branch, `app/page.tsx` |
| §9.2 | Sign in | **built** | `packages/ui/SignInScreen.tsx`, 5 scenes · Q17 |
| §9.3 | My squads | **missing** | — |
| §9.4 | Create squad | **missing** | — |
| §9.5 | Squad page | **missing** | — |
| §9.6 | Join / commit sheet | **missing** | — |
| §9.7 | Leaving steps | **missing** | — |
| §9.8 | Pay my share | **missing** | — |
| §9.9 | Tx status sheet | **missing** | — |
| §9.10 | Proof view | **partly** | `packages/ui/MemberStatusBadge.tsx` shows one member's status and read age (11 scenes, Q17); no member list, explorer link or public proof route |
| §9.11–12 | Fiat, earned | **missing** | P1, scheduled Nov 8 |

Supporting gaps found by the same pass: `src/config/constants.ts` (staking fees, referenced by
AGENTS.md and FAILURE_MODES), `src/core/staking-actions.ts`, `src/wallet/network.ts` (the network
guard currently lives inline in `src/wallet/sign-in.ts`), `src/server/core/{commitments,tx-tracker,
payment-check}.ts`, migration `002`, and the `getActiveValidators` RPC method. Nothing listed as
built was rebuilt in this slice.

## Squad slice — create / join / commit / leave, 2026-11-06

Built, gated and measured in this session; **no database, wallet or phone has run it**.
Plan: `~/.claude/plans/glimmering-wondering-parasol.md` (approved).

Built:
- `apps/web/src/config/constants.ts` — staking fees (create 300, add 200, unstake 300,
  retire 300, remove 0 luna), `LUNA_PER_NIM`, `MINIMUM_STAKE_LUNA` 10,000,000 and
  `FINALITY_CONFIRMATIONS` 60, both read live from `getPolicyConstants` (`minimumStake`,
  `blocksPerBatch`) on testnet today; goal/invite/short-id constants.
- `apps/web/src/core/squad-contract.ts` — strict Zod wire contract for every squad route,
  create as a discriminated union on `mode`.
- `apps/web/src/server/core/squads.ts` — store interfaces and create / join / leave;
  the invite path id must match the squad the token resolves to.
- `apps/web/src/server/core/commitments.ts` (Q03) — one `withMemberLock` transaction, the
  member's rows re-read inside it, `getStakerByAddress(address, { fresh: true })`, refusal
  with the free and short amounts when Σ commitments in active squads would exceed the
  active balance. A commitment that carries a `txHash` is refused unless that hash is this
  member's tracked tx for this squad and `INCLUDED_OK`.
- `apps/web/src/server/core/tx-tracker.ts` (Q10) — SUBMITTED → INCLUDED_OK | INCLUDED_FAILED
  | UNKNOWN. `executionResult: false` is INCLUDED_FAILED; INCLUDED_OK needs execution **and**
  60 confirmations; an absent tx or a failed read is UNKNOWN and no amount of elapsed time
  turns it into failure. Terminal states are never re-read.
- `apps/web/src/server/core/validator-choice.ts` — §7.7 eligibility (not retired, not jailed,
  no inactivity flag), then fewest Squad Stake members, address as the deterministic tie-break.
- `apps/web/src/server/lib/{squad-store,squad-http,squads,rpc-client,squad-view}.ts`,
  `migrations/002-squads.sql` (ARCHITECTURE schema + CHECKs), `migrate.ts` (migration list),
  `env.ts` (`NIMIQ_NETWORK`), `rpc.ts` (`getActiveValidators`).
- Routes: `POST /api/squads`, `POST /api/squads/[id]/{join,commit,leave}`, `POST /api/tx`,
  `GET /api/tx/[hash]`; pages `/squads/new` and `/s/[token]` with thin containers.
- `src/core/staking-actions.ts`, `src/wallet/network.ts` (one host/network guard, now also
  used by `sign-in.ts`), `src/wallet/staking.ts` (injectable adapter, module-level pending
  guard, no retries), `src/core/errors/catalog.ts` (staking/squad entries and
  `providerErrorCode` with a default branch).
- Pure UI: `PrivacyNotice`, `CreateSquadScreen` (modes A and B plus the share step),
  `JoinCommitSheet` (all seven §7.3 states), `LeaveConfirm`, `packages/ui/format.ts`,
  hand-written demo fixtures in `packages/ui/scenes/demo/`, 23 new scenes on `/scenes`.

### getActiveValidators returns chain metadata
The ninth RPC method was first written with `withChainMetadata = false` and the live test
failed with `INVALID_RESPONSE`. The real testnet envelope carries
`result.metadata = { blockNumber, blockHash }` (unlike `getTransactionsByAddress`, whose
metadata is null), so the call now passes `true`. A real `getActiveValidators` envelope —
the whole twelve-validator active set — is recorded in `tests/fixtures/rpc/testnet.json`
with its own `recordedAt` (provenance in its README), and the envelope/positional test
covers all nine methods, so the same mistake now fails offline.

### What ran
- `pnpm gate` (log `.cache/squad-gate-2026-11-06.log`): typecheck, lint, **46 unit tests,
  16 adversarial tests** (no skips), Next build (compiled clean, 8/8 static pages), Q16
  production-artifact guards, secret scan and 18 exact dependency pins all passed. It
  **exited 1 only at `check:tracked`**, because these changes are uncommitted; the human
  commits. Nothing else in the gate failed.
- New tests: Q03 commitment unit (5) and adversarial (5: two concurrent commits where only
  one fits, a client-sent balance/status/free amount, negative/fractional/absurd amounts, a
  member who left plus a stranger plus a closed squad, a borrowed transaction); Q10 tracker
  (4); squads and §7.7 validator choice (6); wallet Q03/Q09/Q13 (4); Q17 for the new scenes
  (3). The concurrency attack is meaningful because the in-memory store serialises
  `withMemberLock` per address the way `SELECT … FOR UPDATE` does.
- `LIVE_RPC=1 pnpm test:live`: one test, zero skips. The first attempt failed at the cold
  first head read on the deliberate five-second timeout (the same reachability behaviour as
  2026-10-23); after one `curl` warm-up it passed in 2.7 s, and the timeout was never
  increased. Observed head 16,032,909; staker `NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD 83R7`;
  validator `NQ35 YFBF ES7X R9PS 36R4 11FG 3HQF YL9Q NL2S`, `jailedFrom: null`; release
  16,078,411; a two-transaction page; 12 active validators, of which the §7.7 choice picked
  `NQ08 N4RH FQDL TE7S 8C66 65LT KYDU Q382 YG7U`. It signs and sends nothing.
- Headless Chromium rendered all 23 new scenes in both themes (46 pages) at 390 × 844 and
  375 × 844: no element crossed the frame, no frame overflow, and every interactive target's
  tap area is at least 44 px (the mode radios are 20 px inside 44 px+ labels). Inspected
  light commit-ready, dark commit-pending, light create-mode-A, dark leave-confirm and the
  light privacy notice. The create form scrolls inside the sheet at 844 px, by design.

### Not verified by this slice
No database has been migrated or written to; no staking transaction has been signed, sent,
included or tracked on any network; no Nimiq Pay approval sheet, no real phone, no mainnet.
The tracker and the commit rule are proven only against recorded/derived chain reads and the
in-memory store. The squad page, planner, leaving steps and Mode A payments are still missing.

### To run it against a database
`cp apps/web/.env.example apps/web/.env.local`, set `DATABASE_URL=postgres://…?sslmode=require`
(Neon), `APP_ORIGIN=http://localhost:3000` and `NEXT_PUBLIC_NIMIQ_NETWORK=testnet` (it must
match Nimiq Pay's network). The migration CLI does not read `.env.local`, so export
`DATABASE_URL` in the shell, then `pnpm db:migrate` (applies `001-auth` and `002-squads`)
and `pnpm dev`. Until then the routes answer with the catalog's `UNAVAILABLE`.

## Environment and commands
- Installs and the registry age check need network access.
- `.npmrc` puts caches inside this project: `.npm-cache`, `.pnpm-cache`, `.pnpm-store`.
  Paths are absolute; update them if the checkout moves.
- pnpm is pinned to 10.18.3 (`packageManager`); every run recorded above used that version.
- Noninteractive install used `CI=true pnpm install --no-frozen-lockfile`;
  installed `@next/eslint-plugin-next@15.5.27` and refreshed `pnpm-lock.yaml`.
- Gate order: typecheck → lint → test → test:adversarial → build → test:production
  → secrets → deps:check → check:tracked.
- `check:tracked` runs `git diff --exit-code && git diff --cached --exit-code`.
  It requires clean tracked files and does not detect untracked files. At the prior
  sign-in verification only `.gitignore` and `.npmrc` were tracked. Source files are
  now tracked, so this slice's uncommitted edits correctly fail that final check.

## Gotchas resolved
- Writes to home-directory caches were blocked; the project-local caches above avoid them.
- pnpm refused node_modules recreation without a TTY; `CI=true` resolved it.
- Next plugin detection needed global registration; rules remain scoped to web files.
  Absolute ESLint rootDir now works from both repository root and `apps/web`.
- Downloaded npm cache content triggered secret scanning and added foreign manifests
  to age checks; both scanners now exclude npm/pnpm caches, like node_modules/store.
  Source secret rejection was separately verified; UI purity rules were not weakened.
- README now describes the implemented chain slice and removes the obsolete
  scaffolding/install limitation. DB migration and real-phone verification remain open.

## Next slice (Nov 7, per PRD §10)
- Squad page (§9.5) and `GET /api/squads/:id`: the member list with each member's
  chain-derived status and the age of its read, plus §7.4's WITHDRAWN / PAID / LEFT,
  which come from membership and payment rows, not from a staker record.
- Goal-day planner and the three leaving steps (§7.5, Q08): `leaveBy`,
  `sendSetActiveStake` / `sendRetireStake` / `sendRemoveStake`. Remove uses a fresh
  `retiredBalance` as `value` with `fee` 0; never `getBlockAfterCollateralLockup`.
- Mode A settlement (§7.6, Q15): `payment-check.ts` verifying recipient, value ≥ share,
  data `sq:<short_id>`, execution and finality **without** matching the sender.
- Mount `LeaveConfirm` on the squad page (built, with scenes, but not yet reachable) and
  wire `/api/squads/[id]/leave` to it.
- Migrate a database and exercise create → join → commit for real; nothing in the squad
  slice has touched Postgres yet.
- Reuse an RPC client in the server process to retain its address cache; these
  caches are ephemeral optimizations, never database truth.
- `calculateRelease` accepts an inactivation **inclusion block**; staker
  `inactiveFrom` is already an effective election block and must not be fed into
  that helper as an inclusion block. Unknown release stays UNSTAKING, not ready.
- Active balance covering all commitments takes BACKED precedence over unrelated
  leaving funds; otherwise inactive funds precede retired funds until exit completes.
