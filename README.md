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
For the migration CLI, export `DATABASE_URL` in the shell; it does not load Next's
`.env.local`. Run `pnpm db:migrate`, then `pnpm dev`. Production requires HTTPS.

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
states and eleven member-status cases in light and dark at 390 × 844. `/?as=alice`, `/?as=bob` and `/?as=carol`
select reproducible Ed25519 test identities; tap the sign-in button to use the same
challenge/verification/session flow. The server derives and uses these keys only
in development. They are public test identities: never fund them. The central
gate refuses identities, mock switches and `/scenes` in production artifacts,
even if development flags are supplied at runtime. No mock chain provider is
implemented yet.

`createRpcClient({ url })` in `apps/web/src/server/lib/rpc.ts` exposes seven typed,
strictly parsed read methods with a five-second timeout. Staker and validator
reads cache per address for 60 seconds within that client instance; reuse the
client within the server process. `{ fresh: true }` bypasses the cache for future
commit transactions. Reads return `readAt` in Unix milliseconds. Refresh failures
return an error and any `lastKnown` snapshot with its original timestamp.
No squad route or database balance/status persistence is implemented.

`pnpm test:live` skips its single test unless explicitly enabled with
`LIVE_RPC=1 pnpm test:live`. It reads the known spike staker on testnet and exercises
all seven methods plus the non-staker mapping; it signs and sends nothing. Unit
and adversarial tests use the raw recording in `tests/fixtures/rpc/testnet.json`.
`node scripts/build-chain-scenes.mjs` refreshes the UI projection of that recording.
Leaving-state fixtures are labelled synthetic cases, not observed mainnet proof.

`packages/ui` owns the screens, badge, styles, tokens, bundled fonts and synthetic fixture
states. Fixtures are explicitly labelled and contain no invented mainnet proof.
`apps/video` is an empty placeholder with no Remotion dependency.

Not built: privacy notice, squads, commitment persistence/guards, wallet staking, payments,
transaction tracking/finality checks, goal-day planner UI, mainnet evidence, evidence-derived demo fixtures,
Remotion, deployment and real-phone verification. This is not the complete P0 app.

Pinned dependencies, the lockfile and the preceding sign-in slice's full gate
were verified (see `docs/PROGRESS.md`). Database migration and real-phone
verification remain open. Use `npx pnpm@10.18.3` if the installed pnpm differs.
