# Progress handoff — 2026-11-08

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
`DATABASE_URL_UNPOOLED` (preferred) or `DATABASE_URL` in the shell, then
`pnpm db:migrate` (applies `001-auth` and `002-squads`)
and `pnpm dev`. Until then the routes answer with the catalog's `UNAVAILABLE`.

## Deploy slice — Vercel + Neon pooling, 2026-11-06

Configuration only: **no Vercel build, no Neon database and no migration has run.**

- `apps/web/src/server/lib/db-config.ts` (new, deliberately not `server-only` so the migration
  CLI can import it) holds the three decisions and their reasons:
  - `prepare: false` on the pooled request path. postgres.js names its prepared statements,
    which live on one server connection; PgBouncer's transaction mode may hand the next
    statement a different one.
  - `ssl: 'verify-full'` for every non-loopback host, so TLS also authenticates Neon's
    publicly trusted certificate instead of only encrypting, which is all the Marketplace's
    `sslmode=require` asks for. A loopback dev database may stay plaintext. Explicit options
    override `sslmode` from the URL in postgres.js (`parseOptions`, read in the installed 3.4.7).
  - `migrationUrl()` prefers `DATABASE_URL_UNPOOLED`, falls back to `DATABASE_URL`, treats an
    empty or blank variable as unset, and refuses anything that is not a `postgres(ql)://` URL.
- Why the commitment rule survives the pooler (comment in `db-config.ts`, pointer in
  `squad-store.ts`): transaction mode pins one server connection for a whole `BEGIN … COMMIT`,
  so `SELECT … FOR UPDATE` keeps its row locks until the commit, and a second commit for the
  same member still waits. Transaction pooling only breaks session-lifetime state — named
  prepared statements, session advisory locks, `LISTEN`, `SET` — and the commit path (Q03)
  uses none: one transaction, `FOR UPDATE`, a fresh staker read, then the update.
  The migration CLI's `pg_advisory_xact_lock` is transaction-scoped too, and it now runs on
  the direct endpoint anyway, with `prepare: false` in case of the fallback.
- `db.ts` reads the URL once and passes `poolOptions(url)`; pool size, idle and connect
  timeouts are unchanged (3 / 20 s / 5 s).
