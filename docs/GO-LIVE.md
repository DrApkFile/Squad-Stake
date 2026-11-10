# GO-LIVE — testnet → mainnet, one deployment

Written 2026-11-09, for the switch on **2026-11-10**. Live URL: <https://squad-stake.vercel.app>.

Squad Stake runs as **one** Vercel project. Nothing in the code is tied to a chain: every
network-specific value comes from `NEXT_PUBLIC_NIMIQ_NETWORK` through
`apps/web/src/config/network.ts` (RPC node, explorer base, Nimiq Validators API) and the host
guard in `apps/web/src/wallet/network.ts` compares the same variable with
`window.nimiqPay.network`. So the switch is one environment variable plus a redeploy — not a
branch, not a build flag, not a code change.

`tests/unit/network-config.test.ts` asserts that switch **and** scans every `.ts`/`.tsx` under
`apps/web/app` and `apps/web/src` for a hardcoded endpoint outside that one file, so a stray
testnet URL fails `pnpm gate` rather than reaching production. Re-checked by hand on
2026-11-09: the only non-comment occurrences of a network name outside `config/network.ts` are
the two defaults described under "The one asymmetry" below.

## Why the data has to go first

The database holds **testnet** squads: testnet staker addresses, commitments measured against
testnet balances, and testnet transaction hashes. After the switch every one of those rows
would be read back against **mainnet**, where those stakers and hashes do not exist. A member
would be shown "Not saving yet" for a stake that is real on the other chain, and the public
proof page would print mainnet RPC calls beside testnet hashes. That is fabricated proof, which
is the one thing this build will not do (`AGENTS.md`, "Never fabricate"). So the rows go.

## The checklist, in order

1. **Freeze.** `pnpm gate` from a clean tree (it ends with `check:tracked`, which only a commit
   clears). Note the commit you are deploying.
2. **Empty the data.** Point the shell at the production database's **direct** endpoint and run
   the reset. It prints the host and every table with its row count, and refuses unless it is
   given both `--confirm` and that exact host:

   ```sh
   export DATABASE_URL_UNPOOLED='postgres://…neon…?sslmode=require'   # the DIRECT string
   pnpm db:reset-data                      # prints the tables, deletes nothing, exits 1
   pnpm db:reset-data --confirm <host>      # the host it printed; now it truncates
   ```

   It empties `challenges`, `sessions`, `squads`, `memberships` and `tracked_txs` in one
   transaction and keeps `schema_migrations`, so the schema stays and `pnpm db:migrate` does
   not replay DDL. Everyone is signed out by this, including you.
3. **Migrations.** `DATABASE_URL_UNPOOLED=… pnpm db:migrate`. It is idempotent; on a database
   that is already current it prints "Migrations already applied."
4. **Switch the network.** Vercel → the project → Settings → Environment Variables →
   `NEXT_PUBLIC_NIMIQ_NETWORK` = `mainnet` for **Production** (and Preview, if you use it).
   Check the other three while you are there: `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`
   (direct), `APP_ORIGIN` = `https://squad-stake.vercel.app` with no trailing slash.
5. **Redeploy.** The variable is inlined into the client bundle at build time, so a restart is
   not enough: Deployments → the latest → *Redeploy*, with the build cache off. Wait for a
   green build (the deploy of `bc8d748` failed at typechecking and production kept serving an
   older build for a day — check the build log, not just the URL).
6. **Confirm the deployment is on mainnet.** Open `https://squad-stake.vercel.app/proof/whatever`
   in a browser: a missing squad is a 404, which is expected — then create the first squad in
   step 8 and open its proof page. It prints the network it read and the exact RPC endpoint, so
   it should say `mainnet` and `https://rpc.nimiqwatch.com`. That page is the check; the app
   never takes its own word for which chain it is on.
7. **Phone, on Default.** Open Nimiq Pay, make sure the wallet is on **Default** (mainnet), not
   testnet, and open the mini app: Nimiq Pay → Mini Apps → Custom URL →
   `https://squad-stake.vercel.app`, or the deeplink
   `https://nimpay.app/miniapps/open/squad-stake.vercel.app`.
   If the wallet is on the wrong network every action is blocked with "Nimiq Pay is on a
   different network" — that is the guard working, not a fault.
8. **The real first squad.** Sign in (one approval) → *Create squad* → commit → approve
   *Create staker* in Nimiq Pay → watch the status sheet to `INCLUDED_OK` → the squad page
   shows you **Saved**, from a mainnet chain read, with the age of the read beside it.
9. **Both pages load.** `/squads`, `/squads/<id>`, and `/proof/<shortId>` **signed out** (or in
   a private window) — the last one needs no session and no JavaScript.
10. **Submit.** `docs/SUBMISSION.md` has the form fields and the 250-word description. Put the
    live URL and the video link in the README and in `JUDGING.md` first.

## Going back to testnet for a fix

Same project, the other way round, and the data goes again — a mainnet squad read against
testnet is the same lie in the other direction:

1. `pnpm db:reset-data --confirm <host>` (it will delete the mainnet squads; if you want them
   kept, take a Neon branch or a dump first).
2. `NEXT_PUBLIC_NIMIQ_NETWORK` = `testnet`, redeploy.
3. Nimiq Pay → switch the wallet to testnet.

If you would rather keep mainnet live while testing a fix, do not switch this project: deploy a
second Vercel project from the same commit with its own Neon branch and its own `APP_ORIGIN`,
as the README's "Two deployments from this one repository" section sets out. The two never share
a database, a cookie or an origin.

## The one asymmetry, deliberately left in place

`serverEnv()` defaults `NIMIQ_NETWORK` to **testnet** when the variable is unset or misspelt, so
a missing variable can never point a deployment at mainnet. `appNetwork()` in
`apps/web/src/wallet/network.ts` defaults to **mainnet**. Either way the host guard's comparison
fails and every action stays blocked, so the asymmetry is safe — but it means a **typo in the
variable silently serves testnet reads**. That is why step 6 reads the network off the proof
page instead of trusting the setting.

## What this checklist cannot prove

Nothing here has been run against mainnet. The reset script itself was run on 2026-11-09
against a throwaway local PostgreSQL 18.6 cluster: it refused with no arguments and with a
wrong host, emptied five seeded tables with the right one, left `schema_migrations` at three
rows, and `pnpm db:migrate` afterwards reported "Migrations already applied."
