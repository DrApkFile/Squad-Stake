# Squad Stake — Architecture

Written 2026-10-22 (v2: Next.js + shared UI package + Remotion video). Hosting: Vercel. DB: Postgres (Neon).

## Repository layout (pnpm workspace)
```
packages/ui/          pure display components + tokens.css + self-hosted fonts + scenes/ (fixtures)
apps/web/             Next.js App Router (Vercel)
  app/(app)/...       pages = containers: load data, call wallet, pass props to packages/ui
  app/api/**/route.ts route handlers, runtime 'nodejs'
  src/wallet/         client only: init, sign, 6 staking calls, sendBasicTransactionWithData, network check
  src/core/           pure client logic: planner math, error catalog, staking-actions
  src/server/core/    pure server logic: commitment invariant, member status, release math, payment checks, tx tracker
  src/server/lib/     rpc (nimiqwatch), db, env, cache (server-only)
  app/scenes/         dev-only gallery of every fixture scene at 390x844
apps/video/           Remotion: phone frame + scripted timeline rendering packages/ui scenes
evidence/             generated proof files (mainnet run); source for demo fixtures
```

## Layers
```
Nimiq Pay WebView ── apps/web (Next.js client components) ── packages/ui (pure)
        │ HTTPS JSON (session cookie)                          ▲
apps/web route handlers (Node) ── Postgres                     │ same components
        │                                                      │
Nimiq JSON-RPC (nimiqwatch)                     apps/video (Remotion, fixtures from evidence/)
        │                         │
   Postgres (Neon)        Nimiq JSON-RPC: rpc.nimiqwatch.com / rpc.testnet.nimiqwatch.com
```
Truth: chain. Stored: squads, memberships, commitments, tracked tx hashes. Never stored as
truth: balances, member statuses (derived on every read, cached 60 s).

## Data model
```sql
CREATE TABLE challenges (id uuid PRIMARY KEY, message text NOT NULL,
  expires_at timestamptz NOT NULL, consumed_at timestamptz);
CREATE TABLE sessions (token_hash bytea PRIMARY KEY, address text NOT NULL,
  public_key bytea NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE squads (
  id uuid PRIMARY KEY, short_id text UNIQUE NOT NULL,          -- 8 chars, used in tx data
  name text NOT NULL, mode text NOT NULL CHECK (mode IN ('A','B')),
  target_luna bigint, recipient text,                            -- A only
  goal_at timestamptz NOT NULL, organiser text NOT NULL,
  invite_token_hash bytea NOT NULL,
  invite_token text,            -- migration 003: plaintext, so the squad page can re-share the
                                -- link. The lookup is still by hash. Never done for a session.
  state text NOT NULL CHECK (state IN ('OPEN','SAVING','LEAVING','SETTLING','COMPLETED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (mode = 'B' OR (target_luna > 0 AND recipient IS NOT NULL)));
CREATE TABLE memberships (
  squad_id uuid REFERENCES squads(id), address text NOT NULL,
  personal_target_luna bigint,                                   -- B
  committed_luna bigint NOT NULL DEFAULT 0 CHECK (committed_luna >= 0),
  joined_at timestamptz NOT NULL DEFAULT now(), left_at timestamptz,
  PRIMARY KEY (squad_id, address));
CREATE TABLE tracked_txs (
  hash text PRIMARY KEY, address text NOT NULL, squad_id uuid REFERENCES squads(id),
  kind text NOT NULL CHECK (kind IN ('create','add','unstake','retire','remove','pay')),
  expected jsonb NOT NULL,                                       -- recipient/value/data for checks
  state text NOT NULL CHECK (state IN ('SUBMITTED','INCLUDED_OK','INCLUDED_FAILED','UNKNOWN')),
  created_at timestamptz NOT NULL DEFAULT now(), checked_at timestamptz);
```
Commitment invariant enforced in one transaction: lock the member's rows, read fresh staker
(bypass cache), refuse if Σ committed_luna (active squads) > active balance.

## Endpoints

### Sign-in implementation details

