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
