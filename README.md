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

`packages/ui` owns the screens, badge, styles, tokens, bundled fonts and synthetic fixture
states. Fixtures are explicitly labelled and contain no invented mainnet proof.
`apps/video` is an empty placeholder with no Remotion dependency.

Not built: the squad page and member list, the goal-day planner and leaving steps,
Mode A payments and their on-chain check, pool-aware validator choice, fiat and
earned-so-far figures, mainnet evidence, Remotion, deployment and real-phone
verification. This is not the complete P0 app.

Not yet verified, even where the code exists: no database has been migrated or
written to, no staking or payment transaction has been signed, sent or tracked on
any network, and nothing has run on a real phone inside Nimiq Pay. Pinned
dependencies, the lockfile and the full gate were verified (see `docs/PROGRESS.md`).