`POST /api/auth/challenge` accepts an empty strict JSON object. It signs the
configured origin, UUID nonce, five-minute deadline and hash of a random browser
binding carried in an HttpOnly cookie. The SDK reveals the signer only in the
`sign()` result, so the first sign-in cannot preselect a wallet key. Verification
checks the signature against that key and derives its staker address; a signature
paired with a different key is refused. No claimed address is accepted.

`POST /api/auth/verify` accepts only `{ id, publicKey, signature }`. It loads the
stored message, checks its browser binding, consumption and expiry, then verifies
the Nimiq message digest using `@nimiq/core`. A conditional UPDATE and INSERT in
one SQL statement consume the challenge and create the session atomically. The
cookie holds a random 256-bit token; the sessions table holds only its SHA-256
hash. Session lifetime is seven days. Both POSTs require the configured Origin
and return `Cache-Control: no-store`; HTTPS cookies are Secure and SameSite=Strict.

`apps/web/src/dev/is-dev-server.ts` is the single gate for the fixture gallery,
test identities and future mock-chain selection. Identity keys live in a
server-only module loaded after the gate. A dev-only POST signs the normal
challenge and calls the normal verifier; it cannot bypass session persistence.
The production artifact test attempts to enable these capabilities using runtime
environment variables and query parameters, and expects refusal.

| Method + path | Does |
|---|---|
| `POST /api/auth/challenge` · `POST /api/auth/verify` | sign-in |
| `POST /api/squads` | create |
| `GET /api/squads` | the viewer's squads (our record of commitments; no chain read) — **built** |
| `GET /api/squads/:id` | squad + per-member derived status + `readAt`; members only, another member's `shortBy` masked — **built** |
| `POST /api/squads/:id/join` | invite token → membership |
| `POST /api/squads/:id/commit` | set commitment (invariant) |
| `POST /api/squads/:id/leave` | leave |
| `POST /api/tx` · `GET /api/tx/:hash` | record + check tracked tx |
| `GET /api/plan/:id` | leave-by, current release estimate, jail warnings |
| `GET /api/proof/:id` | public, no session: members (full addresses), committed, derived status, last chain read, the RPC call to repeat — **built** (payments arrive with §7.6) |

Reads are `GET`s and so do not require an `Origin` header (browsers omit it on same-origin
GETs); every state-changing `POST` does. `GET /api/proof/:id` has no session guard at all.
The store adds `getSquadByShortId`, `listMembers` (members who left included — §7.4 lists
LEFT), `squadsForAddress` (one query: squad + the viewer's commitment + member count + Σ
committed) and `latestOpenTrackedTx` (SUBMITTED/UNKNOWN only, so a roster row can say pending).

## RPC rules (from spikes)
Positional params, explicit `null` for optional ones. Allowed and used: `getBlockNumber`,
`getEpochNumber`, `getStakerByAddress`, `getAccountByAddress`, `getTransactionsByAddress`,
`getTransactionByHash`, `getElectionBlockAfter`, `getBlockAfterReportingWindow`,
`getBlockAfterJail`, `getActiveValidators`, `getValidatorByAddress`. Not used:
`getStakersByValidatorAddress`, `getBlockAfterCollateralLockup` (not allowed on public RPC).

## Video pipeline
Hand-written typed fixtures in `packages/ui/scenes/demo/` (realistic sample data, no generation
step) → `apps/video` composes them on a timeline inside a phone frame → `pnpm video:render`
outputs MP4. Same components, same tokens, same fonts as production.

## Vercel notes
Route handlers are short-lived: no background loops; everything is computed on request with
bounded RPC calls (5 s timeout each). Scheduled jobs are not relied on.
Project root directory `apps/web` (pnpm workspace; `apps/web/vercel.json` holds the commands).
Neon via the Vercel Marketplace: the request path uses the pooled `DATABASE_URL` with
`prepare: false` (PgBouncer transaction mode) and verified TLS; `pnpm db:migrate` uses
`DATABASE_URL_UNPOOLED`. Transaction pooling keeps `FOR UPDATE` row locks for a whole
`BEGIN … COMMIT`, so the commitment invariant's member lock is unaffected
(`apps/web/src/server/lib/db-config.ts`). Settings are listed in the README's "Deploy" section.
