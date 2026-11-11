# AGENTS.md — Squad Stake

Written 2026-10-22. Read before every task, then the PRD section for the task.
Squad Stake is a Nimiq Pay Mini App: groups save toward goals with NIM staked in each
member's own wallet, verified on-chain. Cycle 3, **Save**. Deadline **2026-11-11 23:59 UTC**.

## Read order
0. `docs/PROGRESS.md` (current handoff).
1. `docs/PRD.md` (what) · 2. `briefing/BUILD_CONTRACT.md` (frozen decisions) ·
3. `docs/ARCHITECTURE.md` (how) · 4. `briefing/FAILURE_MODES.md` (guards) ·
5. `briefing/REALITY_SPIKES.md` (what is proven) · 6. `briefing/knowledge/staking.md` ·
7. `docs/reference/` (Nimiq mini-app tech reference, winners' patterns).
If code and docs disagree, stop and report.

## Stack (frozen)
pnpm workspace, exact pins, every dependency version at least 14 days old:
- `apps/web` — **Next.js (App Router) + React + TypeScript strict**, deployed on Vercel. API =
  Next route handlers under `apps/web/app/api/**` with `export const runtime = 'nodejs'`.
- `packages/ui` — **every screen and component, pure display only** (see "UI purity").
- `apps/video` — **HyperFrames** project (HTML + GSAP, rendered frame by frame) for the demo
  video: motion-graphic scenes plus Playwright/CDP screen capture of the real app, Kokoro
  narration. See `docs/DECISIONS.md` 2026-11-11.
- `@nimiq/mini-app-sdk` 0.2.4 (client only) · `@nimiq/core` 2.22.0 (server only) ·
  Postgres (Neon) · Zod.

## Invariants the code cannot show
1. **The chain is the truth.** Balances and member statuses are derived from RPC reads on
   every request (60 s cache). Never store or accept them from the client.
2. **Identity = verified signature.** Address derived from the public key with `@nimiq/core`.
   That address is also the member's staker address. Never use `listAccounts()`.
3. **A hash is not success.** Every provider hash goes into `tracked_txs` and is checked for
   `executionResult` and finality. Included-but-failed exists (NimJar, testnet 12 Sep 2026).
4. **Σ commitments ≤ active balance**, checked server-side with a fresh read inside the commit
   transaction.
5. **Release math:** `getBlockAfterReportingWindow(getElectionBlockAfter(b))`; jailed validator →
   later of that and `getBlockAfterJail(jailedFrom)`. Never `getBlockAfterCollateralLockup`.
6. **Remove:** `value` = fresh `retiredBalance`, `fee` = 0. Other staking fees from
   `apps/web/src/config/constants.ts` (create 300, add 200, unstake 300, retire 300 luna).
7. **Mode A payments are verified without matching the sender** (Nimiq Pay pays from a cosigned
   HTLC): recipient, value ≥ share, data `sq:<short_id>`, execution, finality.
8. **Nothing moves without a tap and Nimiq Pay approval.** No retries of wallet calls.
9. **RPC params are positional with explicit `null`s.** "Internal error" from
   `getStakerByAddress` = not a staker.
10. Amounts are integer luna (1 NIM = 100,000 luna). Format only at the UI edge.

## Errors (SDK 0.2.x)
`NimiqProviderError.is(e)` + `e.type`; never `instanceof` or message text. `PERMISSION_DENIED`
is normal. `init()` plain Error = not in Nimiq Pay. Every user-visible error is an entry in
`apps/web/src/core/errors/catalog.ts` `{ code, message, retryable, nextAction, changedAnything }`.

## Next.js rules
- The SDK touches `window`: load it only in client components (`'use client'`), never during
  server rendering. Wallet code lives in `apps/web/src/wallet/` and is never imported by
  `packages/ui`.
- `@nimiq/core` and the database are server-only (`import 'server-only'`).
- Route handlers validate input with Zod `.strict()` and return typed results.

## UI purity (the demo video renders the same components — must be 100% identical)
1. `packages/ui` components are **pure**: data, callbacks, `now` and animation progress come in
   as props. No fetch, no SDK, no `window.nimiqPay`, no `Date.now()`, no `Math.random()`, no
   `useEffect` data loading. IDs come from data, not generated.
2. Containers in `apps/web` load data and pass props. The video passes the same props from fixtures.
3. Design tokens (colours, spacing, radii, type) live only in `packages/ui/tokens.css`.
   Fonts are **self-hosted** files in `packages/ui/fonts` (no Google Fonts at runtime), so web and
   video render identical glyphs.
4. Safe areas come from CSS variables (`--safe-top`, `--safe-bottom`) defaulting to
   `env(safe-area-inset-*)`; the video's phone frame sets them explicitly.
5. Every screen has a **fixture scene** in `packages/ui/scenes/` (props for each state: empty,
   loading, backed, short, unstaking with countdown, releasable, paid, every error). Demo fixtures
   are **hand-written, realistic sample data** in `packages/ui/scenes/demo/` — the video is a
   how-to walkthrough, so sample squads and amounts are written by hand and labelled as samples.
   Never show invented usage statistics or traction numbers as if real.
6. Animations are driven by a `progress` (0–1), `now`, or **`t` (seconds since the scene
   started)** prop, never by timers inside components, so the video renderer can render each
   frame deterministically (HyperFrames seeks one paused timeline). `t` is the convention for the moving components (orbit, typewriter,
   count-up, ticker, gradient border); `apps/web/src/hooks/use-scene-time.ts` supplies it in
   the app, the video passes `frame / fps`, and `REDUCED_MOTION_T` is the frozen instant.
7. Canonical viewport: **390 × 844**. Every scene must look right there in light and dark.
8. Nimiq Pay's approval sheet is not our UI: never recreate it. The video shows a neutral
   "Approve in Nimiq Pay" step or real phone footage for that moment.

## Host
Inside Nimiq Pay = `typeof window.nimiqPay !== 'undefined'`. Block actions if
`window.nimiqPay.network` ≠ `NIMIQ_NETWORK`. Outside Nimiq Pay: read-only squad view + deeplink
(`https://nimpay.app/miniapps/open/<host>`).

## Design (Nimiq Pay's own principles)
Friendly on entry, playful when idle, **calm and deliberate on commit**. No confetti on a
transaction confirm. The irreversible step (retire) needs a confirm tick. 375 px minimum,
44 px targets, `env(safe-area-inset-*)`, check every screen at 390 px, light and dark.

## Dev harness
A dev-only `/scenes` route in `apps/web` lists every fixture scene at 390 × 844 (same
components as production; gated like the identities below).
`?as=alice|bob|carol` = real Ed25519 keys from fixed seeds; `?chain=mock` = scripted staker
records and tx outcomes (incl. included-but-failed, jailed validator). Both gated in one place
(`apps/web/src/dev/is-dev-server.ts`); a test proves production builds can't enable them.

## Comments
Record **why**, with the source (spike id, NimJar finding, doc section). Names say what.

## Code bar
Strict TS, no `any`, external input parsed as `unknown` → Zod `.strict()`. Discriminated
unions for results. Pure cores (`apps/web/src/core`, `apps/web/src/server/core`) with injected `now`, rpc, store.
DB `CHECK` constraints mirror the state machines. Files split past ~180 lines. Tests named as
behaviour with PRD IDs (`Q06 …`); `tests/adversarial/` attacks the guards.

## Never fabricate
No placeholder numbers shown as real (`—` until read); show the age of every chain read; no fake
success fallback; demo data labelled; README lists what isn't built.

## Gate
`pnpm gate` = typecheck + lint + unit + adversarial + build + secret scan, before every merge.

## Scope
New ideas → `docs/ROADMAP.md`. P0 finished and live on mainnet before any P1 work.
