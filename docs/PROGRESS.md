# Progress handoff — 2026-11-06

Deadline **2026-11-11 23:59 UTC**. Day plan in `docs/PRD.md` §10 (full scope, nothing cut).

## Done and verified
- Workspace, signature-based sign-in, chain reader and pure member status/release
  logic are implemented; complete P0 is not. No squad features were added.
- Next.js web app, pure shared UI, self-hosted fonts, five sign-in scenes and eleven
  member-status fixture cases (all six statuses, pending/error/stale/unknown release).
- Server-only RPC: eight typed methods, strict wire schemas, positional signatures,
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

## Next slice (Nov 6 remainder, per PRD §10)
- Squad/commitment persistence and Q03: create / join / commit for modes A and B.
  Commit validation must use
  `getStakerByAddress(address, { fresh: true })` inside the member-lock transaction.
- Reuse an RPC client in the server process to retain its address cache; these
  caches are ephemeral optimizations, never database truth.
- `calculateRelease` accepts an inactivation **inclusion block**; staker
  `inactiveFrom` is already an effective election block and must not be fed into
  that helper as an inclusion block. Unknown release stays UNSTAKING, not ready.
- Active balance covering all commitments takes BACKED precedence over unrelated
  leaving funds; otherwise inactive funds precede retired funds until exit completes.