- Vercel: `apps/web/vercel.json` (framework, install and build commands),
  `outputFileTracingRoot` set to the repository root in `next.config.ts` so the workspace's
  linked packages are traced, and `DATABASE_URL_UNPOOLED` added to `apps/web/.env.example`.
  The install command prefixes `npm_config_store_dir`, `npm_config_cache_dir` and
  `npm_config_cache` because the tracked `.npmrc` pins pnpm's caches to absolute paths inside
  this checkout, which do not exist on a build machine. The README's new "Deploy" section
  lists the exact settings (root directory `apps/web`, "include source files outside of the
  Root Directory" enabled, both commands, Node 22.x) and all four environment variables.
- New tests: `tests/unit/db-config.test.ts` (4) — `prepare: false` and the unchanged pool
  bounds, verified TLS for remote hosts with plaintext only on loopback, the migration URL
  preference and its blank-variable handling, and failing closed on a missing or
  non-postgres URL.
- `pnpm gate` (log `.cache/deploy-gate-2026-11-06.log`): typecheck, lint, **50 unit tests,
  16 adversarial tests** (no skips), Next build (compiled clean, 8/8 static pages,
  no warnings), Q16 production-artifact guards, secret scan and 18 exact dependency pins all
  passed. It **exited 1 only at `check:tracked`**, because these changes are uncommitted; the
  human commits. Nothing else in the gate failed.
- Not verified: no connection has been opened to Neon or to any Postgres, pooled or direct;
  no migration has been applied; no Vercel project has been built or deployed. The pooler
  reasoning above is from Postgres/PgBouncer semantics and the postgres.js source, plus the
  unit assertions on the options — not from an observed pooled transaction.

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

## Next slice (Nov 9, per PRD §10)
Superseded items from the Nov 7 list are done: the squad page (§9.5), `GET /api/squads/:id`,
the mounted `LeaveConfirm`, `leaveBy` (Q08) and the first real database run. What is left:
- The three leaving wallet steps (§7.5, Q11, Q12) and `GET /api/plan/:id`:
  `sendSetActiveStake` / `sendRetireStake` / `sendRemoveStake`. Remove uses a fresh
  `retiredBalance` as `value` with `fee` 0; never `getBlockAfterCollateralLockup`.
- Mode A settlement (§7.6, Q15): `payment-check.ts` verifying recipient, value ≥ share,
  data `sq:<short_id>`, execution and finality **without** matching the sender.
- The release estimate on the squad page: `squad-detail.ts` passes `releaseBlock: null`
  today, so UNSTAKING says the release time is unknown rather than guessing one.
- Run the whole lifecycle against **Neon through the pooler** and confirm a concurrent-commit
  refusal there; the only database this build has touched is a local throwaway cluster.
- A wallet smoke test on a real phone inside Nimiq Pay: sign, stake, track to `INCLUDED_OK`.
- The mock chain provider (`?chain=mock`), still unimplemented; §9.11–12 fiat and earned (P1).
- Reuse an RPC client in the server process to retain its address cache; these
  caches are ephemeral optimizations, never database truth.
- `calculateRelease` accepts an inactivation **inclusion block**; staker
  `inactiveFrom` is already an effective election block and must not be fed into
  that helper as an inclusion block. Unknown release stays UNSTAKING, not ready.
- Active balance covering all commitments takes BACKED precedence over unrelated
  leaving funds; otherwise inactive funds precede retired funds until exit completes.

## Reachable flows + Nimiq visual identity — 2026-11-07/08

Plan: `~/.claude/plans/pasted-content-id-cc27-static-pages-effervescent-wombat.md` (approved).
The protected critical path (`member-status.ts`, `release.ts`, `commitments.ts`, `rpc.ts`,
`rpc-schemas.ts`, `tx-tracker.ts`) was **not touched**; `git status` was filtered to prove it.

### Part A — every P0 screen is reachable

Before this slice `apps/web/app/page.tsx` rendered only the sign-in container and its success
branch printed "You're signed in." with the address, so nothing in the repo ever navigated away
from `/`. The create page, the invite page and the commit sheet existed and were tested but were
unreachable, and `/s/[token]`'s signed-out branch rendered the presentational `SignInScreen` with
no `onSignIn`, so its button did nothing.

Built:
- `src/server/lib/session-page.ts` — `currentAddress()` for server components; a failed session
  read is "not signed in", never an error page.
- `src/server/core/squad-detail.ts` (pure, injected store/rpc/now) — one `getBlockNumber()` plus
  one cached `getStakerByAddress` per member, then the existing `deriveMemberStatus`. Returns the
  squad, `memberCount`, Σ committed, **Σ backed** (PRD §7.4 "squad total = Σ backed amounts"),
  `leaveBy`, and per member `{ address, committedLuna, status, readAt, pendingTx, isYou }`.
  `releaseBlock` is `null`, so UNSTAKING renders "release time unknown"; `inactiveFrom` is already
  an effective election block and is never fed to `calculateRelease` as an inclusion block.
  A failed read per member yields a null status with the catalog's `CHAIN_UNAVAILABLE`.
- **Privacy**: no balance, free amount or `otherCommitments` figure leaves the server for anyone,
  and `SHORT.shortBy` is masked to `null` for every member but its owner, because
  `shortBy = Σ commitments − active balance` publishes a balance.
- `src/core/leave-by.ts` (Q08) — `goalAt − 24 h − 2 h`, plus `showFrom = leaveBy − 3 days`.
- Store: `listMembers`, `squadsForAddress`, `getSquadByShortId`, `latestOpenTrackedTx`, with the
  in-memory twin and a new `detailHarness` in `tests/support/squads.ts`.
- Migration `003-invite-token.sql` — the plaintext invite token beside its hash, so the squad page
  can show the link again. The lookup is still by hash; a session token is never stored this way.
- Routes: `GET /api/squads`, `GET /api/squads/[id]` (members only; a non-member gets
  `NOT_A_MEMBER` so the UI can offer the proof link), `GET /api/proof/[id]` (**public**: no
  session, no Origin requirement, accepts a short id or a uuid).
- Pages: `/` (welcome → sign-in, `redirect('/squads')` when a session exists), `/squads`,
  `/squads/[id]`, `/proof/[id]`, `/join/[token]` → `/s/[token]`, and `/s/[token]`'s signed-out
  branch now renders the real sign-in container with an `onwardUrl` back to the invite.
- `src/hooks/use-tx-poll.ts` — 5 s × 24 = 2 min, then it stops and exposes a manual refresh.
  It never resends a wallet call; `INCLUDED_FAILED` is a failure, an unknown verdict keeps waiting.
  Used by the commit sheet and by a pending member on the squad page.
- Fixed `feeLuna: 0` in the commit sheet's needs-stake branch to read `STAKING_FEES_LUNA`.
- `LeaveConfirm` (built last slice, previously unreachable) is mounted on the squad page.
- Error catalog: five generic entries reworded to be screen-neutral (they said "Start a new
  sign-in." on a squad page), plus `STALE_READ` and `LEAVE_BLOCKED`. Every screen has a back or
  home control through one new pure `ScreenHeader`.

### Part B — Nimiq's own visual identity

`packages/ui/tokens.css` was rewritten on Nimiq's published values, with both sources, their raw
URLs and the retrieval date (2026-11-07) in its header comment, and the measured contrast table
next to them. `packages/ui/fonts` now holds Mulish 300/400/600/700 and Fira Mono 400/500 as
`.woff2`, extracted from the `@fontsource` 5.3.0 tarballs, with both OFL licences and SHA-256 per
file in its README; the two "SquadSans" files (Liberation Sans renamed in CSS) are deleted. No
dependency was added for the fonts.

Three documented deviations, all in `docs/DECISIONS.md` and in the `tokens.css` header: the light
plaza is the default theme and navy the secondary one; money controls are Signal Blue and gold
never reaches one; status hues are dots and fills beside navy words on light, because every one of
them fails AA as text on Cobble White.

Motion is time-driven: pure `packages/ui/motion.ts` (`ringAngle`, `typedChars`, `countUp`,
`tickerOffset`, `easeOutCubic`, `REDUCED_MOTION_T`), every moving component takes `t` in seconds,
per-frame values reach CSS as inline custom properties, and `apps/web/src/hooks/use-scene-time.ts`
supplies `t` from `requestAnimationFrame`, freezing it at `REDUCED_MOTION_T` under
`prefers-reduced-motion`. There is no `@keyframes` loop, `setInterval`, `setTimeout` or
`requestAnimationFrame` anywhere in `packages/ui`. New pure components: `OrbitSquad`,
`GradientBorderButton` (non-money actions only), `TypewriterHeading`, `GoalTicker`, `ScreenHeader`,
`StatusDot`, `MemberList`, `MySquadsScreen`, `SquadScreen`, `ProofScreen`.

Identicons are generated outside `packages/ui` (`src/server/lib/identicon.ts`, `@nimiq/identicons`
1.6.2 pinned in `apps/web` only) and passed down as an SVG string, so `packages/ui` stays
dependency-free. `scripts/build-identicons.mjs` wrote the demo set once; it is checked in and
labelled sample data.

### The orbit ring overflowed because the box rotated, not the paint
The first `OrbitSquad` rotated a square 340 px box with `transform: rotate()`. Its bounding box is
the diagonal — 420 px measured at 375 px — so the ring "crossed the frame" in 14 frames while the
circle it painted never did. The ring now turns by moving a `conic-gradient(from …)` start angle,
and the box never rotates.

### What ran
- `pnpm gate` (log `.cache/ui-gate-2026-11-08.log`): typecheck, lint, **68 unit tests, 20 adversarial tests** (no skips), Next build
  (compiled clean in 13.0 s, 8/8 static pages, no warnings, 20 routes), Q16 production-artifact
  guards, secret scan and **19** exact dependency pins across 5 manifests all passed. It
  **exited 1 only at `check:tracked`**, because these changes are uncommitted; the human commits.
  Nothing else in the gate failed.
- `LIVE_RPC=1 pnpm test:live` (log `.cache/live-2026-11-08.log`): one test, zero skips, 3.5 s.
  Head 16,181,845; staker `NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD 83R7`; validator
  `NQ35 YFBF ES7X R9PS 36R4 11FG 3HQF YL9Q NL2S`, `jailedFrom: null`; release 16,251,211; a
  two-transaction page; **11** active validators today (12 on Nov 6), of which §7.7 picked
  `NQ08 N4RH FQDL TE7S 8C66 65LT KYDU Q382 YG7U`. It signs and sends nothing. One `curl` warm-up
  first; the deliberate five-second timeout was never raised.
- `pnpm check:scenes` (new, `scripts/measure-scenes.mjs`, zero dependencies, **not** in the gate
  because the gate must pass without a browser): 64 scenes × 2 themes × {390, 375} = **256 frames,
  0 failures** — no element crossing the frame, no horizontal scroll, every interactive target
  ≥ 44 px. Record: `.cache/scene-measurements.json` (`measuredAt 2026-11-08T00:49:42Z`).
  Eyes on the welcome, squad page (light and dark), proof view, commit-pending and leave-confirm
  frames in `.cache/scenes/`.
- **First real database run.** A throwaway local PostgreSQL 18.6 cluster (port 55432, socket under the
  session scratchpad) took `pnpm db:migrate` for `001-auth`, `002-squads` and `003-invite-token`,
  and the whole lifecycle ran against it through the dev server as alice/bob/carol: create →
  `/squads` list → `/squads/[id]` detail → join by token → a commit refused for over-commitment →
  re-join → a guessed invite token refused → public `/proof/<shortId>` while signed out → leave →
  the member shown LEFT. The live JSON confirmed the mask: bob's `shortBy` was present for bob and
  `null` for alice. The cluster has been stopped and left in the scratchpad.

### Not verified by this slice
No wallet, no Nimiq Pay approval sheet, no staking transaction signed, sent, included or tracked
on any network, no mainnet, no real phone. The database that ran is a **local throwaway cluster,
not Neon**, so the PgBouncer-pooled concurrent-commit refusal is still unproven. The squad page's
member statuses came from real testnet reads of addresses that are not stakers (so NOT_STAKING)
and from scripted harness reads for the other five statuses. Mode A settlement (§7.6), the three
leaving wallet steps (§7.5), `GET /api/plan/:id`, the mock chain provider and Remotion remain the
next slice.

## Phone run on testnet — 2026-11-08 (first wallet run of this build)

**Reported by the human operator, not observed by the agent session that wrote this entry.**
On 2026-11-08, on **testnet**, from a real phone inside Nimiq Pay:

1. Sign-in: one wallet approval, session established, address derived from the verified key.
2. Create squad — **Together goals** (mode B, personal target, no recipient).
3. Commit needed stake, so the sheet offered **Create staker**; it was approved in Nimiq Pay
   and the provider returned a hash.
4. The hash was recorded in `tracked_txs` and polled through `GET /api/tx/:hash` until
   **`INCLUDED_OK`** — execution plus 60 confirmations, not a hash alone.
5. The squad page then showed that member as **BACKED**, derived from `getStakerByAddress`
   on the testnet node, with the age of the read beside it.

What this proves: the sign-in → create → create-staker → track → chain-derived-status path
works end to end against a real wallet and a real chain. `briefing/PROOF_PLAN.md`'s claim
"progress verified on-chain" is therefore **PROVEN on testnet**; **mainnet stays unproven**,
and so do the planner timing, the leaving steps and Mode A payments (none of them existed when
this run happened).

Identifiers (tx hash, staker address, squad short id, inclusion block) were **not captured in
this session**, so none are recorded here rather than invented; the run is not reproducible
from the repository. When the operator supplies them they go in verbatim, and the hash can be
re-read with `getTransactionByHash` to confirm the stated `executionResult`.

## Goal-day planner, leaving steps and Mode A payments — 2026-11-08

Plan: `~/.claude/plans/eager-purring-lagoon.md` (approved). This slice closes PRD §7.5 and
§7.6 and the screens §9.7–9.9. Of the protected critical path only `rpc.ts` was touched
(a per-hash cache, below); `member-status.ts`, `release.ts`, `commitments.ts`, `tx-tracker.ts`
and `rpc-schemas.ts` are byte-for-byte unchanged — `git status` was filtered to prove it.

### Mode audit (asked for first): already correct, nothing was swapped
Checked end to end against PRD §4: `createSquadInput` (discriminated on `mode`), the two
`CHECK` constraints in `migrations/002-squads.sql`, `createSquadService.create`,
`containers/create-squad.tsx` and `CreateSquadScreen.tsx`. **A = Shared goal** (one
`targetLuna` + a `recipient`), **B = Together goals** (a personal target, no recipient) in
every layer. No fix was needed, so none was made; `tests/unit/modes.test.ts` (3 tests) now
pins the contract, the service and the form's own words so a later edit cannot swap them
silently.

### Built
- `src/core/staking-actions.ts` (append-only) — `planLeaving` (active − amount, the shortfall
  against **all** commitments, and the other squads it would show short), `planRetire` (Q11),
  `planRemove` (Q12: fresh `retiredBalance`, fee 0), `paymentData` / `planPayment`.
- `src/core/leave-by.ts` — `leaveByShowFrom = leaveBy − 3 days`. Note this is three days before
  the **deadline**, so the banner opens a little over four days before goal day: earlier than
  "three days before the goal", deliberately the safe direction.
- `src/server/core/payment-check.ts` (Q15) — recipient, `value ≥ share`, `recipientData` equal
  to hex `sq:<short_id>`, `executionResult`, `confirmations ≥ 60`. **The sender is never read.**
- `src/server/core/leave-steps.ts` — the four-step machine with no I/O, so Q11 is decided by a
  pure function. `src/server/core/leave-plan.ts` — the plan: head, a **fresh** staker read, the
  release from the tracked inactivation's **inclusion block** (never `inactiveFrom`), the §7.6
  verdict and the roster. `src/server/core/settle.ts` — `paidRoster` and `settlePayment`, whose
  only write is a conditional `OPEN → COMPLETED` once every committed member is verified.
- Store/routes: `listTrackedTxs`, `listSquadTrackedTxs`, `namedCommitments`, `setSquadState`,
  `LISTED_SQUAD_STATES` (a completed squad stays on "My squads" but binds no stake),
  `GET /api/plan/[id]` (members only) and `POST /api/squads/[id]/pay`.
- Wallet: one `withProvider` helper behind the single module-level pending guard (Q13) now
  serves all six calls; `sendLeavingAction` and `sendPayment` added. No retries.
- UI (pure): `LeavingSteps`, `PayShareSheet`, `TxStatus`, WITHDRAWN/PAID in `status.ts`, the
  leave-by banner and payments roster on `SquadScreen`, payment hashes on `ProofScreen`,
  `formatMoment`/`countdown`/`zoneLabel` in `format.ts`, and 39 new scenes
  (22 leaving, 13 pay, 4 tx-status) plus three squad-page/proof ones.
- Containers `leaving.tsx` and `pay-share.tsx` re-read the plan before **every** tap, so the
  amount the wallet is handed is the balance the chain has now. Polling is `useTxPoll`
  (5 s × 24 → stop → manual re-check, never a resend). The time zone is read after mount and
  passed in as a prop, so `packages/ui` stays pure.

### `getTransactionByHash` now caches, but defaults to fresh
`rpc.ts` gained a per-hash cache so the paid roster (one read per payer, per page load) and the
planner's inclusion-block read stop re-asking for transactions that cannot change. Its `fresh`
defaults to **true**, unlike every other cached method: the tracker polls this every five
seconds and a 60 s cache would hand it the same answer twelve times. The display paths opt in
with `fresh: false`.

### What ran
- `pnpm gate` (log `.cache/leaving-gate-2026-11-08.log`): typecheck, lint, **100 unit tests,
  29 adversarial tests** (no skips), Next build (compiled clean in 27.5 s, 8/8 static pages, no
  warnings, **24 routes**), Q16 production-artifact guards, secret scan and 19 exact dependency
  pins across 5 manifests all passed. It **exited 1 only at `check:tracked`**, because these
  changes are uncommitted; the human commits. Nothing else in the gate failed.
- New tests: `modes` (3), `leaving-actions` (6: Q08 in four zones, `planLeaving`, Q11, Q12,
  §7.6), `payment-check` (3: Q15 accepted with three different senders, the six refusals, the
  mempool case), `leave-plan` (7, on the **recorded testnet** election/window/jail answers),
  `settle` (6), `ui-leaving` (7), `ui-screens` extended to 72 scenes; adversarial
  `payments` (4) and `leaving` (5).
- `LIVE_RPC=1 pnpm test:live` (log `.cache/live-2026-11-08-leaving.log`): passed first attempt,
  one test, zero skips, 6.8 s. Head 16,246,702; staker `NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD
  83R7`; validator `NQ35 YFBF ES7X R9PS 36R4 11FG 3HQF YL9Q NL2S`, `jailedFrom: null`;
  11 active validators, §7.7 picked `NQ08 N4RH FQDL TE7S 8C66 65LT KYDU Q382 YG7U`. New in this
  slice: the release was derived from a **real inclusion block** (3,140,555 → 3,204,811), and
  `checkPayment` ran against a real wire envelope and refused it with `PAYMENT_DATA_MISMATCH`.
  It still signs and sends nothing.
- `pnpm check:scenes` (record `.cache/scene-measurements.json`, `measuredAt
  2026-11-08T18:25:06Z`): **106 scenes × 2 themes × {390, 375} = 424 frames, 0 failures** — no
  element crossing the frame, no horizontal scroll, every tap target ≥ 44 px. Screenshots of
  seven of the new scenes are in `.cache/scenes/`; of those I looked at the countdown, the paid
  sheet and the partial roster (light and dark). The rest are measured, not inspected.
- **Fixture bug found by looking at a frame**: the countdown scene read "About any moment now
  to go" beside a release block the chain had not reached, because `demoRelease`'s estimate is
  anchored to `demoNow` (the squad page's clock) while the leaving scenes run on their own.
  The scene now re-anchors the estimate; it reads "About 12 h 59 min to go".
- **Second local-Postgres run** (a throwaway PostgreSQL 18.6 cluster on port 55432, now
  stopped), through `pnpm dev` against **live testnet** reads, as dev identities alice/bob:
  migrations 001–003 applied; squad created (Shared goal); bob joined by token; a commit was
  refused `NOT_STAKING` with `shortfallLuna 200000000` from a real staker read (head
  16,246,426); `GET /api/plan/:id` returned a real `headBlock` for a member, `NOT_A_MEMBER` for
  a non-member and `AUTH_REFUSED` signed out; a **real testnet transaction** tracked as a `pay`
  was refused `WRONG_RECIPIENT`, and a second real transfer — to the squad's own recipient, for
  far more than the share, executed and final — was refused **only** on the missing marker
  (`PAYMENT_DATA_MISMATCH`), with its unrelated sender never looked at. Bob borrowing alice's
  hash got `NOT_TRACKED`. The squad page, the public `/proof/<shortId>` and the plan all showed
  "0 of 1 paid" with the hash and the refusal code. `/squads/[id]/leaving` and
  `/squads/[id]/pay` rendered. The first settle attempt returned `CHAIN_UNAVAILABLE` on the
  cold five-second read and the retry returned the verdict — a failed read is never a
  settlement.

### Known rough edge
A `pay` transaction whose §7.6 verdict is already a definite refusal still shows as *pending*
until the tracker's own poll marks it `INCLUDED_OK`, because `deriveLeavingSteps` takes the
verdict as a boolean and checks the tracked state first. The sheet says "Checking the chain",
never "paid", and corrects itself on the next poll — but a mismatched marker is final the
moment the transaction executes, and the step could say so sooner.

### Not verified by this slice
No wallet, no Nimiq Pay approval sheet, and **no leaving or payment transaction has ever been
signed, sent, included or tracked** on any network. Every step of the exit above was exercised
with real chain *reads* and real HTTP and SQL, never with a real `setActiveStake`,
`retireStake`, `removeStake` or payment. So: no observed countdown against a real inactivation,
no retire at the real release block, no verified settlement, no squad has ever reached
COMPLETED outside a test, and mainnet remains untouched. The database is still a local
throwaway cluster, not Neon, so the pooled concurrent-commit refusal is still unproven.

### Phone click path — testing leaving and paying on testnet
Set `NEXT_PUBLIC_NIMIQ_NETWORK=testnet` (it must match the network Nimiq Pay is on) and have a
second testnet address to use as the recipient. On the phone, inside Nimiq Pay:
1. Open the mini app, **Sign in** — one approval.
2. **Create squad** → *Shared goal* (mode A). Put the second address in **Recipient**, and set
   goal day **two or three days out**, so the leave-by banner is already on.
3. **Commit** your share. Not a staker yet → the sheet offers **Create staker**; approve, then
   watch the status sheet until `INCLUDED_OK` (execution plus 60 confirmations, not the hash).
   The squad page should then show you **Backed**, with the age of the read beside it.
4. On the squad page the banner reads "Start leaving by …" in your own time zone. Tap
   **Start leaving** (`/squads/<id>/leaving`).
5. **Step 1 — Start leaving.** The field is pre-filled with your share. If you are in other
   squads, read the "This will show you short by …" warning first: it names them. Tap
   *Start leaving in Nimiq Pay* and approve (`sendSetActiveStakeTransaction`, the **remaining**
   active balance, fee 0.003 NIM).
6. **Step 2 — the wait.** The countdown comes from the chain: the reporting-window block after
   the election block after your inactivation's inclusion block. On testnet that is roughly
   half a day; the screen shows the release block and the head beside it, and *Confirm
   withdrawal* stays off until head ≥ release block. If your validator is jailed it says so and
   the date moves out. Leave the page and come back — nothing is lost.
7. **Step 2 again, once it opens.** Tick *I understand this cannot be undone*, then
   *Confirm withdrawal in Nimiq Pay* (`sendRetireStakeTransaction`, fee 0.003 NIM).
8. **Step 3 — Withdraw.** Approve (`sendRemoveStakeTransaction`, value = the **fresh** retired
   balance, fee 0 — the contract takes the fee out of it). The NIM is back in your wallet.
9. **Step 4 — Pay my share** (mode A only) → `/squads/<id>/pay`. Approve the basic transaction
   with data `sq:<short_id>`. The server then re-reads it and checks recipient, value, marker,
   execution and finality — it never matches the sender. The roster moves to "1 of N paid"; when
   every committed member is verified the squad reads COMPLETED.
10. Open `/proof/<short_id>` **signed out** (or from another phone) and check the payment hash
    on `test.nimiq.watch` yourself.
Things worth attacking while you are there: decline an approval (nothing changes), force a
retire before the release block (it comes back failed, nothing lost), pay one luna less than
your share (refused, and the sheet says the NIM did leave), and pay with no marker from a
wallet directly (not counted).

### Next
- The three leaving steps and a Mode A payment **on a real phone on testnet**, then mainnet.
- Neon through the pooler, including the concurrent-commit refusal.
- The mock chain provider (`?chain=mock`) and Remotion; §9.11–12 fiat and earned (P1).
- Consider passing the §7.6 refusal code (not a boolean) into `deriveLeavingSteps`, per the
  rough edge above.

## Pools, earnings, fiat, five languages, templates, two deployments — 2026-11-08

The six-part request after the leaving/payments slice. Nothing that existed was rebuilt: the
chain reader, release math, member status, commitments, the tracker and the payment check were
read first and left alone. **No protected file was modified** — `git status` shows
`member-status.ts`, `release.ts`, `commitments.ts`, `tx-tracker.ts`, `payment-check.ts`,
`rpc-schemas.ts`, `staking-actions.ts`, `app/api/auth/verify/route.ts` and every existing file
in `src/wallet/` unchanged. One **new** file was added under `src/wallet/`: `host.ts`, which
wraps the SDK's `getHostLanguage()` / `getHostFiat()`. Neither is a provider call — they need
no approval and move nothing — but they touch `window`, so they live with the SDK.

### 1 · Pool-aware validator choice (PRD §7.7)
Source, quoted with file and line in `apps/web/src/server/lib/pool-directory.ts`:
github.com/nimiq/validators-api — the endpoints from its README (lines 22–23, 111–117) and the
fields from `server/utils/schemas.ts` `validatorSchema` (lines 5–12) and
`server/utils/types.ts` `PayoutType` (lines 4–8, `restake | direct | none`). Both hosts live in
the new `apps/web/src/config/network.ts`, keyed by `NEXT_PUBLIC_NIMIQ_NETWORK`.

- `createPoolDirectory` — 10-minute cache, 5 s abort, failures never cached, an empty list
  treated as a failed read (otherwise "no pool pays anything" would make everything ineligible).
- `choosePoolValidator` (appended to `validator-choice.ts`; the old `chooseValidator` is
  untouched and is now the documented fallback) — active, not jailed, not retired, **and**
  listed by Nimiq with a payout type other than `none`; then fewest Squad Stake members, with
  the address as the deterministic tie-break.
- The spread count is read from the chain in `squad-view.ts` (`membersPerValidator`): one
  cached staker read per current member address, capped at `SPREAD_SAMPLE_LIMIT` 200. Nothing
  about a delegation is stored, so the count cannot drift from the chain. The honest reason it
  is not stored: the only place that could write it truthfully is the protected tracker.
- Unreadable API → the chain-only rule picks, and `PoolCard` renders `fallback: true`: the
  title "Pool details unavailable", no fee, no payout type, and a sentence saying the choice
  came from chain data alone.
- The pool is shown **only** on the action that joins a validator (`not-staking`, or
  `needs-stake` with `action: 'create'`); adding to an existing stake keeps its delegation and
  shows nothing.
- If nothing qualifies, the delegation stays null and `staking-actions.ts` (unchanged) blocks
  with `NO_VALIDATOR`, which now has catalogue words in all five languages.

### 2 · Earned since joining (PRD §9.12, spike S4b) — and S4b is closed
`server/core/earned.ts` is pure; `member-earned.ts` assembles its inputs.
- **restake**: active balance − every deposit this app watched land (`create`/`add`,
  `INCLUDED_OK`, across every squad, because one address has one stake).
- **direct**: the sum of transfers from the pool's payout address since the member joined.
- Eight named reasons for "—" and no estimate branch: `NOT_STAKING`, `NO_POOL_DATA`,
  `PAYOUT_ADDRESS_UNKNOWN`, `PAYS_NOTHING`, `OUTSIDE_STAKE`, `UNTRACKED_DEPOSIT`, `LEAVING`,
  `CHAIN_UNAVAILABLE`. A deposit with no verdict is `UNTRACKED_DEPOSIT` (a hash is not success
  and not failure); a staker this app did not create is `OUTSIDE_STAKE`; any non-failed
  leaving transaction is `LEAVING`.
- **S4b's answer is negative, and that is the finding.** Nimiq's validator data publishes **no
  payout address** — verified in `schemas.ts`, `types.ts`, the per-validator files under
  `public/validators/`, and in both live payloads (21 mainnet, 13 testnet validators, 0 with
  one). So a direct pool's payouts cannot be told apart from any other incoming transfer and
  the screen says exactly that. The branch is written and tested, and will measure the day a
  pool publishes an address. Recorded in `briefing/REALITY_SPIKES.md`.
- **Privacy**: earned is computed and sent **only for the member looking at the page**, and is
  null for every other row and on the public proof view — earned plus the deposits it was
  measured against is that member's active balance. Same rule as `SHORT.shortBy`.
- The reason crosses the wire as a code, never a sentence, so the words follow the language.
  The "why" is a `<details>`/`<summary>` disclosure: one tap, no JavaScript, deterministic for
  Remotion. `scripts/measure-scenes.mjs` now counts `summary` as a tap target.

### 3 · Fiat estimates (PRD §9.11)
`server/lib/price.ts` + `GET /api/price?currency=XXX`: CoinGecko's keyless
`simple/price?ids=nimiq-2` (`nimiq` is the pre-2018 asset), 10-minute cache per currency,
5 s abort. A failed read, a non-positive quote or a currency CoinGecko does not quote answers
503 and the screen shows **nothing** — there is no stale-price fallback. `useFiat()` reads the
currency after mount from `getHostFiat()`, so the estimate follows Nimiq Pay; outside Nimiq Pay
and on the public proof page there is no estimate at all, because nobody has said a currency.
Every figure reads `≈ … · estimate` with the source and the price's age beside it.
Of Nimiq Pay's four currencies CoinGecko quotes USD, EUR and CRC but **not GMD**; a GMD user
sees no estimate rather than a figure in a currency they did not choose.

### 4 · Five languages: en, es, de, fr, pt (PRD §10)
One catalogue in `packages/ui/i18n/`, ~460 entries per language in three files of English
(`en-core`, `en-screens`, `en-features`) and one file per other language, each declared
`const de: Strings = {…}` — so a missing, renamed or wrong-arity key fails `pnpm typecheck` in
every language. Entries that interpolate are **functions**, not placeholder templates.
- **No `Intl` anywhere.** Separators, month names, percent spacing and the countdown words live
  in each catalogue's `fmt` section, because ICU data differs between a browser and the
  Remotion renderer and the video has to match the app glyph for glyph.
- The error catalogue now holds only the non-language flags (`retryable`, `changedAnything`);
  its words come from the same catalogue, and a test pins that the flags do not vary by
  language and that an unknown code still degrades to `UNAVAILABLE`.
- Language = Nimiq Pay's `getHostLanguage()`, then the browser, then English. The server
  guesses from `Accept-Language` (RFC 9110 §12.5.4 parser, q-weights, `*` and `q=0` dropped)
  so the first paint and `<html lang>` are right; `useLang` switches after mount.

### 5 · Squad templates (PRD §10)
Trip, gift, gadget, rent buffer and event, each filling the mode, a name in the member's own
language and a suggested date (120/30/60/30/90 days, all well past `GOAL_MIN_AHEAD_MS`), plus a
"start from scratch" chip. **A template never fills the recipient address** — the one field
where a suggestion could cost money. The dates come from the server's clock
(`templateGoalDates(now)`) so the first paint and the hydrated screen agree.

### 6 · Two deployments from one repository
`apps/web/src/config/network.ts` is now the only place a chain-specific value exists: RPC node,
explorer base and Validators API, keyed by `NEXT_PUBLIC_NIMIQ_NETWORK`. `rpc-client.ts`, the
proof page and the leaving/pay pages were changed to read it; the duplicated per-network maps in
those three pages are gone. README "Deploy" gained a two-deployment section: two Vercel
projects, two Neon branches, their own `APP_ORIGIN`, the same commit deployed twice, and the
table of what differs. `tests/unit/network-config.test.ts` asserts the switch **and scans every
`.ts`/`.tsx` under `apps/web/app` and `apps/web/src` for a hardcoded endpoint outside that one
file** (comments may still record where a recording came from).

One asymmetry left deliberately unchanged: `serverEnv()` defaults an unset network to
`testnet`, while `src/wallet/network.ts`'s `appNetwork()` defaults to `mainnet`. Either way the
host guard's comparison fails and actions stay blocked, so the asymmetry is safe — but it is in
protected wallet code, so it was reported rather than quietly changed.

### What ran, and what did not
- New code: `src/config/network.ts`, `server/lib/{pool-directory,price}.ts`,
  `server/core/{earned,member-earned}.ts`, `app/api/price/route.ts`, `hooks/use-fiat.ts`,
  `src/i18n/{accept-language,server,client}.ts`, `src/wallet/host.ts`,
  `packages/ui/{i18n/*,earned.ts,fiat.ts,templates.ts,PoolCard.tsx}`,
  `packages/ui/scenes/features.ts`. Changed: `validator-choice.ts` (append-only),
  `squad-detail.ts` (one optional dependency), `squad-view.ts`, `squad-store.ts` +
  `core/squads.ts` (`joinedAt`, `trackedTxsForAddress`, `activeMemberAddresses`),
  `view-contract.ts`, `squad-contract.ts`, the error catalogue, every screen in
  `packages/ui` (a `lang` prop) and all nine pages.
- **22 new scenes** (`pool-restake`, `pool-direct`, `pool-fallback`,
  `pool-not-shown-when-ready`, `earned-measured`, `earned-unknown`, `fiat-estimate`,
  `fiat-and-earned`, `fiat-my-squads`, `templates-offered`, `templates-picked`, and
  `lang-{es,de,fr,pt}-{commit,squad,create}`), registered on `/scenes`.
- **New tests, all passing: 123 unit (was 100) and 34 adversarial (was 29).**
  `pools` (5: the recorded payload, the 10-minute cache, failing closed, pool-aware choice
  and spread, the fallback rule), `earned` (3, every reason), `price` (3), `i18n` (5: the
  catalogue shape across five languages with no English left in them, language negotiation,
  the no-`Intl` formatting, the error catalogue, the templates), `ui-features` (5),
  `network-config` (2, including the source scan), and adversarial `features` (5: a hostile
  directory, a lying spread count, a lying price source, the earned privacy mask, and a
  handcrafted reason code).
- **Recorded HTTP fixtures** with provenance in `tests/fixtures/http/README.md`:
  the whole testnet Validators API payload and a CoinGecko quote, both unmodified.
- `pnpm gate` — **typecheck, lint, 123 unit tests and 34 adversarial tests all passed (no
  skips)**, and then the run was **killed by the harness during `next build` because the
  machine ran low on memory**. So in this session the Next build, `test:production`, the
  secret scan, `deps:check` and `check:tracked` **did not run**: the gate is *not* green yet
  and must be re-run from a clean tree. (An earlier run of the same gate failed at the unit
  tests on a real bug — `backTo` used before initialization in `scenes/features.ts`, a `const`
  arrow in the temporal dead zone — which is now a hoisted function declaration.)
  Log: `.cache/features-gate-2026-11-08.log`.
- `LIVE_RPC=1 pnpm test:live` (log `.cache/live-2026-11-08-features.log`): **two tests, zero
  skips**, after one `curl` warm-up of the three hosts (the first attempt timed out on the
  cold read at the deliberate five seconds, the same behaviour as every earlier slice; the
  timeout was never raised). The existing RPC test still passes: head 16,252,929, staker
  `NQ14 TEMC ANU0 CELF GBTQ GN3R 86L9 CXDD 83R7`, validator
  `NQ35 YFBF ES7X R9PS 36R4 11FG 3HQF YL9Q NL2S` with `jailedFrom: null`, release from a real
  inclusion block 3,140,555 → 3,204,811, `PAYMENT_DATA_MISMATCH` on a real transfer.
  The **new** live test read Nimiq's testnet Validators API and CoinGecko:
  **13 pools listed, payout types `restake` and `direct`, 0 publishing a payout address**;
  11 active validators; §7.7 chose `NQ08 N4RH FQDL TE7S 8C66 65LT KYDU Q382 YG7U`
  ("Not-A-Pool", fee 0.11, restake); with that pool marked full the spread moved to
  `NQ24 DJE3 KX3U HG5X 1BXP 8XQ3 SK7S X364 N7G7`; EUR per NIM 0.00024088; GMD `NO_QUOTE`.
  It signs and sends nothing.
- `pnpm check:scenes` against the dev server: **129 scenes × 2 themes × {390, 375} = 516
  frames, 0 failures** — nothing crossing the frame, no horizontal scroll, every tap target
  (now including `summary`) at least 44 px. Record: `.cache/scene-measurements.json`
  (`measuredAt 2026-11-08T20:47:46Z`). Looked at `pool-restake`, `earned-unknown` and the
  German commit sheet in both themes; the French squad page, `fiat-and-earned`,
  `templates-offered` and `pool-fallback` are measured and screenshotted but not inspected.
  **Caveat:** two small text edits landed *after* that measurement — the `NO_VALIDATOR`
  wording (no scene renders it) and the localised back label in the twelve `lang-*` scenes
  (one short word per frame, e.g. "Squads" → "Escuadras"). Those twelve scenes should be
  measured again with the gate.

### Not verified by this slice
No wallet, no Nimiq Pay approval sheet, no phone, no mainnet, and **no staking transaction has
ever been sent with a pool-aware delegation**. No database was touched in this session at all:
`joinedAt`, `trackedTxsForAddress` and `activeMemberAddresses` are proven against the in-memory
twin only, and the SQL behind them has never run — the next database run must exercise them.
The fiat estimate has never been seen inside Nimiq Pay, so `getHostFiat()` returning a real
currency is unproven; the same is true of `getHostLanguage()` driving the language. The
direct-pool branch of "earned" cannot be proven at all until some pool publishes a payout
address. Nothing here has been deployed, so the two-deployment section of the README is a
written procedure, not an observed one.

### Next
- Re-run `pnpm gate` from a clean tree (it stopped at the build for lack of memory) and
  `pnpm check:scenes` for the twelve `lang-*` scenes.
- The three leaving steps and a Mode A payment on a real phone on testnet, then mainnet.
- Neon through the pooler, including the concurrent-commit refusal and the three new queries.
- The mock chain provider (`?chain=mock`) and Remotion.
- Consider passing the §7.6 refusal code (not a boolean) into `deriveLeavingSteps`.

## Original logo, and the Vercel build that was failing — 2026-11-09

No protected file was touched. The whole slice is `packages/ui/brand/`, two scripts, the
metadata wiring and one test file.

### The deploy of `bc8d748` was failing, so production still showed the old mark
Reported from the Vercel dashboard: commit `bc8d748` ("ui revamp"), production, **Build
Failed**, `pnpm build` exited 1 in 24 s at "Linting and checking validity of types":

```
./app/manifest.ts:23:9
Type error: Type '"any maskable"' is not assignable to type
'"any" | "maskable" | "monochrome" | undefined'. Did you mean '"maskable"'?
```

The web app manifest spec allows `purpose` to be a space-separated list, but Next's
`MetadataRoute.Manifest` types it as one member of the enum. `app/manifest.ts` now lists each
icon size twice, once per purpose, which says the same thing to a launcher and typechecks.

Because that build never completed, the live site was still serving the **last successful**
deployment, which predates the logo — that is why the landing page still showed the old `s.`
hexagon tile. The tile itself is gone from the source and from `HEAD`: `ScreenHeader.tsx` was
its only home, and nothing in the repository renders a single-letter mark now.

This was my own failure to re-run the gate after adding `app/manifest.ts`; the previous
session reported typecheck as "not re-run since", and this is what it would have caught.
A second instance of the same gap: `tests/unit/brand.test.ts` destructured
`String.matchAll`, which is `string | undefined` under `noUncheckedIndexedAccess`. Both are
fixed and `pnpm typecheck` now exits 0.

### The mark
Original geometry, drawn in code, no imitation of Nimiq's hexagon or the Nimiq Pay mark:
a warm goal at the centre, three member discs on a ring that breaks at each seat — a group
around one shared goal, each keeping their own part. Two colours plus Nimiq's warm gradient.

- `packages/ui/brand/shapes.ts` is the **single source of the drawing**. `LogoMark`, `Logo`,
  `AppIcon` (React) and `svg.ts` (string serialiser for the exported files) all read it, so
  the app and the assets cannot drift. A test compares them shape for shape.
- Five tones (`tone.ts`): full colour on dark, full colour on light, one-colour white,
  one-colour navy, and `colour-current` whose ink is `currentColor` — used **only** in the
  app, so one header drawing serves both themes; the export script never asks for it.
- The lockup's "Squad Stake" is **outlines, not live text**: `scripts/build-wordmark.mjs`
  converts the exact Mulish 700 `.woff2` this repo self-hosts into a path
  (`woff2_decompress` to TTF, then a `glyf`/`cmap`/`loca`/`hmtx` reader written in the
  script — **no new dependency**) and writes `packages/ui/brand/wordmark.ts`, which is
  checked in, so the gate never needs the tool. 11 glyphs, advance 6039/1000 em. The
  generated file carries the SHA-256 of the font it came from, and a test asserts that hash
  is present and that no `<text>` or `font-family` survives in the mark.
- `ScreenHeader` now renders `Logo` (no back control) or `LogoMark` alone (beside one),
  replacing the `s.` tile on every screen. The dead `--mark-*` tokens are gone from
  `tokens.css`.

### Exported assets — `pnpm brand:export` (`scripts/export-brand.mjs`)
Rasters are screenshots of the generated SVGs taken with the system Chromium this repo
already drives for scene measurement, so no image library entered the project; the `.ico` is
assembled by hand (header + directory + embedded PNG payloads). All in
`apps/web/public/brand/`:

| File | Bytes |
|---|---|
| `logo.svg` / `logo-on-dark.svg` | 7,222 each |
| `logo-white.svg` / `logo-navy.svg` | 7,057 each |
| `logo-mark.svg` / `logo-mark-on-dark.svg` | 859 each |
| `logo-mark-white.svg` / `logo-mark-navy.svg` | 694 each |
| `app-icon.svg` | 959 |
| `icon-16.png` · `icon-32.png` · `icon-180.png` | 544 · 1,244 · 14,429 |
| `icon-192.png` · `icon-512.png` · `icon-1024.png` | 15,449 · 78,571 · 233,465 |
| `logo-on-dark.png` · `logo.png` (256 px tall) | 32,151 · 42,691 |
| `favicon.ico` (16 + 32) | 1,826 |

Wired into `app/layout.tsx` (`metadata.icons`) and the new `app/manifest.ts`. I inspected
`icon-512.png`, `icon-32.png` and `logo.png` by eye; the rest are generated from the same
shapes and pinned by the staleness test below.

### Two Chromium scripts were leaking profiles
`measure-scenes.mjs` and `export-brand.mjs` never removed their `--user-data-dir`, which left
~165 MB per run in a RAM-backed `/tmp` (32 stale profiles, ~3.1 GB, found today). Both now
wait for the child to exit and then remove the profile with retries (removing it mid-flush
fails `ENOTEMPTY`), and the browser-start timeout is 20 s → 60 s, because a tool timing out
on its own browser says nothing about the thing being measured.

### What ran
- `pnpm typecheck` — exit 0 (after the two fixes above).
- `pnpm lint` — exit 0.
- `pnpm test` — **129 unit tests**, 0 failures, 0 skips (was 123; +6 brand).
- `pnpm test:adversarial` — **34 tests**, 0 failures, 0 skips.
- `pnpm build` — exit 0, compiled clean, **26 routes**, `/manifest.webmanifest` prerendered
  static. This is the command Vercel ran and failed.
- `pnpm test:production` — Q16 guards pass. `pnpm secrets` — pass.
  `pnpm deps:check` — 19 exact pins across 5 manifests, all ≥ 14 days old.
- `pnpm check:tracked` — **exit 1**, because this slice is uncommitted. The human commits.
  Nothing else in the gate failed.
- New `tests/unit/brand.test.ts` (6): React vs exported-file geometry for all four tones and
  the icon's safe area; brand-colours-only painting, and no gradient reference in a
  one-colour variant; 16 px survivability (stroke ≥ 6 units, discs proud of the links,
  nothing touching the box edge); wordmark provenance by font hash; Q17 determinism of the
  three brand scenes; and a **staleness guard** comparing all nine
  `apps/web/public/brand/*.svg` files to what the serialiser produces today, so an edit to
  the shapes without a re-export fails the gate.

### Not verified by this slice
`pnpm check:scenes` **has not run** since the header changed, so every frame in
`.cache/scenes/` still shows the old `s.` tile and no screen has been re-measured with the
new header box. The three brand scenes (`brand-logo`, `brand-mark`, `brand-icon`) have never
been measured or screenshotted. The machine's `/tmp` is a RAM-backed tmpfs still holding the
stale Chromium profiles described above plus two orphaned browsers, and ~1.4 GB of 7.7 GB is
free, so the browser could not be started; the cleanup needs the operator. Nothing here has
been deployed, so the Vercel fix is verified only by `pnpm build` locally.

### Next
- Free `/tmp`, then `pnpm check:scenes` over every scene (the header moved on all of them)
  plus the three brand scenes, and look at the welcome, squad page and brand frames.
- Re-deploy and confirm the production landing page shows the new mark.
- Then the full UI restyle against `docs/design/style1.png` and `style2.png`.

## Three defects from the testnet phone run — 2026-11-09 (Slice A)

Plan: `~/.claude/plans/quizzical-swinging-magpie.md` (approved). Of the protected critical path
only `apps/web/src/core/staking-actions.ts` was modified (A2 below, with a `docs/DECISIONS.md`
entry); `member-status.ts`, `release.ts`, `commitments.ts`, `tx-tracker.ts`, `payment-check.ts`,
`rpc-schemas.ts` and every existing file in `src/wallet/` are unchanged — `git status` was
filtered on those paths to prove it.

**Asked first: had Batch 2 or the redesign already changed this code?** No. `tx-tracker.ts` has
not been touched since `dc094b6`. `squad-detail.ts`, `SquadScreen.tsx`, `MemberList.tsx` and
`containers/squad.tsx` were last touched by `ee338bc`, and `git show ee338bc` on those paths
shows only the `lang` prop, the `earned` field and re-worded strings — the `pending`,
`backedLuna` and banner logic was byte-identical in behaviour. The `style1.png`/`style2.png`
restyle has not started. So all three findings were live defects.

### 1 · "Transaction pending · 0 of 60 confirmations" — root cause, and it was none of the four guesses
Not a wrong hash, not a miscount, not a missing field, not a stale node. Verified against the
live testnet node: a real `setActiveStake` returns `executionResult: true` and a six-figure
confirmation count, so the field is present and correct. The fault was ours, in three places:

1. `squad-detail.ts` built `pending` from `latestOpenTrackedTx`, which returns only `{ state }`
   out of Postgres, and **hardcoded `confirmations: null`**. The squad page never read the
   transaction at all.
2. `MemberList.tsx` rendered `member.pending.confirmations ?? 0` — printing *unknown* as the
   digit **0**. The "0" was never a count; it was a null with a `?? 0` on it, which is exactly
   what AGENTS.md "Never fabricate" forbids.
3. **Nothing ever advanced the row.** `tracker.check` ran only from `GET /api/tx/:hash`, which
   only `useTxPoll` calls, and `containers/squad.tsx` did not use it. `tracked_txs.state` stayed
   `SUBMITTED` forever and a reload could not fix it, while `MemberStatusBadge` read the staker
   record directly and correctly said UNSTAKING — hence the contradiction the phone showed.

**Latent fourth bug from the same cause:** `overlay()` grants WITHDRAWN only when a `remove` tx
reached `INCLUDED_OK`, so with nothing advancing tracked state WITHDRAWN could never appear.

Fixed with a new pure module `apps/web/src/server/core/pending-view.ts`, deliberately **not**
inside the protected `tx-tracker.ts`: the tracker sees one transaction and must stay the single
judge of execution and finality, and a transaction legitimately has 0 confirmations for a moment
after inclusion. What is impossible is 0 confirmations *while its effect is on the chain*, and
only the caller sees both. `stakeEffectSeen` derives that per kind from the staker record the row
already read (`unstake` → inactive > 0, retired > 0, or no staker left; `retire` → retired > 0;
`remove` → the staker is gone, or retired fell to 0 after a tracked retire). `create`, `add` and
`pay` are **never** inferred from a balance — an active balance cannot tell this app's deposit
from any other transfer, and guessing is what caused the bug. `squad-detail.ts` now takes a
`tracker` dep and calls `check(hash)` for an open tx, so the real verdict and count reach the
row *and* the DB row advances, which is also what makes WITHDRAWN reachable. `packages/ui/pending.ts`
words a null count instead of printing a digit.

### 2 · "Start leaving" offered after leaving had started
`SquadScreen` keyed the banner off time alone. It now takes the viewer's own exit stage, and any
stage but `none` replaces the invitation with the countdown ("Your 150 NIM unlocks in about
14 h 12 min") plus a *View progress* link, rendering **no** start control. The real guard is in
`planLeaving` (`src/core/staking-actions.ts`, the one protected file touched): a new
`ALREADY_LEAVING` refusal when inactive > 0, retired > 0, or an unstake is still open, with the
three inputs **required** rather than optional so a caller cannot silently lose the guard. This
matters beyond the screen: `sendSetActiveStakeTransaction` takes the *resulting* active balance,
not a delta, so a second send from a stale page could inactivate an amount the member never chose.
The release estimate the squad page used to pass as `null` now comes from a shared
`server/core/member-release.ts`, lifted out of `leave-plan.ts`, so the squad page's countdown and
the leaving screen's cannot disagree.

### 3 · "0 NIM backed" while a member was leaving on schedule
`server/core/squad-stages.ts` (mirrored for fixtures and the video by `packages/ui/progress.ts`)
splits the squad total into backed / leaving / ready (RELEASABLE + RETIRED) / withdrawn / paid /
missing (SHORT + NOT_STAKING) / unread, LEFT excluded. `coveredLuna` = backed + leaving + ready +
withdrawn + paid is the orbit centre's figure, so a gap appears only for a member who is genuinely
short or not staking. The line reads "0 NIM saved · 150 NIM leaving (ready in ~14 h 12 min)".
`ProofScreen` uses the same wording so the public view cannot contradict the member's.
PRD §7.4's own `backedLuna` is unchanged and still 0 — the stages sit beside it, not instead of it.

### Real chain evidence (the operator's address and hash were placeholders in the request)
Found live on testnet by reading the staking contract's own transaction history and following
`08`/`09` transactions back to their senders — a staker in exactly the reported shape:

| | |
|---|---|
| Staker | `NQ22 11TS NJ8N BMD0 UVUM E0KL 2RPU NHM1 2RS8` |
| Record | active **0**, inactive **11,000,000** luna, `inactiveFrom` 16,251,210, retired 0 |
| Its `setActiveStake` | `0ad4e4a1…` block 16,208,043, `executionResult: true` |
| A real **included-but-failed** retire | `70a282c0…` block 16,172,568, `executionResult: false` |

The failed retire gives `tx-tracker`'s `INCLUDED_FAILED` branch its first *real* response; it was
only ever tested from derived fixtures before. And `inactiveFrom` (16,251,210) sits **43,167
blocks after** the inactivation's inclusion block (16,208,043), confirming live that
`inactiveFrom` is an effective election block and must never be fed to `calculateRelease` as an
inclusion block (AGENTS.md invariant 5). All three envelopes are recorded in
`tests/fixtures/rpc/testnet.json` with `recordedAt: 2026-11-09T06:48:51.141403Z`; provenance in
its README.

### What ran
- `pnpm gate` (log `.cache/defects-gate-2026-11-09.log`): typecheck, lint, **141 unit tests and
  36 adversarial tests, 0 failures, 0 skips** (was 129/34), Next build compiled clean in 17.7 s
  (10/10 static pages, 26 routes, no warnings), Q16 production-artifact guards, secret scan and
  19 exact dependency pins across 5 manifests all passed. It **exited 1 only at `check:tracked`**,
  because this slice is uncommitted; the human commits. Nothing else in the gate failed.
- New tests: `pending-view` (4, on the real recorded envelopes parsed through the production
  schemas — including the exact shape the phone was in: SUBMITTED, no count read, inactive stake
  visible, which must yield `INCLUDED_CONFIRMING` with a null count and never "0 of 60");
  `squad-stages` (7, including one that drives `squadDetail` end to end and proves the release
  comes from the inclusion block, not from `inactiveFrom`, and one that runs the UI mirror and the
  server split over the same rosters so fixtures cannot drift); adversarial `leaving` +2 (a second
  inactivation is impossible once leaving has started; the leaving screen never offers step one
  again); `ui-screens` +1 ("the three defects found on testnet cannot render again").
- **8 new fixture scenes** in `packages/ui/scenes/squad-page.ts`: `-leaving-countdown`,
  `-leaving-unread-count`, `-leaving-release-unknown`, `-leaving-ready`, `-leaving-jailed`,
  `squad-page-withdrawn`, `squad-page-share-paid`, `squad-page-every-stage`. 80 scenes registered.
- `LIVE_RPC=1 pnpm test:live` (log `.cache/live-2026-11-09-defects.log`): **3 tests, 3 passed,
  0 skips**, after one `curl` warm-up (the first attempt failed on the deliberate five-second
  abort in the pre-existing pools test; the timeout was never raised). Live values printed:
  head 16,292,468; `NQ22 11TS …` balance 0, inactiveBalance 11,000,000, inactiveFrom 16,251,210,
  delegation `NQ35 YFBF ES7X R9PS 36R4 11FG 3HQF YL9Q NL2S`; `0ad4e4a1…` blockNumber 16,208,043,
  confirmations **84,427**, `executionResult: true`; derived release
  `{ releaseBlock: 16294411, remainingBlocks: 1943, estimatedReleaseAt: 1794210941416, jailed: false }`;
  `70a282c0…` blockNumber 16,172,568, `executionResult: false`. It signs and sends nothing.
- A throwaway local **PostgreSQL 18.6** cluster (port 55432, data directory in the session
  scratchpad) took `pnpm db:migrate`: **`001-auth`, `002-squads`, `003-invite-token` applied**,
  six tables present (`challenges`, `memberships`, `schema_migrations`, `sessions`, `squads`,
  `tracked_txs`). Note for the next session: the cluster must run **TCP-only**
  (`-c unix_socket_directories=''`), because the scratchpad path exceeds Postgres's 107-byte
  Unix-socket limit.

### Fixture and process bugs found on the way
- A countdown scene read "About any moment now to go" beside a release block the chain had not
  reached, because its release estimate and `readAt` were anchored to `demoNow` while the scene
  ran on `demoLeaveBy − 2 days` — the same class of fixture bug the 2026-11-08 session found.
  Re-anchored; it now reads "Your 2,000 NIM unlocks in about 12 h 59 min".
- A temporal-dead-zone error (`DEMO_HEAD` used before its declaration) in `scenes/squad-page.ts`,
  the third instance of this class in this repo. Hoisted.
- **My own process mistake, worth not repeating:** `pnpm -s typecheck 2>&1 | head -12` printed
  nothing while the root typecheck actually exited 2 with four errors. A pipe through `head`
  hides the exit status. Checks are now run as
  `pnpm typecheck >/dev/null 2>&1; echo "exit=$?"`.

### Verification completed — scenes, and the first run against a database

- **`pnpm check:scenes`** (record `.cache/scene-measurements.json`, `measuredAt
  2026-11-09T10:48:29Z`, log `.cache/scenes-2026-11-09.log`): **140 scenes × 2 themes ×
  {390, 375} = 560 frames, 0 failures** — nothing crossing the frame, no horizontal scroll,
  every tap target ≥ 44 px. This is the **first full measurement since the logo changed every
  screen's header** (the outstanding item from 2026-11-08), and it covers the 8 new scenes and
  the 3 brand scenes, which had never been measured. Inspected
  `squad-page-leaving-countdown` (light) and `squad-page-every-stage` (dark) — both now read
  "2,500 NIM saved · … leaving (ready in ~12 h 59 min) · … missing", show the countdown banner
  with no second *Start leaving*, and put the covered total (5,600 of 12,000) in the orbit.
- Three obstacles cleared first, recorded so the next session need not rediscover them:
  `/tmp` held 36 leaked Chromium profiles (operator cleared them, 3.0 GB freed); **port 3000 is
  held by an unrelated application** that 307-redirects to `/login`, so the harness runs on
  3100; and `SCENES_URL=… pnpm check:scenes` does **not** propagate the variable through pnpm —
  run `node scripts/measure-scenes.mjs` directly.

### The database run found a fourth defect, of the same family

A throwaway local **PostgreSQL 18.6** cluster (port 55432, data directory in the session
scratchpad) took `pnpm db:migrate` — `001-auth`, `002-squads`, `003-invite-token` applied, six
tables. *Note:* the cluster must run **TCP-only** (`-c unix_socket_directories=''`), because the
scratchpad path exceeds Postgres's 107-byte Unix-socket limit.

Driven through `pnpm dev` on port 3100 against **live testnet** reads, as dev identity alice:
sign-in, squad created (Shared goal, real recipient), and a commit refused `CHAIN_UNAVAILABLE`
on the cold five-second read — a failed read is never a verdict — which the usual `curl` warm-up
resolved. Then the row was put into **exactly the state the phone was in**: a `tracked_txs` row
at `SUBMITTED` with `checked_at NULL`, carrying the real executed hash `0ad4e4a1…`.

- **One page load of `GET /api/squads/:id` advanced it in SQL** to `INCLUDED_OK` with
  `checked_at` set, and `pending` came back
  `{ phase: 'FINAL', confirmations: 96889, requiredConfirmations: 60 }` — the live node's own
  count, never "0 of 60". That is defect 1 fixed, proven in Postgres rather than against the
  in-memory twin.
- **Then the new finding.** With the row tracked as a `remove`, the member stayed `NOT_STAKING`
  on that load and only became `WITHDRAWN` on the **next** one. Cause: `memberRow` reads the
  tracked rows, *then* the tracker checks the open one and writes the verdict back, so `overlay`
  judged WITHDRAWN by the state the request started with. One load behind is still a page
  contradicting the chain it just read — the same defect as the confirmation count, one layer
  down, and the in-memory twin never showed it because no test had ever settled a `remove`.
  Fixed: `pendingFor` now returns the settled state alongside the view, and `memberRow` hands
  `overlay` the rows **as they stand after** the check. Re-run from the same seeded state,
  WITHDRAWN now appears on the first load, with `withdrawnLuna` and `coveredLuna` both counting
  the share and `missingLuna` zero.
- New test `§7.4 a withdrawal shows on the page load that settles it, not the one after`.
  It was verified to be meaningful: with the one-word fix reverted it fails on
  `the first load, not the second`, and passes with it restored.

### What ran after that fix
- `pnpm gate` (log `.cache/defects-gate-2026-11-09b.log`): typecheck, lint, **142 unit tests and
  36 adversarial tests, 0 failures, 0 skips**, Next build compiled clean in 30.6 s (10/10 static
  pages, no warnings), Q16 production-artifact guards, secret scan and 19 exact dependency pins
  all passed. **Exit 1 only at `check:tracked`**, because the slice is uncommitted.
- `git status` over the protected critical path still shows **only**
  `apps/web/src/core/staking-actions.ts` modified.

### Not verified by this slice
- The member statuses in the database run came from **real testnet reads of an address that is
  not a staker** (so NOT_STAKING), plus a seeded tracked transaction. The chain-derived UNSTAKING
  / RELEASABLE / RETIRED path still has no live counterpart here, because the dev mock chain
  provider (`?chain=mock`) is still unimplemented and alice cannot be made into a staker without
  a wallet. Those statuses remain proven by the recorded-envelope tests only.
- The `remove` row was seeded with a real executed hash that is, on the chain, a
  `setActiveStake`. The tracker judges execution and finality and does not read the transaction
  *type*, so this exercises the real SQL and the real verdict path honestly — but it is not a
  real withdrawal.
- No wallet, no Nimiq Pay approval sheet, no phone, no mainnet, and no staking transaction
  signed or sent by this build on any network. The database is a local throwaway cluster, **not
  Neon**, so the pooled concurrent-commit refusal remains unproven.
- The operator's own staker address and transaction hash were placeholders (`NQ…`, `…`) in the
  request. When they are supplied, `getTransactionByHash` can re-read that transaction and what
  it returns goes in here verbatim.

### Next
- **Slice B** (not started): the native-mobile UI pass — ⓘ bottom sheets, native share instead
  of the raw invite URL (`SquadScreen.tsx` prints it in full today), a sticky bottom action bar,
  monospace only for amounts/addresses/hashes, cards and tappable rows, a compact top bar with a
  back chevron, plain words in all five catalogues, and skeletons instead of "—". Its own
  `check:scenes`, `pnpm gate` and handoff entry.
- Neon through the pooler, including the concurrent-commit refusal.
- The three leaving steps and a Mode A payment on a real phone on testnet, then mainnet.
- The mock chain provider (`?chain=mock`) and Remotion.

## Native-feeling UI — 2026-11-09 (Slice B)

Plan: `~/.claude/plans/quizzical-swinging-magpie.md`, Slice B. Pure-UI work. **No protected file
was touched in this slice** — `git status` over the critical path shows only
`apps/web/src/core/staking-actions.ts`, which is Slice A's `ALREADY_LEAVING` guard and is
unchanged since.

### A compact top bar instead of a breadcrumb
`ScreenHeader` was a brand row with a "← Squads" text link. It is now an app bar: a back
**chevron** with the destination as its accessible name, the screen's title centred, the mark on
the right. A three-column grid keeps the title optically centred whether or not there is a back
control — a flex row shifts it by the chevron's width. Thirteen screens pass a title; the ten
new `title*` strings live in `common`, so the typed catalogue required all five languages.

Two bugs caught by looking at the rendered frame rather than the markup:
- The title rendered at display size, because `.sheet h1` (0,1,1) is more specific than
  `.topbar-title` (0,1,0). Fixed by matching `.topbar .topbar-title`.
- Pulling the whole bar into the gutter (`margin: 0 -space-2`) **clipped the brand mark** at the
  right edge. Only the chevron needs that pull, so it moved to `.topbar-lead`.
- The squad's name then appeared twice — in the bar and under the orbit. The orbit's caption is
  gone; on a 390 px screen that was a whole line spent on the same three words.

### The invite link is never printed
`SquadScreen` printed the full invite URL in a mono field. It is the one string on that screen
that must not be mistyped, and a phone cannot select it comfortably. It now travels by
`navigator.share` — the phone's own sheet, which reaches the messaging app the squad already
uses — with a quiet **Copy link** beside it and a "Copied" confirmation. The container owns the
`navigator` call, so `packages/ui` stays pure.
- `AbortError` is treated as a decision, not a failure: dismissing the share sheet leaves the
  screen exactly as it was. Anything else falls through to the clipboard.
- The public proof link got the same treatment — a Copy control rather than printed text — so
  the capability was kept rather than dropped with the URL.
- `tests/unit/ui-screens.test.ts` takes the fixture's own URL as the needle and asserts it
  appears nowhere in the rendered markup, so a screen printing it again fails the gate.

### One sentence on screen, the rest behind an ⓘ
New pure `InfoSheet` + `InfoButton`. The leave-by banner carried a four-line paragraph about
election blocks and reporting windows; it now reads "Unstaking takes about a day, so start
before goal day." and the full explanation is one tap away in a bottom sheet.
- The rise is a function of **`t − openedT`** through `easeOutCubic`, reaching CSS as
  `--info-progress`, which drives both the scrim's opacity and the sheet's `translateY`. There
  is no transition, no `@keyframes` and no timer, so Remotion renders frame 7 of the rise
  identically every time and `REDUCED_MOTION_T` freezes it open.
- A closed sheet is not in the DOM at all, so it costs nothing in the accessibility tree.
- Two scenes pin both ends: `squad-page-info-rising` (40% of the 0.28 s travel) and
  `squad-page-info-open`.

### Cards, rows, a sticky action bar, skeletons, pressed states
- `.card` / `.card-title` replace the `<h2 class="section-title">` runs on the squad page
  (Members, Payments, Share, Proof) and the proof page (Members, Payments, How to check). The
  card's own padding also fixed a member's amount sitting flush against the right edge at 390 px.
- `.action-bar` replaces `.sheet-footer` on the squad page: `position: sticky` keeps the main
  action in the normal flow, inside `--safe-bottom`, so nothing is permanently covered.
- **Skeletons instead of "—"**: `MySquadsScreen` shows two card-shaped placeholders while
  loading (an em dash there reads as "none", a different and wrong answer to "which squads am I
  in?"), and the orbit's centre shows a block sized to the digits, with the dash kept as its
  `aria-label` so a screen reader still hears "unknown". The block does not pulse — an animation
  would need a timer, and `packages/ui` has none.
- Pressed states added to `.secondary-button`, `.gradient-button`, `.squad-card`, `.row-button`,
  `.icon-button`, `.info-button` and `.link-button`.
- **No underline inside a control.** `.secondary-button` was missing `text-decoration: none`,
  and several of its uses are anchors (*View progress*, *Start leaving*, *Pay my share*), so
  they were rendering underlined. A test now reads `styles.css` and asserts the declaration in
  all six control classes. The inline explorer link on the transaction sheet **keeps** its
  underline, with a comment: it is a link, not a button.

### Monospace only where it is read character by character
`.member-age`, `.member-status-age` (the stage line and the read age) and the new `.meta` are
set in the text face, small and muted. Monospace stays on amounts, addresses, hashes and the
`curl` lines on the proof page. A test asserts `font-family: var(--font-sans)` on all three.

### Plain words — and the proof page keeps the technical ones
- `common.refreshChain` / `checkStatusAgain`: "Check the chain again" / "Check status again" →
  **"Refresh"**. `backedTotalUnread`: "Backed total: — · no chain read yet" → "Not checked yet".
- A new **`statusPlain`** set beside the existing `status` one. `statusLabel(status, lang,
  technical)` picks between them: "Backed" → **"Saved"**, "Unstaking" → **"Leaving"**,
  "Not staking" → "Not saving yet", "Withdrawn" → "Back in your wallet", "Ready to retire" →
  "Ready to confirm". `MemberList` takes a `technical` prop and **only `ProofScreen` sets it**,
  because its reader is checking a staking contract. A test asserts the squad page says "Saved"
  and never "Backed", and that the proof page still says "Backed".
- The commit sheet's "Backed by your stake" → "Ready to save", "of your active stake is free to
  commit" → "of your savings", and the member-status lines likewise. `proof.backedLine`
  ("backed by active stake") is deliberately left alone.
- Every one of these exists in **all five languages**; `type Strings = typeof en` meant a missing
  or wrong-arity key failed `pnpm typecheck` in each one, which is how the catalogue was kept
  honest rather than by review.

### What ran
- `pnpm gate` (log `.cache/native-ui-gate-2026-11-09b.log`): typecheck, lint, **144 unit tests
  and 36 adversarial tests, 0 failures, 0 skips**, Next build compiled clean in 14.8 s (10/10
  static pages, no warnings), Q16 production-artifact guards, secret scan and 19 exact
  dependency pins across 5 manifests all passed. **Exit 1 only at `check:tracked`**, because the
  slice is uncommitted; the human commits.
- New tests: `Q17 the screens read as an app: no printed invite link, no underlined control`
  (the invite URL, the top bar, the action bar, the six control classes, the three metadata
  classes, and the plain/technical status split) and `Q17 the ⓘ sheet is a pure function of t,
  and says what the banner no longer does` (mid-rise ≠ open, each reproducible from props, the
  long text only in the sheet, no sheet in the DOM when closed).
- Four existing Q17 tests were updated rather than worked around, because the UI they pinned
  deliberately changed: the two "Check the chain again" assertions, the orbit's `>—<` assertion
  (now the skeleton plus its `aria-label`), and the scene count.
- `pnpm check:scenes` against the dev server on port 3100: **143 scenes × 2 themes × {390, 375}
  = 572 frames, 0 failures** — nothing crossing the frame, no horizontal scroll, every tap
  target ≥ 44 px. Inspected the squad page (light and dark), the ⓘ sheet open, the leaving
  countdown, the commit sheet and My squads; the German squad page and the proof view are
  measured and screenshotted but not inspected.

### The Chromium profile teardown still leaks, sometimes
An earlier draft of the entry above claimed the teardown added on 2026-11-09 works, on the
evidence of one run that left nothing behind. That was too strong: after six measurement runs
in this session, **two had leaked** (`/tmp/squad-scenes-896068`, `/tmp/squad-scenes-929060`,
164–165 MB each, 329 MB in all) plus one 12 KB stub. So the retry loop in
`scripts/measure-scenes.mjs` removes the profile on the usual path but not on every one — most
likely when the run is interrupted or the browser is still flushing after the parent returns.
`/tmp` is a 3.8 GB tmpfs and was at 1.3 GB used when this was written. **The directories are
still there**: deleting them was refused by this session's sandbox, so the operator needs
`rm -rf /tmp/squad-scenes-*`. Worth fixing properly before the next measuring session, since
this is what filled `/tmp` and blocked the previous one.

### Not verified by this slice
- **`navigator.share` has never run.** It needs a secure context and a real phone; the fallback
  to the clipboard and the `AbortError` branch are reasoned from the Web Share API's contract,
  not observed. This is the one part of the slice that cannot be proven without a device.
- The pressed states (`:active`) and the ⓘ sheet's travel were checked as rendered frames and as
  CSS, never under a real finger.
- No wallet, no Nimiq Pay approval sheet, no phone, no mainnet. Everything Slice A left
  unverified stays unverified; nothing here touched the chain, the database or the wallet.

### Next
- Commit both slices (the gate is green except `check:tracked`, which only a commit clears).
- A phone pass inside Nimiq Pay: the share sheet, the pressed states, the ⓘ travel, then the
  three leaving steps and a Mode A payment on testnet, then mainnet.
- Neon through the pooler, including the concurrent-commit refusal.
- The mock chain provider (`?chain=mock`) and Remotion.

## White-and-black skin, a landing page that explains itself, a retry — 2026-11-09 (Slice C)

Six findings from the operator, after the native-UI slice. **No protected file was touched** —
`git status` over `member-status.ts`, `release.ts`, `commitments.ts`, `tx-tracker.ts`,
`payment-check.ts`, `rpc-schemas.ts`, `staking-actions.ts` and `src/wallet/` is empty.

### 1 · The "SAMPLE DATA — not a real squad" strip is gone from the entry screen
`containers/sign-in.tsx` passed `DEMO_LABEL` as the screen's `demoLabel`, so the first words a
visitor read were a disclaimer about an orbit they had not looked at yet. The invented data is
still labelled — the orbit's own caption says **Example squad** and the ticker's says
**Example goals** — which is what AGENTS.md "demo data labelled" asks for. The dev-identity
warning and an invite's "Invited to …" are not sample labels and still render.

### 2 · The entry screen now says what Squad Stake is
Three numbered rows in one card, above the example orbit rather than below it: *Pick a goal,
together* · *Your NIM never leaves your wallet* · *Progress is read from the chain*. One
sentence each, per the native-UI rule, and all seven new strings exist in **all five
languages** (`type Strings = typeof en` makes a missing key a typecheck failure in each).

The screen is taller than one phone now, so its action moved into the sticky `.action-bar`:
"Sign in with Nimiq Pay" is never scrolled out of reach.

### 3 · The logo and the name are at reading size
`ScreenHeader` was putting the full lockup — a drawing **5.8 times as wide as it is tall** —
into a top bar whose outer columns are 44 px. On the entry screen it now gets a row of its own
(`.topbar-lockup`) at 36 mark-units tall instead of 22; on every other screen the bar keeps a
title and the mark alone, which grew 24 → 26 px.

### 4 · A failed step of the exit now has a button
Reported from the phone: a withdrawal the network interrupted, with nothing to tap afterwards.
Reproduced — `LeavingSteps` printed the failure at the foot of a four-step page and the only
control was a quiet "Refresh" below the fold; with the plan unread every step is `locked`, so
the screen had **no control on it at all** above the fold while NIM sat mid-exit.

- The failure moved into the pinned bar, as `role="alert"`, with **Try again** above the
  existing Refresh.
- What that button may do is a pure function, `apps/web/src/core/retry.ts`, because the
  dangerous half is not "offer a button" but "offer which button". A failed **read** re-reads.
  A failed **send** is offered again only while the chain still says that step is `available`:
  the moment a hash exists the step is `pending` and the answer drops back to a re-read, so no
  control on the screen can put a second transaction on the wire (AGENTS.md invariant 8;
  FAILURE_MODES "check status before resending, never auto-retry"). A non-retryable refusal
  gets no button — the catalogue's own `retryable` flag decides, so a new code cannot smuggle
  a resend in. `act()` also re-reads the plan before deciding anything, so a transaction that
  landed between the failure and the tap is seen first and the planner refuses it.

### 5 · Responsive down to 320 px
`.sign-in, .sheet` carried `min-width: 375px`, so every screen scrolled sideways on an iPhone
SE (1st gen, 320 CSS px) and a folded Galaxy Z Fold (344). The floor is gone, the page gutter
is a token that steps down below 360 px along with the two display sizes, and a tablet or
desktop window gets more air around the same phone-width column. **Every scene is now measured
at 320 px as well as 390 and 375** (`/scenes?w=320` and `scripts/measure-scenes.mjs`).

### 6 · White and black, not purple
The dark theme was Nimiq's `--nq-blue-bg`, a radial ending at **#260133** — that is the purple.
`tokens.css` now carries a six-step neutral ramp and both themes are built from it: a white
page with white cards separated by a hairline, `#0b0b0c` ink, and one strong value — the flat
ink fill of a filled control, as in the reference in `assets/`. The Signal-Blue money gradient
is gone with it; so is gold as decoration (the orbit's arc, the typewriter's cursor and the
pill's travelling border are ink now). **Nimiq's hues stay where they mean something**: the
status dots, the failed-step chip, and the brand mark's own warm centre. Computed: ink on white
19.67:1, muted 5.59:1, faint 3.46:1 (the faint step was raised from 42% to 48% to clear the
3.0 floor); white on `#0b0b0c` 19.67:1, muted 9.17:1. This supersedes the 2026-11-07
deviations 1 and 2 in `docs/DECISIONS.md`; the font, type scale, spacing, radii and easings are
still Nimiq's, and the palette block is untouched.

### Three bugs found by looking at rendered frames rather than markup
- **The sticky action bar was transparent.** `background: linear-gradient(…, transparent,
  var(--page) 1rem)` is only opaque past its last stop, and a card carrying `--enter` is
  transformed, which puts it in the same paint layer as the positioned bar. The bar is now
  opaque with `z-index`, and the fade is a band *above* it.
- **The screen's own bottom padding sat below the stuck bar**, and content scrolled visibly
  through that strip. An `::after` paints it.
- **The entry screen's explanation was below the fold**, under an example orbit. The card moved
  above the orbit, and the two entrance timings swapped so they still arrive in reading order.

### What ran
- `pnpm gate` (log `.cache/clean-ui-gate-2026-11-09.log`): typecheck, lint, **147 unit tests
  and 37 adversarial tests, 0 failures, 0 skips** (was 144/36), Next build compiled clean in
  14.7 s (10/10 static pages, no warnings), Q16 production-artifact guards, secret scan and 19
  exact dependency pins across 5 manifests all passed. **Exit 1 only at `check:tracked`**,
  because the slice is uncommitted; the human commits.
- New tests: `Q17 the entry screen says what Squad Stake is, and labels its sample without a
  banner`; `§7.5 a failed exit step always offers a way on, and never a second send` (the
  interrupted withdrawal, the same failure once a hash exists, and the unread plan);
  `the screens fit a 320 px phone and no longer paint a purple page` (the width floor, the
  gutter token, the 359 px breakpoint, and both themes' page tokens read out of `tokens.css`);
  adversarial `a retry after a failed step never becomes a second send` — every kind × every
  step state, plus three refusal codes read from the live catalogue.
- Two new scenes (`leaving-withdraw-network-failed`, `leaving-withdraw-failed-no-resend`);
  `leaving-chain-unavailable` corrected to lock every step, which is what a failed read means.
- `pnpm check:scenes` (log `.cache/scenes-2026-11-09c.log`, record
  `.cache/scene-measurements.json`): **145 scenes × 2 themes × {390, 375, 320} = 870 frames,
  0 failures** — nothing crossing the frame, no horizontal scroll, every tap target ≥ 44 px.
  This is the first run at 320 px.
- Frames inspected directly (not through the gallery crop): the entry screen light, dark and at
  320 px; the squad page light and dark; `leaving-withdraw-network-failed`;
  `leaving-chain-unavailable`; `my-squads-several`; `commit-ready`; the proof view.

### The Chromium profile leak is fixed at the cause
The teardown sat at the end of `main()`'s happy path, so **every run that threw** left ~165 MB
behind — which is what filled `/tmp` twice. It is now a `finally` plus SIGINT/SIGTERM handlers,
and the exit code is decided outside it (`process.exit` skips a `finally`). Verified both ways:
a successful run and a deliberately failed one (`SCENES_URL=http://localhost:3999`) each left
nothing new behind. Sweeping profiles from *earlier* runs is opt-in (`SCENES_SWEEP=1`) and off
by default: a tool should not delete directories in a shared temp dir that it did not create.
**Four profiles from before this fix are still in `/tmp`** (`squad-scenes-{809124, 896068,
929060, 1024010}`); this session's sandbox refuses to remove them, so the operator needs
`rm -rf /tmp/squad-scenes-*` once.

### Not verified by this slice
- **No real device.** The theme, the lockup size, the 320 px layout and the pinned bars were
  checked as rendered frames in headless Chromium at three widths in both themes, never on a
  phone and never inside Nimiq Pay. `navigator.share` still has never run.
- **The retry has never fired against a real failure.** The rule is covered by unit and
  adversarial tests over every step state, and the screen is covered by two fixtures, but no
  wallet call has failed and been retried on any network.
- No wallet, no Nimiq Pay approval sheet, no mainnet, no database touched in this slice.
  Everything Slices A and B left unverified stays unverified.

### Next
- Commit all three slices (`check:tracked` is the only gate step still failing).
- A phone pass inside Nimiq Pay: the new skin at real DPI, the share sheet, the pressed states,
  then the three leaving steps and a Mode A payment on testnet, then mainnet.
- Neon through the pooler, including the concurrent-commit refusal.
- The mock chain provider (`?chain=mock`) and Remotion.

## Four UX defects from the second testnet phone run — 2026-11-09 (Slice D)

Reported after Slice C shipped: "i didnt see the retry button when i tried to withdraw after
leaving a squad and also initially it said transaction failed it was included in a block but
didnt execute and the fee was spent so what do i do … also the refresh button there when i
press it nothing shows to make me know its refreshing at least the button should roll … while
you are at that check for other ux issues in the app and fix".

**No protected file was touched** — `git status` over `member-status.ts`, `release.ts`,
`commitments.ts`, `tx-tracker.ts`, `payment-check.ts`, `rpc-schemas.ts`, `staking-actions.ts`
and `src/wallet/` is empty.

### 1 · Why the retry button was not there, which was three separate faults
Slice C's retry was real and committed (`c6d3e88`), and it still could not have shown up for
this failure. Traced in order:

- **A read erased the verdict about a send.** `act()` ends by re-reading the plan, and
  `loadPlan` cleared `error` on its way past — so `fail('TX_FAILED')` rendered the failure and
  the following read deleted it, taking the pinned "Try again" with it. That is exactly the
  report: "initially it said transaction failed … I didn't see the retry button". `loadPlan`
  now takes `keepFailure`: a read may always raise a *read* error; it may never retract a
  verdict about a send.
- **The rule refused to offer the only thing that helps.** `retryOffer` allowed a resend only
  while the step was `available`. An included-but-failed withdrawal leaves the step `failed`,
  so the answer was "re-read" — a button that reads the chain and changes nothing, next to a
  retired balance that is still sitting there. `failed` now offers the step again: that verdict
  is *final* and it is a verdict about a transaction that executed nothing, so the step is
  genuinely still the member's and taking it is not a second send of anything. `pending`
  (a hash in flight) still drops to a re-read — that is the case invariant 8 is about.
- **And the page could not show it at all after a reload.** The failure lived only in React
  state, so reloading `/squads/<id>/leaving` left no `error`, no `onRetry` and a step body that
  rendered its action only for `available` — four steps, a failed transaction, and nothing to
  tap. Each step now renders its action when the chain says `available` **or** `failed`,
  labelled "Try again", so the way on is read off the chain and a reload cannot lose it. New
  scene `leaving-withdraw-failed` is exactly that state, deliberately with no `error` and no
  `onRetry` prop.

Every one of those taps still goes through `act()`, which re-reads the plan and lets the pure
planner refuse, so a step whose precondition has gone is refused rather than re-sent.

### 2 · "the fee was spent so what do i do"
The screen's own explanation was already right (`tx.failedBody`: "It was included in a block
but did not execute. Nothing moved; the fee was spent."). What was missing was the answer to
"what do I do", which is finding 1. One wording fix beside it: the catalogue's `TX_FAILED`
next action said "Nothing was **staked**", which is wrong for a retire, a withdrawal or a
payment — now "Nothing moved; the fee was spent. You can try again.", in all five languages.

### 3 · The Refresh button looked dead, and on a dropped connection it was
Two faults. The cosmetic one: no control in the app showed that a read was in flight. The real
one: the leaving screen's refresh was `void loadPlan()` with nothing around it, so a read that
*rejected* — which is what an interrupted connection does, and the connection had just been
interrupted — was an unhandled rejection and the screen did not change at all. It is now
wrapped, catches, and shows `NETWORK_ERROR`.

New pure `packages/ui/Spinner.tsx`: the angle is `ringAngle(t, 1.1)` handed to CSS as `--spin`,
so there is no `@keyframes`, no timer, and Remotion can render frame `n` of the turn. Every
control that starts work now turns it **and** changes its label — `prefers-reduced-motion`
freezes `t`, so a turning arc alone would say nothing to a member who asked for less motion,
and nothing at all to a screen reader (the button carries `aria-busy`). One shared
`RefreshButton` serves all five refresh controls (leaving bar, squad page, transaction block,
pay sheet, commit sheet).

### 4 · Other UX issues found and fixed in the same pass
- **"0 of 60 confirmations" again, one component along.** Slice A fixed `MemberList`;
  `TxStatus` still rendered `confirmations ?? 0`, and the two containers behind it still sent
  `tracked.confirmations ?? 0`. A count nobody read is now worded (`tx.confirmationsUnread`,
  five languages) and the state types carry `number | null`, so a zero cannot stand in for
  "unread" anywhere on the transaction path.
- **One button whose `busy` prop said nothing**: the privacy notice's *Accept* dimmed and no
  more. No caller passes `busy` to it today, so this was a contract honoured rather than a
  defect fixed. Checked and **not** changed: the commit sheet's *Create staker* / *Add stake*,
  which looked like the same defect and is not — approving moves the sheet to `waiting`, which
  renders the other button saying "Waiting…", so the tap is already answered.
- **The spinner also goes in the money buttons** that already changed label (commit, pay,
  create squad, leave, the three exit steps), so waiting looks the same everywhere.
- **A fixture that contradicted the server.** `leaving-retire-failed` carried `release: null`,
  which the step machine would now report as `waiting`, not `failed`. Re-anchored to a released
  stake, which is the only way step two can read `failed`.

### The one place "offer it again" had to be held back
In the step machine the release gate now outranks the failure: a retire that failed **before**
the chain released the stake reads `waiting`, not `failed`. Because `failed` now means "yours
to take again", a failure that outranked the gate would have put a second 0.003 NIM fee behind
a button for a transaction the staking contract rejects just as surely as the first
(FAILURE_MODES "retire before release"). The existing Q11 attack was updated to assert the
stronger claim, and extended: once the head passes the release block, that same failed retire
*is* offered again and the planner will build it. Trade-off taken knowingly: the failed hash is
not shown on that step until the release passes.

### What ran
- `pnpm gate` (log `.cache/ux-gate-2026-11-09c.log`): typecheck, lint, **148 unit tests and 37
  adversarial tests, 0 failures, 0 skips** (was 147/37), Next build compiled clean in 18.7 s
  (10/10 static pages, no warnings), Q16 production-artifact guards, secret scan and 19 exact
  dependency pins across 5 manifests all passed. **Exit 1 only at `check:tracked`**, because the
  slice is uncommitted; the human commits. One file changed after that run — the
  measurement script's teardown, below — which the build and the tests do not cover;
  `eslint` was run on it alone (exit 0) and the script itself was run twice afterwards.
- New tests: `a control that starts work says so, and never prints a count nobody read` (the
  spinner's `aria-busy` and changed label, the spinner as a pure function of `t` — two instants
  differ, the same instant repeats byte for byte — and `TxStatus` wording a null count while
  still printing a real one); `§7.5 …` extended with `leaving-withdraw-failed`, which asserts
  there is no `role="alert"` on that screen at all and that the single send on it is step
  three's own "Try again". The retry attack now covers `failed` → resend for every kind, keeps
  `pending`/`done`/`waiting`/`locked` → re-read, and the Q11 attack asserts the release gate
  outranks the failure and then that the step opens once the head passes the release block.
- `pnpm check:scenes` (log `.cache/scenes-2026-11-09d.log`, record
  `.cache/scene-measurements.json`): **147 scenes × 2 themes × {390, 375, 320} = 882 frames,
  0 failures** — nothing crossing the frame, no horizontal scroll, every tap target ≥ 44 px.
- Frames inspected directly, scrolled to the step rather than measured from the top: the failed
  withdrawal in light **and** dark (step three reads "Failed · That transaction failed · It was
  included in a block but did not execute. Nothing moved; the fee was spent." with the hash, the
  explorer link and a **Try again** under it), the interrupted withdrawal (the step's own
  *Withdraw in Nimiq Pay* plus the pinned failure and its retry), and the refresh control
  mid-read. The spinner was also screenshotted at 12× to confirm it draws a ring with a moving
  gap rather than a disc.

### Two process faults found on the way, both worth not repeating
- **The first gate run failed at `test:production`** with `Cannot find module './173.js'` out of
  `.next/server/webpack-runtime.js`. Not a code fault: **a dev server from the previous session
  was still running** (pid 1023082, started 17:14, cwd `apps/web`) and writing dev chunks into
  the same `.next` that `pnpm build` had just produced, so the artifact the guard booted was
  inconsistent. Stopping it and deleting `.next` fixed it; the gate then passed that step twice.
  The previous handoff says that server was stopped. It was not. **Stop the dev server before
  `pnpm gate`, and check `ss -ltnp` rather than trusting the note.**
- **Port 3100 is no longer free either** — an unrelated Pages-Router Next app answers on it, as
  port 3000 already did. This session measured on **3210**. And `SCENES_URL` is the **base**
  (`http://localhost:3210`), not the `/scenes` URL; passing the latter asks for `/scenes/scenes`
  and reports "No scenes", which looks like a dev-harness problem and is not.

### Not verified by this slice
- **No wallet, no phone, no mainnet, no database, no chain.** Nothing here signed, sent or read
  anything; the whole slice is pure UI, two pure rules and their tests.
- **The retry still has never fired against a real failure.** It is now covered by unit and
  adversarial tests over every step state, by two fixtures and by inspected frames — but no
  wallet call has failed and been taken again on any network. The next phone pass is what
  proves it, and the thing to try is exactly what was reported: let a withdrawal fail, reload
  the page, and check that step three still offers itself.
- The spinner has been seen only in headless Chromium at 1× — never at real phone DPI, and
  never with `prefers-reduced-motion` actually set on a device (the frozen-`t` case is why the
  label changes too, but that pairing has only been reasoned and tested, not watched).

### Next
- Commit all four slices (`check:tracked` is the only gate step still failing).
- A phone pass inside Nimiq Pay: the interrupted withdrawal above, the share sheet, the pressed
  states and the new skin at real DPI; then the three leaving steps and a Mode A payment on
  testnet, then mainnet.
- Neon through the pooler, including the concurrent-commit refusal.
- The mock chain provider (`?chain=mock`) and Remotion.
- Still open: `rm -rf /tmp/squad-scenes-*`. **Six** directories now, not four: Slice C's
  teardown removed the 165 MB inside a profile but not the profile itself, so this session's
  two measurement runs each left an 8 KB shell behind before that was noticed and fixed (see
  below). Deleting them is still the operator's call; this session's sandbox refuses.
- The `.next` directory was deleted at the end of this session, because a dev server had
  written into it. The next `pnpm build` starts from nothing, which is the state the gate wants.

### The teardown removed a profile's contents but not the profile
Slice C's `finally` emptied the directory and then returned, and Chromium — still exiting —
recreated `Default/Cache` and `Default/Network Persistent State` after `rm` had already walked
past them. 165 MB went, 8 KB stayed, once per run. The teardown now removes, **looks**, and
goes round again up to five times. Verified both ways after the change: a successful two-scene
run and a deliberately failed one (`SCENES_URL=http://localhost:3999`) each left the count at
six, unchanged.

## Submission documents, go-live tooling and a full self-audit — 2026-11-09 (Slice E)

Documentation plus an audit; **no new features**. Submission is 2026-11-10, when the app goes
live on mainnet at `https://squad-stake.vercel.app` (one deployment, switched from testnet).
**No protected file was touched** — `git status` over `member-status.ts`, `release.ts`,
`commitments.ts`, `tx-tracker.ts`, `payment-check.ts`, `rpc-schemas.ts`, `staking-actions.ts`,
`app/api/auth/verify/route.ts` and `src/wallet/` is empty.

### Written
- **`JUDGING.md`** (linked from the top of the README): what Squad Stake is in two sentences,
  what a judge needs, the 12–24 h unstaking warning up front with a table of what is instantly
  checkable against what needs a return visit, four paths (5-minute core · a second wallet ·
  leaving · Mode A payment), a "try to break it" table with the expected refusal for each,
  a feature → file table, an evidence table whose claims are copied **only** from
  `briefing/PROOF_PLAN.md` (each testnet claim carries the word testnet; mainnet is listed as
  unproven), and an FAQ.
- **`README.md`**, rewritten as the pitch: live link, "Judges: start here", a placeholder for
  the video, the problem, four steps, how it uses Nimiq, what it isn't, honest limitations,
  screenshots, run instructions, deploy. Only PROVEN claims.
- **`docs/SUBMISSION.md`**: the description at exactly **250 words** (`wc -w`), category
  **Save**, and every form field as a checklist. `briefing/EVENT.md` A08 now records Save, and
  the stale "Pay." paragraph is marked superseded rather than deleted.
- **`THIRD_PARTY_NOTICES.md`**: every licence read out of the installed `package.json` files
  on 2026-11-09 — not from memory. Two of my first guesses were wrong (`@nimiq/mini-app-sdk`
  is MIT, `@nimiq/identicons` is ISC) and were corrected by reading the tree.
- **`docs/GO-LIVE.md`**: the ordered testnet → mainnet checklist on one deployment, why the
  testnet rows must be deleted first (they would be read against mainnet and become fabricated
  proof), the rollback, and the `serverEnv()`/`appNetwork()` default asymmetry.
- **`docs/AUDIT.md`**: the audit itself (below).
- **`docs/screenshots/`**: the six frames the README references, rendered from the fixture
  scenes at 390 px light.

### `pnpm db:reset-data`, proven against a real database
`apps/web/src/server/reset-data.ts` discovers its tables from `information_schema`, keeps
`schema_migrations`, prints the host and every table with its row count, and refuses unless
given **both** `--confirm` and the database's exact host name. Then one
`TRUNCATE … RESTART IDENTITY CASCADE` and a re-count. Exercised end to end on a throwaway
PostgreSQL 18.6 cluster: seeded, then a no-argument run printed the five tables and exited 1
without deleting; `--confirm neon-pooler.example.com` exited 1 naming the mismatch;
`--confirm 127.0.0.1` emptied all five and left `schema_migrations` at 3 rows; `pnpm db:migrate`
then printed "Migrations already applied."

Also confirmed nothing is hardcoded to testnet: a grep over `apps/web/app` and `apps/web/src`
outside `src/config/network.ts` returns only comments plus the two documented defaults, and
`tests/unit/network-config.test.ts` already scans for exactly this.

### The audit: 3 Blockers, 4 Majors, 15 Minors
Full write-up with repro steps and proposed fixes in `docs/AUDIT.md`. **The 3 Blockers and 8
Minors are fixed here; the 4 Majors and 7 Minors are listed for approval** (the rule for this
batch: fix Blockers and low-risk Minors, list Majors).

**Blockers, all fixed and all found by running the thing rather than reading it:**
- **F-1 · a pasted recipient was refused.** `POST /api/squads` answers `INVALID_INPUT` for
  `NQ6229BT…` — the unspaced form an explorer or a chat message gives you — because the wire
  contract takes the spaced form only, and the screen named no field. New pure
  `src/core/nimiq-address.ts` normalises spacing and case at the screen, refuses a genuine
  non-address with its own words in five languages, and **never invents** the missing part of
  an address.
- **F-2 · a settled squad still offered "Change my commitment" and "Leave squad"**, both of
  which `isActive` refuses with `SQUAD_CLOSED`. The action bar is no longer rendered on a
  COMPLETED squad; the "This squad is complete" banner is the end of the story.
- **F-3 · the public proof page answered 500.** `/proof/cbnkj8dn-typo` and
  `/squads/notauuid` returned **500** with `PostgresError: invalid input syntax for type
  uuid`, because `squadProof` falls back to `getSquad`, whose column is a uuid. That is the
  one link judges are told to share. `getSquad` now answers null for anything that cannot be
  a uuid, before the query; verified against the same database: **500 → 404**, and
  `/api/proof/<unknown>` now says `SQUAD_NOT_FOUND` instead of `UNAVAILABLE`.

**Minors fixed (8):** the status poll gave up on `UNAVAILABLE` (a handler failure that says
nothing about the transaction) and both "stalled" strings promised "after two minutes", which
a refusal could make false — the loop is now the pure `followTracked(read, hash, onProgress,
wait)` and the claim is gone in five languages; the web manifest still carried the pre-Slice-C
navy and gold; `SignInScreen` did not pass `lang` to its header; step four said "Finish
withdrawing first" while a payment was in flight; the read age ran into hundreds of minutes
(now an hours unit in five languages); the ⓘ dialog is `aria-modal` but focus stayed behind
it; and — **the one worth remembering** — `scripts/measure-scenes.mjs` had been capturing
clipped screenshots since 2026-11-08: mobile emulation applies a page scale of its own, so a
plain `captureScreenshot` returned a 390 px image holding the left ~390 px of a ~474 px
layout. Every frame "inspected by eye" in the last three slices was missing its right edge,
including the brand mark in the top bar. The measurements were never affected — they are read
from the DOM in CSS pixels — and the capture now passes an explicit clip. Looking at the
repaired frames then found an eighth: the COMPLETED fixture read "4,500 NIM saved · 1,100 NIM
leaving · 1,800 NIM missing" beside a banner saying every member had paid, because it kept the
base scene's stage totals; it now derives them from its own roster.

**Majors left for approval:** the create screen prints the invite URL and offers no share
control (the squad page's own fix was never carried across); six screens use a static footer
while three use the sticky action bar, so the primary action sits below the fold on the
longest screens; `deriveLeavingSteps` takes the §7.6 verdict as a boolean, so a payment whose
refusal is already final still reads "Sent"; and the commit sheet starts empty and suggests no
amount, which is the only number the member has to invent on the core path.

### What ran
- **A database run against live testnet.** A throwaway PostgreSQL 18.6 cluster (port 55432,
  TCP-only, migrations 001–003) behind `pnpm dev` on port 3210, as dev identities alice / bob
  / carol: both modes created; `GOAL_TOO_SOON`; the F-1 refusal; bob joined by token; a guessed
  token and a right-token-wrong-id both `INVITE_INVALID`; a commit refused `CHAIN_UNAVAILABLE`
  on the cold five-second read and then `NOT_STAKING` with `shortfallLuna 200000000` from a
  real staker read; the detail view with `earned` for the viewer only and `null` for everyone
  else; `GET /api/plan/:id` with a real `headBlock` 16,343,325; the public proof by short id
  and by uuid, signed out, with `inviteToken: null`; `NOT_A_MEMBER` for a stranger; leave,
  leave again (`NOT_A_MEMBER`), re-join (fresh membership at zero); and every page of §9
  loaded, including the mode-B `/pay` and the non-member `/leaving`, which redirect rather
  than dead-end.
- **A real included-but-failed transaction tracked end to end**, through HTTP and SQL:
  `POST /api/tx` with the recorded testnet retire `70a282c0…` → `SUBMITTED`, then
  `GET /api/tx/:hash` → **`INCLUDED_FAILED` with 170,877 confirmations**, written back to
  `tracked_txs` with `checked_at`; a duplicate hash → `DUPLICATE_HASH`; the pay route refused
  that hash with `NOT_TRACKED`. This is the first time the tracker's failure branch has run
  against a live node through the whole stack rather than from fixtures.
- **CoinGecko**: USD timed out on the cold read (the deliberate five-second abort) and then
  answered 0.00025454; EUR 0.0002268; GMD `NO_QUOTE`, as documented.
- **`pnpm gate`** (log `.cache/audit-gate-2026-11-09.log`), from a stopped dev server and a
  deleted `.next`: typecheck, lint, **156 unit tests and 37 adversarial tests, 0 failures,
  0 skips** (was 148/37), Next build compiled clean in 28.6 s (10/10 static pages, 26 routes,
  no warnings), Q16 production-artifact guards, secret scan and 19 exact dependency pins
  across 5 manifests all passed. **Exit 1 only at `check:tracked`**, because this slice is
  uncommitted; the human commits. Nothing else in the gate failed.
- **`pnpm check:scenes`** (log `.cache/scenes-2026-11-09e.log`, record
  `.cache/scene-measurements.json`): **148 scenes × 2 themes × {390, 375, 320} = 888 frames,
  0 failures** — nothing crossing the frame, no horizontal scroll, every tap target ≥ 44 px.
  Run again after the UI fixes landed. Frames inspected directly, now that the capture is no
  longer clipped: the entry screen, the squad page, the settled squad in both themes (the
  banner with no action bar under it), the payment in flight, and the six README shots.
- New tests (8): `input-and-polling` (5 — every shape of a pasted address, eight refusals in
  five languages, and the poll's retryable-versus-final rule over `UNAVAILABLE`,
  `NOT_TRACKED`, `INVALID_INPUT`, `AUTH_REFUSED`, a final verdict and a whole unknown
  window); `store-ids` (1 — the uuid guard, proven to run *before* the query by running with
  no database configured); `ui-screens` +1 (a settled squad offers nothing the server would
  refuse); `ui-leaving` +1 (step four says nothing about withdrawing while a payment is in
  flight), plus the read-age assertions in `i18n`. One existing assertion was updated rather
  than worked around — the "after two minutes" wording it pinned is deliberately gone.

### Not verified by this slice
No wallet, no Nimiq Pay approval sheet, no phone, no mainnet. `navigator.share` still has
never run. The retry after a real failure still has never fired. The database is still a local
throwaway cluster, **not Neon**, so the pooled concurrent-commit refusal remains unproven. The
go-live checklist is a written procedure: no Vercel build, no Neon branch and no mainnet read
has happened. Everything the earlier slices left unverified stays unverified.

### Next
- Commit this slice and the four before it (`check:tracked` is the only gate step failing).
- Decide the four Majors in `docs/AUDIT.md` (share on the create screen, the sticky action
  bar on six screens, the §7.6 refusal code instead of a boolean, a suggested commit amount).
- **Go live**: `docs/GO-LIVE.md` — `pnpm db:reset-data`, `NEXT_PUBLIC_NIMIQ_NETWORK=mainnet`
  in Vercel, redeploy, then the phone pass on Default. Fill in the ☐ fields in
  `docs/SUBMISSION.md` (payout address, video link, lead name) and the video placeholder at
  the top of the README.
- The phone pass itself is what proves the list at the end of `docs/AUDIT.md`: the three
  leaving steps, a Mode A payment, the share sheet, the retry after a real failure, and
  `getHostLanguage()`/`getHostFiat()` returning real values.
- Still open from earlier slices: Neon through the pooler (including the concurrent-commit
  refusal), the mock chain provider (`?chain=mock`), Remotion, and `rm -rf /tmp/squad-scenes-*`
  for the profiles left before the teardown was fixed.

## The four Majors and the seven listed Minors, approved and fixed — 2026-11-10 (Slice F)

The operator approved every finding `docs/AUDIT.md` had left for a decision
("fix all the majors and minors i approve"). All 22 findings of the audit are now fixed:
3 Blockers + 8 Minors in Slice E, **4 Majors + 7 Minors here**. `docs/AUDIT.md` is updated
in place — the findings are left as written and each carries what was actually done.

**No protected file was touched.** `git status` over `member-status.ts`, `release.ts`,
`commitments.ts`, `tx-tracker.ts`, `payment-check.ts`, `rpc-schemas.ts`,
`staking-actions.ts`, `app/api/auth/verify/route.ts` and `src/wallet/` is empty.

### The four Majors
- **M-1 · the create screen printed the invite URL.** The share step now hands the link to
  the phone's own share sheet, with a quiet **Copy link** and a "Copied" confirmation. The
  `navigator` call moved into one new `apps/web/src/hooks/use-share-link.ts`, which the squad
  page now uses too — its inline copy of the same logic is gone, so the two screens cannot
  drift again. `AbortError` (the sheet dismissed) is a decision, not a failure, and anything
  else falls through to the clipboard. `packages/ui` stays pure: `onShare` / `onCopyInvite` /
  `shared` are props. New scene `create-share-copied`.
- **M-2 · half the screens had a sticky action bar.** The `.sign-in-footer, .sheet-footer`
  rule is deleted and the six screens that used it (create — both steps — commit, pay,
  leave-confirm, My squads, privacy notice) render `<footer className="action-bar">`. The
  main action is now pinned inside `--safe-bottom` on every screen, which is what the longest
  ones (create, commit) needed: their action used to sit below the fold.
- **M-3 · a payment whose refusal was already final still read "Sent".** `deriveLeavingSteps`
  takes `payment: PaymentOutcome | null` — `{ verified: true }` or `{ verified: false, code }`
  — instead of a boolean. `WRONG_RECIPIENT`, `PAYMENT_DATA_MISMATCH`, `PAYMENT_SHORT` and
  `TX_FAILED` are final, so the step reads `failed` the moment the chain says so instead of
  waiting for the tracker's five-second poll; `TX_NOT_CONFIRMED` and an unreadable
  transaction still read `pending`, because those can still change. The machine still does no
  I/O. This is the "rough edge" recorded on 2026-11-08, closed.
- **M-4 · the commit sheet suggested no amount.** New pure
  `apps/web/src/core/commit-suggestion.ts`: the member's own commitment if they have one,
  otherwise an even share of a Mode A target **rounded down** to whole NIM, and nothing at
  all for Mode B or a squad with no target. It is a function of the squad row and the member
  count and **never of a balance** (which stays server-side); `joinView` sends it as
  `suggestion`, the field is pre-filled with it, and one hint line says where the number came
  from, so it reads as a suggestion rather than a decision the app made.

### The seven Minors
- **n-1 · two codes with no producer**, decided both ways. `STALE_READ` is **deleted** —
  nothing ever served a `lastKnown` snapshot *as* a stale read, and every screen already
  prints the age of the read it shows, which is the honest form of the same thing.
  `LEAVE_BLOCKED` is **wired** (n-4). A new test scans every `.ts`/`.tsx` under
  `apps/web/app` and `apps/web/src`, with the `FLAGS` table itself cut out so a code cannot
  vouch for itself, and fails if any catalogue code has no producer.
- **n-2 · `GET /api/tx/:hash` was not scoped to the caller.** It now looks the hash up with
  `getTrackedTx` and answers **`NOT_TRACKED` (404)** unless the row is the caller's — the
  same answer an invented hash gets. `SquadHandlerDeps` gained a `store` of exactly
  `Pick<SquadStore, 'getTrackedTx'>`.
- **n-3 · `joined_at` survived a re-join.** `joined_at = now()` in the `DO UPDATE` of
  `joinMembership`, which already reset `left_at` and `committed_luna`. "Earned since
  joining" was measuring over a period the member was not in the squad.
- **n-4 · two store verdicts were discarded.** `leave` answers **`LEAVE_BLOCKED`** (409,
  retryable, "your stake is untouched") when `markLeft` matches no row, instead of reporting
  a release that did not happen; `join` **re-reads** when `joinMembership` matches no row —
  a current membership is the same success the other request got, anything else is
  `UNAVAILABLE`.
- **n-5 · the entry screen's one action was the quiet style.** "Sign in with Nimiq Pay" is
  now the filled ink `.primary-button`, with the spinner and `aria-busy` while Nimiq Pay
  holds the approval; the two link states match it. The gradient pill stays for genuinely
  secondary actions.
- **n-6 · the ⓘ sheet had no scrim tap and no Escape.** Both are now React handlers on the
  scrim element — no `window` listener, no effect, so the component is still a pure function
  of `t`. A tap *inside* the sheet is excluded by comparing `target` with `currentTarget`
  rather than by stopping the event on the way up.
- **n-7 · the price route emitted codes the catalogue did not name.** `TIMEOUT` (retryable)
  and `NO_QUOTE` (not retryable) are in `catalog.ts` with words in all five languages. The
  fiat line still simply disappears; nothing on screen changed. The catalogue is now 42
  codes (was 41).

Eight rows added to `docs/DECISIONS.md`, one per decision above.

### What ran
- `pnpm gate` (log `.cache/approved-gate-2026-11-10.log`), from a stopped dev server and a
  deleted `.next`: typecheck, lint, **163 unit tests and 37 adversarial tests, 0 failures,
  0 skips** (was 156/37), Next build compiled clean in 34.3 s (10/10 static pages, **28
  routes**, no warnings), Q16 production-artifact guards, secret scan and 19 exact dependency
  pins across 5 manifests all passed. **Exit 1 only at `check:tracked`**, because the slice is
  uncommitted; the human commits. Nothing else in the gate failed.
- New tests (7 beyond the 156): `tests/unit/squad-http.test.ts` (3 — the hash scoping with a
  stranger, an unknown hash, the owner's own verdict and a malformed hash that never reaches
  the store; the leave verdict; the join re-read in three shapes), `i18n` +1 (the
  producer scan plus the three codes that changed), `ui-screens` +1 (the filled entry action,
  its spinner, and the ⓘ sheet's two new handlers called directly on the returned element),
  and assertions added to `ui.test.ts` (the create screen prints no URL and has a copied
  state) and to the M-1…M-4 suites written earlier in this batch.
- `pnpm check:scenes` (log `.cache/scenes-2026-11-10.log`, record
  `.cache/scene-measurements.json`, `measuredAt 2026-11-10T19:22:51Z`): **150 scenes × 2
  themes × {390, 375, 320} = 900 frames, 0 failures** — nothing crossing the frame, no
  horizontal scroll, every tap target ≥ 44 px. Two new scenes since Slice E
  (`create-share-copied`, `commit-suggested-yours`).
- Frames inspected directly: the entry screen (the filled "Sign in with Nimiq Pay" in the
  pinned bar), `create-share-copied` (no URL anywhere, "Share invite" plus "Copied", and
  "Open the squad" in the sticky bar), and `commit-ready` (the suggestion line under the
  field, "Suggested 3,000 NIM: an even share of the goal"). The other seven re-shot scenes
  are measured and screenshotted but not inspected.
- `/tmp` cleaned: the six leaked Chromium profiles were removed in this session (the four
  pre-fix ones at ~9 MB each, and two 8 KB shells this session's own runs left behind). The
  teardown still leaves an empty shell on some runs; it is 8 KB rather than 165 MB, so it is
  recorded rather than chased.

### Not verified by this slice
- **No wallet, no Nimiq Pay approval sheet, no phone, no mainnet, no database and no chain
  read.** Everything here is server logic, pure UI and their tests; nothing signed, sent or
  read anything. In particular `navigator.share` on the create screen has still never run —
  it needs a secure context and a real device, exactly as on the squad page.
- The n-2, n-3 and n-4 behaviour is proven against the in-memory twin only. **n-3 is a change
  to SQL that has not run**: the next database session must re-join a member and check
  `joined_at` moved.
- M-3's final-refusal branch is proven from recorded verdicts; no payment has ever been sent,
  so no step has read `failed` from a real mismatched marker.
- Everything the earlier slices left unverified stays unverified.

### Next
- Commit Slices A–F (`check:tracked` is the only gate step failing).
- **Go live**: `docs/GO-LIVE.md` — `pnpm db:reset-data`, `NEXT_PUBLIC_NIMIQ_NETWORK=mainnet`
  in Vercel, redeploy, then the phone pass. Fill in the ☐ fields in `docs/SUBMISSION.md`
  (payout address, video link, lead name) and the video placeholder in the README.
- The phone pass proves what the audit could not: the three leaving steps, a Mode A payment,
  the share sheet on two screens now, the retry after a real failure, and
  `getHostLanguage()` / `getHostFiat()` returning real values.
- Still open from earlier slices: Neon through the pooler (including the concurrent-commit
  refusal and the three queries the in-memory twin alone has exercised), the mock chain
  provider (`?chain=mock`), and Remotion.

## Link previews, an in-app proof page, and no silent failure — 2026-11-11 (Slice G)

Two requests in one turn: the squad page and the create success screen should show the two
links as *recognisable* previews with a real way to open the proof page, and **no page may
fail silently** — every failure says what happened and offers a way on.

**No protected file was touched.** `git status` over `member-status.ts`, `release.ts`,
`commitments.ts`, `tx-tracker.ts`, `payment-check.ts`, `rpc-schemas.ts`, `rpc.ts`,
`staking-actions.ts`, `app/api/auth/verify/route.ts` and `src/wallet/` is empty.

### Part 1 — the links

- **`shortLink(url)`** in `packages/ui/format.ts`, pure: drops the scheme and `www.`, drops a
  query or fragment, and elides the middle of the **last** segment only — the part that is a
  secret or an id — keeping four characters and the last three
  (`…/s/979d0a1b2c3d4e5f70` → `squad-stake.vercel.app/s/979d…f70`). A segment of nine
  characters or fewer is left whole, so a short id like `/proof/q7m2bt4h` still reads in full.
  The elision is deliberate: it is enough to recognise a link and **never** enough to retype
  one, which is the point — the full URL only ever leaves through Share or Copy.
- **Public proof card** (squad page): a visible **View proof page** control beside Copy link.
  It is an ordinary `<a>` to `/proof/<shortId>?from=<squadId>`, so it is in-app navigation and
  the proof screen gets a back chevron straight to the squad it came from — not an external
  link, not a new tab. Under it, the muted read-only preview.
- **Invite card**: Share invite and Copy link keep their behaviour and gain the same preview.
  The invite preview is deliberately **not** tappable — opening your own invite while signed
  in only walks you back to your own squad.
- Both previews are plain `<p class="link-preview">`: a test asserts each contains no `<a>`
  and no `<button>`, that there are exactly two of them on the squad page, and that the
  fixture's own absolute `inviteUrl` appears nowhere in the rendered markup.
- The create success screen gained the same preview under its share step.
- `ProofScreen` takes an optional `back` (defaulting to "Open Squad Stake" → `/`), so the
  public page still works for a stranger who has no squad to go back to.

### Part 2 — no page fails silently

Before this slice four paths ended in nothing or in a bare redirect: an unknown route rendered
Next's built-in 404, a thrown render error rendered Next's built-in error page, a bad invite
token called `notFound()`, and five pages called `redirect('/')` for a signed-out visitor — so
a judge following a squad link was dropped on the welcome screen with no explanation of why.

- New pure **`packages/ui/NoticeScreen.tsx`** — title, body, an optional reference, one action
  and an optional retry with the shared `Spinner`. `role="alert"`, sticky `.action-bar`.
- **`app/not-found.tsx`**, **`app/error.tsx`** and **`app/global-error.tsx`** render it.
  `error.tsx` shows `error.digest` as a **Reference** (so a report can be matched to a server
  log) and wires `reset` to **Try again**. `global-error.tsx` replaces the root layout, so it
  brings its own `<html>`/`<body>` and is English only — nothing it needs may be able to throw.
- Every body says what did **not** happen: "Nothing has changed, and no NIM has moved."
- **Redirects explain themselves.** `signInFirstUrl(path)` sends a signed-out visitor to
  `/?next=<path>`, and the welcome screen renders a notice saying which page is waiting and
  why a signature comes first; after signing in they land on that page, not on `/squads`.
  A non-member of a squad is sent to `/proof/<id>?notice=not-a-member`, which says so and then
  shows the public view rather than dead-ending.
- **Both query parameters that become links are validated server-side**, in
  `session-page.ts`: `onwardPath` accepts only a path starting with a single `/` and
  containing no backslash, and `squadPathFrom` **rebuilds** the path from a uuid it matched
  rather than echoing the parameter. An adversarial test drives `//evil.example`,
  `javascript:`, `data:`, a backslash form and path traversal through both.
- `use-share-link.ts`'s state is now `'idle' | 'copied' | 'failed'`, so a refused clipboard
  write says **"Could not copy. Use Share instead."** instead of looking like a dead button.
  Both screens that offer a copy show it.
- A new test scans every `.ts`/`.tsx` under `apps/web/app` and `apps/web/src` and fails if any
  page redirects to a bare `'/'` — the shape this slice removed.

### What ran
- `pnpm gate` (log `.cache/links-gate-2026-11-11.log`), from a stopped dev server and a
  deleted `.next`: typecheck, lint, **171 unit tests and 38 adversarial tests, 0 failures,
  0 skips** (was 163/37), Next build compiled clean in 33.1 s (**9/9** static pages, 26
  routes, no warnings), Q16 production-artifact guards, secret scan and 19 exact dependency
  pins across 5 manifests all passed. **Exit 1 only at `check:tracked`**, because the slice is
  uncommitted; the human commits. Nothing else in the gate failed.
  - The static-page count moved **10/10 → 9/9** deliberately: `/_not-found` is now dynamic,
    because `app/not-found.tsx` carries `export const dynamic = 'force-dynamic'` so it can read
    `Accept-Language` and answer in the visitor's own language. It is still prerendered-free
    rather than missing; the route table lists all 26 routes.
- New tests (8, in `tests/unit/links-and-failures.test.ts`): the preview's shapes; both
  previews plus the in-app proof href; the copy failure on both screens; the four notice
  screens; the two redirects explaining themselves; `onwardPath` against hostile inputs; the
  five-language notice strings; and the source scan for a bare `redirect('/')`. Plus one
  adversarial test — `a crafted return link can never leave this origin`.
- Three existing assertions were updated rather than worked around, because the UI
  deliberately gained scenes: the scene-count sum in `ui-screens.test.ts` and
  `signInScenes.length` 8 → 9 in `ui.test.ts`.
- **9 new fixture scenes**: `notice-not-found`, `notice-server-error`,
  `notice-error-retrying`, `notice-invite-invalid` (new file `packages/ui/scenes/notice.ts`),
  `sign-in-sent-here`, `squad-page-copy-failed`, `proof-view-not-a-member`,
  `proof-view-from-squad`, `create-share-copy-failed`. 159 scenes registered (was 150).
- `pnpm check:scenes` against the dev server on port 3210 (logs
  `.cache/scenes-2026-11-11.log` and `.cache/scenes-2026-11-11-full.log`, record
  `.cache/scene-measurements.json`, `measuredAt 2026-11-11T01:36:51Z`): **159 scenes × 2
  themes × {390, 375, 320} = 954 frames, 0 failures** — nothing crossing the frame, no
  horizontal scroll, every tap target ≥ 44 px. It was run twice: the second run restored the
  whole-suite record after a deliberate 11-scene re-run for screenshots had overwritten it
  with its own 66 frames. Both whole-suite runs report the same 954/0.
- Frames inspected directly: `notice-not-found` (light), `notice-server-error` (dark — the
  Reference line, Try again above Go to the start), `sign-in-sent-here` (the "Sign in to open
  that page" notice above the heading), `proof-view-not-a-member` (the back chevron and the
  "You are not in this squad" card), `create-share-copy-failed` (the preview reading
  `squad.example/s/samp…ken`, no full URL, and the copy-failure line), and both of the squad
  page's link cards in light **and** dark — Share invite + Copy link + `squad.example/s/4f1c…934`,
  and Public proof with **View proof page** + Copy link + `squad.example/proof/q7m2bt4h`
  (a short id is left whole), with "Could not copy. Use Share instead." under each in the
  copy-failed fixture.
- `scripts/measure-scenes.mjs` gained **`SHOT_SCROLL`**, which scrolls the screen *inside* the
  phone frame before a screenshot, so a card below the fold can be looked at. A taller clip was
  tried first and came back blank: the frame is 844 px tall and scrolls internally, so clipping
  past it only photographs the page behind it. It changes nothing that is measured — the
  measurements are read from the DOM in CSS pixels, and they are taken before it runs.

### Not verified by this slice
- **`navigator.share` and the clipboard have still never run.** Both need a secure context and
  a real device; the copy-failure branch and the share path are reasoned from the Web Share and
  Clipboard contracts and covered by fixtures, not observed.
- **No failure screen has been triggered by a real failure.** `app/error.tsx` and
  `app/global-error.tsx` are proven by their fixtures and by the build, never by a thrown
  render; no `error.digest` has been read off a real server log.
- No wallet, no Nimiq Pay approval sheet, no phone, no mainnet, no database and no chain read
  in this slice. Everything the earlier slices left unverified stays unverified.

### Next
- Commit Slices A–G (`check:tracked` is the only gate step failing).
- **Go live**: `docs/GO-LIVE.md` — `pnpm db:reset-data`, `NEXT_PUBLIC_NIMIQ_NETWORK=mainnet`
  in Vercel, redeploy, then the phone pass. Fill in the ☐ fields in `docs/SUBMISSION.md`
  and the video placeholder in the README.
- The phone pass: the three leaving steps, a Mode A payment, both share sheets, the retry
  after a real failure, and `getHostLanguage()` / `getHostFiat()` returning real values.
- Still open: Neon through the pooler, the mock chain provider (`?chain=mock`), Remotion.

## The demo video: HyperFrames + Kokoro, built from a recording of the running app — 2026-11-11 (Slice H)

Asked for after Slice G: build the demo video in `apps/video` with **HyperFrames** (HTML + GSAP,
seeked frame by frame) and **Kokoro** narration, replacing the Remotion plan, with the app
screens recorded as a screen capture of the **real app** rather than re-rendered from fixtures.

**No protected file was touched.** `git status` over `member-status.ts`, `release.ts`,
`commitments.ts`, `tx-tracker.ts`, `payment-check.ts`, `rpc-schemas.ts`, `rpc.ts`,
`staking-actions.ts`, `app/api/auth/verify/route.ts` and `src/wallet/` is empty. Nothing in
`apps/web` or `packages/ui` changed for the video: the capture drives the app exactly as it is.

### The renderer changed, and so did the reason for the shared UI
`docs/DECISIONS.md` 2026-11-11 records it. Remotion was chosen on 2026-10-22 so the video could
"show the UI 100% identical without screen recording". A recording of the real app is strictly
better evidence than a re-render of its components — it proves the app runs — so the capture is
the default and fixtures cover only what a wallet approval is needed to reach. The purity rules
that made the re-render possible are what make the capture deterministic, so `packages/ui` is
unchanged. `AGENTS.md`, `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md` and
`apps/video/README.md` were updated; the dated Remotion lines in this file and in
`docs/DECISIONS.md` are history and were left as written.

### The pipeline — `pnpm video:render`
Six stages, each runnable alone (`apps/video/README.md` has the table). Every script is
dependency-free Node: the only new third-party things are HyperFrames and Kokoro, both run
through `npx`/a local venv rather than installed into the workspace, so `pnpm deps:check` still
sees the same 19 exact pins.

1. **`record.mjs`** — empties the local database, then drives the app through the Chrome
   DevTools Protocol (`scripts/cdp.mjs`, zero npm dependencies) at **390 × 844**: seven flows
   captured as screencast clips, 23 fixture scenes as **3× stills**, and a **tap log** of every
   finger position and timestamp in the phone's own CSS pixels. `seed-squad.mjs` then seats two
   addresses that really are stakers on Nimiq testnet, so the squad page and the proof page
   derive their statuses from live chain reads.
2. **`narrate.mjs`** — Kokoro-82M locally (`af_heart`, speed 0.88), **one WAV per sentence**,
   silence trimmed off both ends, then a solved layout (below). `--relayout` re-times from the
   WAVs already on disk without asking Kokoro for a word.
3. **`prepare-assets.mjs`** — clips, stills and `assets/manifest.json` (clips, stills, taps).
4. **`build-audio.mjs`** — the voice laid at its exact start, and the music **ducked 18 dB**
   under it from the narration table rather than by a compressor guessing from level.
5. **`compose.mjs`** — writes `index.html`, `compositions/captions.html`,
   `compositions/screens.html` and `compositions/vertical.html` from the measured narration and
   the tap log. The five motion-graphic scenes are hand-written.
6. **`render.mjs`** — the master, the vertical cut, the poster and a still every five seconds.

### The layout solver, because "no pauses" is a constraint, not a preference
The operator asked for no pauses — "JUST A TINY LITTLE BREATHE … not a long pause of even
3 secs maybe 2 is fine" — and the film is a fixed 2:45 whatever length the voice comes out.
`narrate.mjs` therefore solves three unknowns against one equation: the breath between
sentences (0.2–0.7 s), the beat between sections (0.35–1.8 s) and the end card's hold (4–9 s),
spending slack on breathing first and on the card last. The first run at speed 1.0 left a
**25 s** static end card; at 0.88 with a fixed 0.2 s breath it still left **14 s**. Solved, the
same 33 WAVs give **breath 0.58 s × 24, section beat 1.58 s × 8, end card 6.00 s**, with the
last word at 159.0 s of 165. Re-solving needed no re-speaking (`--relayout`).

### What the capture found, by running the app rather than reading it
- **The commit sheet said "Pool details unavailable".** The Validators API read had hit the
  deliberate five-second abort on a cold connection, so §7.7 fell back to the chain-only rule —
  correct behaviour, and the wrong frame for a video whose narration names the pool. Warmed
  with one `curl` (1.6 s, well inside the abort) and re-captured: the card now reads
  **"Not-A-Pool · 11% fee"**, the validator address, "Rewards are added to your stake
  automatically" and "Picked to spread Squad Stake members across pools".
- **The commitment field typed `300300`.** The driver's "clear the field" step assigned
  `el.value = ''` directly. React tracks an input's value with its own setter and *skips* the
  change event when the DOM value is assigned that way, so React's state stayed at the
  pre-filled suggestion (PRD M-4, added in Slice F) and the keystrokes appended to it. The
  clear now goes through the prototype's native setter and **asserts the field is empty**
  before typing, so this fails loudly instead of being discovered in a frame.
- Both are faults in the recording tooling, not in the app; no `apps/web` file changed.

### The film
Six scenes, each mounted over the narration sections it covers, with no gap between them:

| | scene | covers |
|---|---|---|
| 0:00–0:13 | `hook.html` | five friends, one pot, one person's risk — drawn, not written |
| 0:13–0:31 | `problem.html` | the same pot, losing the check, then the yield, then itself |
| 0:31–0:53 | `intro.html` | the broken ring mended into the mark; three wallets each keeping a coin; a struck-through database → four chain blocks |
| 0:53–2:16 | `screens.html` | **one phone, held for eighty-three seconds**, with the real app playing inside it |
| 2:16–2:32 | `nim.html` | signature / native staking / settlement, then the breadth line |
| 2:32–2:45 | `close.html` | three claims, the lockup, the URL |

`screens.html` is **generated** — by `scripts/screens.mjs`, the cut list — because every time in
it is derived: 33 cuts anchored to the sentence they belong to (not to a clock), 10 finger-tap
indicators placed from the capture's log in the phone's own 390 × 844 space, and camera
push-ins on the thing being named. The generator **refuses to write a film that does not fit
its footage**: it checks every cut against the real length of the clip, every approval card
against HyperFrames' own reading floor (0.5 s + 0.3 s a word), and fails with the arithmetic
rather than rendering a black frame. It caught three real faults — a cut 1.5 s longer than the
footage left, a cut whose window rewound behind the previous one and so drew the same tap ring
twice, and two cuts that had drifted past the beat they were written for.

**Nimiq Pay's approval sheet is never recreated** (AGENTS.md "UI purity" 8). Each of the three
approval moments is a neutral card of ours over a dimmed screen: "Signed in", "Approved in
Nimiq Pay", "Approved in Nimiq Pay".

All motion is a tween on a wrapper, on one paused GSAP timeline per scene, seeded only from
`window.__SQUAD_BEATS` and `window.__SQUAD_TAPS` — constants in the document. There is no
`Date.now()`, no `Math.random()`, no timer and no fetch anywhere in the compositions, so every
frame is a pure function of timeline time, exactly as `packages/ui` already required.

### Music, and a licence this repository does not have
The bed is ducked **18 dB** under the voice, with a 0.25 s fall before each speaking block and a
0.5 s recovery after it, drawn as a trapezoid envelope from the narration table rather than by a
compressor reacting to level. Measured on the finished track: the music means **−22.9 dB** on the
end card with no voice and **−40 to −44 dB** while the voice is speaking (voice mean −22.7 dB),
so the duck lands at 17–21 dB as asked. Both tracks are exactly 165.000 s.

**`assets/music.mp3` has no licence, no attribution file and no ID3 tags in this repository**,
and it is not tracked in git, so its provenance cannot be established from the repo. The
operator said they would supply the source; until they do, `THIRD_PARTY_NOTICES.md` says plainly
that the music's licence is unknown to this project and that this line must be replaced before
the video is published. That is the one deliverable blocked on something outside the repository.

### The camera had to stop being a crop, and frames are what said so
The first camera scaled the screen's **own contents** — a crop-zoom — so a push-in read as
moving closer to the glass rather than as the phone growing. Snapshots at the tap instants
showed what that costs on this app: at 1.4 the create form read "**tal** target (NIM)",
"**ecipient** address", "**oal** date". Lowering the cap to 1.22 did not fix it, and the
arithmetic says it never could: the screens run edge to edge inside a 16 px gutter, so the
content occupies 358 of 390 px and a centred crop-zoom of `s` shows only `390 / s`. Nothing
above **1.09** can show a whole row, and 1.09 is not a camera move.

So the camera now dollies the **phone**: a wrapper around the body scales from a rest of 0.96
to at most 1.3, the 1080 px frame crops the bezel top and bottom, and the screen itself is
never cut. The body stands on a baseline just above the caption band and stays there — a first
attempt that also panned to the named row left 180 px of empty page under the phone at 112 s,
so the pan is clamped to the 176 px of slack a 904 px phone has in a 1080 px frame. What
actually puts the right rows on screen is the capture, which is already scrolled to them.
The crop is now **declared** (`data-layout-allow-overflow`), so `hyperframes check` reads it as
a camera move instead of a panel that escaped its canvas.

Two more faults came out of the same frames, neither of them in the camera:

- **A fixture said the chain had not been read for 38 days.** `squad-page-leave-by` runs on its
  own clock (two days before the leave-by deadline) but kept the base fixture's `readAt`, so the
  squad page read "Checked **923 h 45 min** ago". Re-anchored to the scene's own clock; it now
  reads "Checked 24 s ago". This is the third instance of this class in this repo
  (2026-11-08 and 2026-11-09 found the other two), and the third found by looking at a picture
  rather than at the code.
- **Two different pools, back to back.** The commit sequence held the real card from the
  capture — "Not-A-Pool · 11% fee", from the live Validators API — and then cut to the
  `pool-restake` fixture, "Sample Restake Pool · 5% fee". Both were honest and both were
  labelled, but together they read as a continuity error. The commit sheet is motionless from
  3 s on, so that window is now a held frame of the **running app** and the fixture is out of
  the film.

`hyperframes check`: **0 content errors**, 0 motion errors, 0 audio errors, 16/16 text checks
pass WCAG AA. The 19 warnings are the advisory `nested_media_start_basis_ambiguous` on each
nested clip (the values *are* composition-local) plus one `timeline_track_too_dense`; both are
deliberate and left. The first run also reported two **runtime** errors — "Browser process did
not exit after forced shutdown" — which are the checker's own teardown on a machine with
1.4 GB free, not a fault in the composition.

### The render, and the one defect that is fixed in the source but not in the published film

`node apps/video/scripts/render.mjs`, 07:26–07:49 UTC on 2026-11-11, one worker (the machine
resolved to `workerCount: 1` with ~2 GB free), 4,950 frames. Measured with `ffprobe` off the
finished file, not asserted:

| | |
|---|---|
| `apps/video/out/squad-stake-demo.mp4` | **1920 × 1080 · 30 fps · H.264 High · AAC 48 kHz stereo 199 kbit/s** |
| duration | **165.000 s = 2:45 exactly** (4,950 frames) |
| size | **14.7 MB** — the 100 MB ceiling never came close, so the re-encode branch did not run |
| `out/poster.jpg` | the end card at 162 s, 53 KB, the one generated file in git |

**This is the file that is published** at <https://youtu.be/iYhnj-aDvJ8>, and the README,
`JUDGING.md` and `docs/SUBMISSION.md` now carry that link.

A still was taken every five seconds and all 33 were looked at. Thirty-two were right. The
thirty-third kind was not: **at each of the three "Approved in Nimiq Pay" moments the phone
screen was blank grey.** No media shot is lit during an approval cut, so the scrim dimmed an
empty screen and the neutral card floated over nothing. Fixed in `scripts/screens.mjs`: each
approval now carries the shot before it forward as a *backdrop* under the scrim — a still
simply holds, a clip continues from where the previous shot ended, pulled back if the footage
would run out — and no tap is drawn on a backdrop, because the finger has left the screen.
Two smaller things went with it: the scrim moved **inside** the dolly, so it tracks the phone
instead of sitting at the untransformed position, and the scrim and card were lifted to
z-index 60/70, because shots are numbered upward from 2 and a late cut's z-index had climbed
over the dim that was supposed to cover it.

Verified by snapshot at all three instants (78.6 s, 91.9 s, 128.2 s): the invite screen under
"Signed in", the commit sheet reading "Waiting…" under "Approved in Nimiq Pay", and step one of
the exit with its 2,000 NIM field under the third. **It is not in the rendered file.** The
re-render was stopped at the operator's instruction once the film was already published, so
the repository's composition is one fix ahead of the video on YouTube. Re-running
`pnpm video:render` produces the corrected film; publishing it would mean a new upload.

**Not produced: the 1080 × 1920 vertical cut of the first minute.** `compositions/vertical.html`
is written and `scripts/render.mjs` renders it after the master, but that stage was reached only
in the stopped run, so no vertical file exists and the composition has never been rendered.

### Repository weight, measured rather than assumed
`apps/video` is **436 KB** in git — the scripts, the six compositions, `narration.json`,
`assets/manifest.json` and the self-hosted fonts. The 318 MB on disk (`.venv` 240 MB,
`assets/` 47 MB of clips and stills, `capture/` 16 MB, `out/` 15 MB) was already ignored and
never entered git, so ignoring the folder itself would cost the pipeline's source and save
nothing. The heaviest tracked file in the whole repository was **`assets/music.mp3`, 3.3 MB** —
also the file `THIRD_PARTY_NOTICES.md` records as having no licence, attribution or ID3 tags
here. It is now in `.gitignore` and `git rm --cached`-ed: still on disk so `pnpm video:render`
works, no longer redistributed by the repository. Its blob stays in history, so `.git` is
unchanged at 13 MB; only a history rewrite would reclaim that, which is not worth doing.

### What did not run in this session
`pnpm gate` was started from a deleted `.next` and **stopped by the operator partway through
the adversarial tests**, so it is *not* green for this slice: typecheck and lint passed and the
unit suite had run, but the Next build, `test:production`, the secret scan, `deps:check` and
`check:tracked` did not run. `pnpm test` was run separately earlier in the session and passed
**171 unit tests, 0 failures, 0 skips** after the fixture change. `pnpm check:scenes` has not
been run since `squad-page-leave-by` was re-anchored.
