# Squad Stake
Save together for anything. Nobody holds the pot, every share is proven on the Nimiq chain,
and the money earns while you wait. A Nimiq Pay Mini App (Cycle 3, Save).

Implemented scope: workspace, signature-based sign-in, server chain reader and pure
member-status/release logic with a shared status badge. There is no live
deployment or demo video yet. Start with `AGENTS.md`.

Requires Node ≥22.15, pnpm 10.18.3 and Postgres (Neon is supported).

```sh
corepack enable
pnpm install
pnpm deps:check
cp apps/web/.env.example apps/web/.env.local
```

Set `DATABASE_URL` and `APP_ORIGIN` (the exact origin, without a trailing slash).
Set `NEXT_PUBLIC_NIMIQ_NETWORK` to `mainnet` or `testnet`; rebuild after changing it.
For the migration CLI, export `DATABASE_URL` (or `DATABASE_URL_UNPOOLED`, which it prefers)
in the shell; it does not load Next's `.env.local`. Run `pnpm db:migrate`, then `pnpm dev`.
Production requires HTTPS.

## Brand
The logo is an original drawing in code: a warm goal at the centre, three members on a ring
that breaks at each of them — the squad around the goal, nobody in the middle, because nobody
holds the pot. It borrows **no shape** from Nimiq (the hexagon is Nimiq's); it borrows Nimiq's
colours, which is what a mini app should look like. The words "Squad Stake" are outlines
generated from the Mulish 700 file this repo self-hosts, so the lockup needs no font wherever
there is no stylesheet.

One list of shapes in `packages/ui/brand/shapes.ts` feeds both the React components
(`LogoMark`, `Logo`, `AppIcon`, used in every screen header) and the files below;
`tests/unit/brand.test.ts` fails if the two ever differ or if an exported file is stale.

`pnpm brand:export` rewrites `apps/web/public/brand/` (it needs the system Chromium that
`pnpm check:scenes` already uses — no image library is installed):

| File | What it is |
|---|---|
| `logo.svg` · `logo-on-dark.svg` · `logo-white.svg` · `logo-navy.svg` | the lockup, four variants |
| `logo-mark*.svg` | the mark alone, the same four |
| `app-icon.svg` | the white mark on Nimiq's warm radial, 18% clear space on every side |
| `icon-16/32/180/192/512/1024.png` | favicon · apple-touch-icon · manifest · store listing |
| `favicon.ico` | 16 and 32 px, assembled from those PNGs |
| `logo.png` · `logo-on-dark.png` | the lockup at 256 px tall, for a README or a slide |

Run `node scripts/build-wordmark.mjs` only if the Mulish file changes; it needs
`woff2_decompress` (Google's own woff2 tool) and writes `packages/ui/brand/wordmark.ts`.

## Deploy
Vercel (Next.js on `apps/web`) with Neon Postgres added through the Vercel Marketplace, which
provisions `DATABASE_URL` (pooled, PgBouncer in transaction mode) and `DATABASE_URL_UNPOOLED`
(direct). Exact project settings:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Include source files outside of the Root Directory in the Build Step | **enabled** — `packages/ui`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` live above it |
| Install Command | `npm_config_store_dir=/tmp/pnpm-store npm_config_cache_dir=/tmp/pnpm-cache npm_config_cache=/tmp/npm-cache pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | `.next` (the default) |
| Node.js Version | 22.x (the root `engines` field requires ≥22.15 and `engine-strict` is on) |

`apps/web/vercel.json` already sets the framework and both commands, so a new project picks
them up without touching the dashboard. The environment prefixes in the install command exist
because this repository's `.npmrc` pins pnpm's store and caches to absolute paths inside the
developer's checkout (see "Environment and commands" in `docs/PROGRESS.md`); on a build machine
those paths do not exist, so the install is redirected to a writable one. `next.config.ts` sets
`outputFileTracingRoot` to the repository root so the workspace's linked packages are traced.

Environment variables, all four needed in Production (and Preview, if used):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon's **pooled** connection string (host ends in `-pooler`), kept as the Marketplace sets it, with `sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Neon's **direct** connection string; used by `pnpm db:migrate` |
| `APP_ORIGIN` | the deployment's exact origin, e.g. `https://squad-stake.vercel.app`, no trailing slash (HTTPS is enforced in production) |
| `NEXT_PUBLIC_NIMIQ_NETWORK` | `mainnet` or `testnet`, matching the network Nimiq Pay is on; it is inlined at build time, so redeploy after a change |

Vercel runs no migrations. Apply them from a shell with the direct endpoint:
`DATABASE_URL_UNPOOLED=… pnpm db:migrate` (it is idempotent and takes a transaction-scoped
advisory lock).

### Two deployments from this one repository

A mainnet copy and a testnet copy are the **same commit deployed twice**, never a branch or a
build flag: two Vercel projects, each with its own Neon branch and its own `APP_ORIGIN`.

| | mainnet copy | testnet copy |
|---|---|---|
| Vercel project | e.g. `squad-stake` | e.g. `squad-stake-testnet` |
| `NEXT_PUBLIC_NIMIQ_NETWORK` | `mainnet` | `testnet` |
| Neon | the `production` branch | a second branch (Neon → Branches → *Create branch* from `production`), which has its own pooled and direct strings |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | that branch's pooled / direct string | the other branch's pooled / direct string |
| `APP_ORIGIN` | that project's own origin, e.g. `https://squad-stake.vercel.app` | that project's own origin, e.g. `https://squad-stake-testnet.vercel.app` |
| Migrations | `DATABASE_URL_UNPOOLED=<that branch> pnpm db:migrate` | the same command against the other branch |
| Nimiq Pay deeplink | `https://nimpay.app/miniapps/open/<that project's host>` (built from `APP_ORIGIN`) | the same, with the other host |

Everything else is identical, and every setting in the table above is read at run time or
inlined at build time from those four variables — so the two copies never share a database, a
session cookie or an origin. Two separate Neon branches also mean a testnet squad can never
appear on the mainnet copy: the squads are rows, and the rows are in different databases.

Why it is safe to deploy the same commit to both: **every network-specific value comes from
`NEXT_PUBLIC_NIMIQ_NETWORK`**, and there is one place that turns it into values —
`apps/web/src/config/network.ts`:

| Value | mainnet | testnet |
|---|---|---|
| RPC node (every chain read, and the call the proof view prints) | `https://rpc.nimiqwatch.com` | `https://rpc.testnet.nimiqwatch.com` |
| Explorer base (transaction links on the leaving and pay screens) | `https://nimiq.watch/#` | `https://test.nimiq.watch/#` |
| Nimiq Validators API (PRD §7.7 pool data) | `https://validators-api-main.je-cf9.workers.dev/api/v1/validators` | `https://validators-api-test.je-cf9.workers.dev/api/v1/validators` |

The host guard is driven by the same variable: `apps/web/src/wallet/network.ts` blocks every
action unless `window.nimiqPay.network` equals it, so a testnet build opened inside a mainnet
Nimiq Pay can read but cannot act, and the other way round. `serverEnv()` defaults the variable
to `testnet` when it is unset or misspelt, so a missing variable can never point a deployment
at mainnet; the client-side guard's own default is `mainnet`, which fails the comparison and
therefore also blocks actions. The proof view prints the network it read and the exact RPC
call, so a reader can tell the two copies apart without taking the app's word for it.

Grep for a hardcoded chain before deploying: `rg 'nimiq\.watch|nimiqwatch|workers\.dev' --type ts
apps packages` should only hit `apps/web/src/config/network.ts`, the fixture scenes in
`packages/ui/scenes/` (sample data, labelled as such) and comments recording where a recording
came from.

The request-path client uses the pooled URL with `prepare: false`, because PgBouncer's
transaction mode cannot keep a named prepared statement alive between statements, and with
`ssl: 'verify-full'`, which authenticates Neon's publicly trusted certificate rather than only
encrypting as `sslmode=require` does; a loopback database may still be plaintext. The
commitment rule's `SELECT … FOR UPDATE` transaction is unaffected: transaction-mode pooling
pins one server connection for a whole `BEGIN … COMMIT`, so the row locks last until the
commit, and the commit path uses no session-lifetime state. The reasoning sits in
`apps/web/src/server/lib/db-config.ts`; `tests/unit/db-config.test.ts` asserts it.

`pnpm gate` runs strict typechecking, lint (including UI purity), unit tests,
adversarial tests, the Next build, Q16 checks against the production artifact,
and a local secret scan, followed by the dependency-age check. `pnpm deps:check`
runs `scripts/check-dep-age.mjs`: it checks exact dependency pins in every
repository `package.json` (including spikes, optional and peer dependencies) using
`npm view` publication dates, and writes `.cache/dependency-ages.json` only after
all pins pass. Local `workspace:` links have no
registry publication date. The gate finishes with `git diff --exit-code` for both
unstaged and staged tracked changes; run it from a clean working tree.
pnpm's `minimumReleaseAge` also guards transitive dependencies at install time.

Sign-in uses one `sign()` approval, the official Nimiq signed-message digest,
five-minute single-use browser-bound challenges and seven-day sessions. The signer
is discovered from the verified public key, never `listAccounts()` or a claimed
address. Session cookies are HttpOnly, SameSite=Strict and Secure over HTTPS; only
their SHA-256 hashes are stored. Failed persistence cannot report success.

For local fixtures, run `DEV_HARNESS=1 pnpm dev`. `/scenes` shows five sign-in
states, eleven member-status cases and twenty-three create/join/commit/leave states
in light and dark at 390 × 844. `/?as=alice`, `/?as=bob` and `/?as=carol`
select reproducible Ed25519 test identities; tap the sign-in button to use the same
challenge/verification/session flow. The server derives and uses these keys only
in development. They are public test identities: never fund them. The central
gate refuses identities, mock switches and `/scenes` in production artifacts,
even if development flags are supplied at runtime. No mock chain provider is
implemented yet.

`createRpcClient({ url })` in `apps/web/src/server/lib/rpc.ts` exposes nine typed,
strictly parsed read methods with a five-second timeout. Staker and validator
reads cache per address for 60 seconds within that client instance; reuse the
client within the server process. `{ fresh: true }` bypasses the cache for future
commit transactions. Reads return `readAt` in Unix milliseconds. Refresh failures
return an error and any `lastKnown` snapshot with its original timestamp.
No balance or member status is ever stored; every one is derived from a read.

Squad create, join by invite link, commit and leave exist as route handlers under
`apps/web/app/api/` over a store interface, with migration `002-squads.sql` for
`squads`, `memberships` and `tracked_txs`. Only the hash of an invite token is
stored. A commitment is written inside one member-locked transaction that re-reads
the staker with `{ fresh: true }` and refuses when the sum of commitments across
active squads would exceed the active balance; when the member first needs a
create-staker or add-stake transaction, the commitment is saved only after that
transaction is `INCLUDED_OK` (executed and final). **None of this has run against a
database or a wallet yet** — `DATABASE_URL` is unset, so the invariant is proven
only against an in-memory store that serialises locks the way `SELECT … FOR UPDATE`
does, and no staking transaction has been signed or sent.

`pnpm test:live` skips its single test unless explicitly enabled with
`LIVE_RPC=1 pnpm test:live`. It reads the known spike staker on testnet and exercises
all nine methods plus the non-staker mapping; it signs and sends nothing. Unit
and adversarial tests use the raw recording in `tests/fixtures/rpc/testnet.json`.
`node scripts/build-chain-scenes.mjs` refreshes the UI projection of that recording.
Leaving-state fixtures are labelled synthetic cases, not observed mainnet proof.

Every screen is reachable from `/`: welcome and sign-in, My squads, create (with the privacy
notice first), the invite page at `/s/<token>` (and `/join/<token>`), the squad page at
`/squads/<id>` with its member list, and a **public proof view at `/proof/<shortId>`** that
needs no session, no wallet and no JavaScript, and prints the RPC call to repeat.
A member's own shortfall is shown to them and masked for everyone else, because the gap
between a commitment and an active balance is a balance.

`packages/ui` owns the screens, badge, styles, Nimiq design tokens, self-hosted Mulish and
Fira Mono, and the labelled fixture states; it stays pure, with every animation a function of
a `t` prop in seconds (so Remotion can render it frame by frame) and no timers, fetches or
clocks inside it. Fixtures contain no invented mainnet proof.
`apps/video` is an empty placeholder with no Remotion dependency.

Not built: the goal-day planner and the three leaving steps (set-active-stake, retire,
remove), Mode A payments and their on-chain check, pool-aware validator choice, fiat and
earned-so-far figures, mainnet evidence, Remotion and real-phone verification of the new
screens. This is not the complete P0 app.

Not yet verified by this repository's own runs: no staking or payment transaction has been
signed, sent or tracked on any network by any test here, and nothing in this slice has run on
a real phone inside Nimiq Pay. The builder reports the app deployed on Vercel against a Neon
database with migrations `001` and `002` applied, and sign-in working there inside Nimiq Pay
on testnet (2026-11-07); migration `003-invite-token.sql` is new in this slice and still has
to be applied. Pinned dependencies, the lockfile and the full gate were verified
(see `docs/PROGRESS.md`).
