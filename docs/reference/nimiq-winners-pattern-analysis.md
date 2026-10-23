# Nimiq Mini Apps — What the Winning Repos Actually Did

A code-level analysis of seven winning Nimiq Pay Mini Apps competition entries, written
to be replicated. Every claim below is tagged:

- **[evidence]** — read directly from the code, with the file path given
- **[measured]** — counted mechanically across all seven repos
- **[inference]** — my judgement about *why* it probably mattered; weigh it yourself

Analyzed at shallow clone depth 50, October 2026.

## The repos

| # | Repo | Focus | Stack | Commits | Tracked files |
|---|---|---|---|---|---|
| 1 | `kaichaosun/knock-chat` | Wallet-to-wallet messaging, spam priced out | React + Vite + TS, relay backend | 55 | 212 |
| 2 | `Jayobebe/Blacktop` | Tipping / payments, native wrappers | Vite + TS + Tailwind, Capacitor (iOS+Android), Drizzle | 67 | 1850 |
| 3 | `Andjroo111/nimiq-kids` | Kids' allowance / custody, parent+kid shells | Bun + TS, own HD custody, Fly.io | 9 | 1154 |
| 4 | `LegendaryTunzeverywhere/PROOF` | Chess / proof-of-play, treasury | Node server + web + React rewrite, Prisma, Railway | 50 | 329 |
| 5 | `harlski/nspace` | Multi-service platform, ads/payouts | TS monorepo, 4 microservices, Docker | 53 | 1644 |
| 6 | `nimjump/game` | Skill game with on-chain rewards | Go backend + wasm game, BadgerDB, CF Pages | 59 | 1533 |
| 7 | `mystiquemide/nimquest` | Learn-and-prove quests | Vanilla JS + Cloudflare Worker + D1 | 50 | 57 |

Note the spread: 57 to 1850 files, vanilla JS to a Go backend to a four-service monorepo.
**[inference]** There is no winning stack. What recurs is a trust model and a presentation
standard, not a framework.

---

## 1. The one thing all seven do

### Identity is a server-verified signature, never a client-claimed address

Every repo: call `sign()` → ship `{ publicKey, signature }` to a server → verify Ed25519
over the Nimiq signed-message digest → **derive the address from the public key
server-side**.

**[evidence]** per repo:

- `nimjump-game/backend/game/nimiq.go` — `crypto/ed25519` verification in Go
- `LegendaryTunzeverywhere-PROOF/server/auth.js` — header comment states it plainly:
  > *"A wallet address alone NEVER grants access — only a verified signature."*
  with `verifySignature({ mode, publicKey, signature, message })` → `verifyBytes(publicKey, nimiqMessageDigest(message), signature)`
- `harlski-nspace/client/src/auth/nimiq.ts` — signs `Login:v1:${nonce}`, posts to
  `POST /api/auth/verify`; comment: *"Server derives the user-friendly address from the
  public key after verifying the signature."*
- `mystiquemide-nimquest` — Cloudflare Worker verifies the signature, derives the signer,
  stores the completion in D1
- `kaichaosun-knock-chat/src/lib/wallet.ts` — relay challenge signed by whichever of three
  signers answered; identity *is* whatever key signed

**knock-chat goes furthest: it never calls `listAccounts()` at all.** Its own comment:

> *"Note the absence of a `listAccounts()` call: the signature carries the public key, and
> whichever account the wallet chooses to sign with is the account the user meant — which
> also settles 'which of my accounts is this?' without us guessing at index zero."*

That is exactly right, and it is the detail most entrants would get wrong. `listAccounts()`
shares addresses; it does not prove ownership, and its order is not a signer rule. An app
that treats `accounts[0]` as the user's identity is both wrong and spoofable.

### Paired with challenge/nonce discipline

**[measured]** occurrences of anti-replay vocabulary:

| Repo | `nonce` | `challenge` | `expir`/ttl | single-use | `replay` |
|---|---|---|---|---|---|
| nimiq-kids | 50 | 344 | 187 | 16 | 81 |
| Blacktop | 3 | 282 | 205 | 0 | 39 |
| PROOF | 125 | 1125 | 32 | 4 | 48 |
| nspace | 136 | 335 | 470 | 0 | 124 |
| knock-chat | 95 | 38 | 35 | 0 | 14 |
| nimquest | 7 | 205 | 44 | 0 | 12 |
| nimjump | 9 | 74 | 150 | 3 | 882 |

`nimquest`'s README states the shape in one line: *"wallet-bound, five-minute expiry,
single-use."*

**Replicate exactly.** Cheapest high-value thing in this document.

---

## 2. Patterns ranked by recurrence × replicability

### 2.1 Escape the phone-only trap: Nimiq Hub fallback

**[measured]** 5 of 7 reference `hub.nimiq.com`. Two ship it as a real dependency:
`knock-chat` (`@nimiq/hub-api ^1.14.0`), `nspace` (`^1.13.0`).

**[evidence]** `knock-chat/src/lib/wallet.ts` names the payoff:

> *"Inside Nimiq Pay the host injects `window.nimiq` and the SDK's `init()` resolves with
> it. In an ordinary browser there is no provider, so the Nimiq Hub signs in a popup
> instead — which is what makes a desktop tab a place the app works rather than a dead
> end."*

**[inference]** This is the highest-ROI pattern after the signature model. Anyone
evaluating your app will at some point open it on a laptop. An app that shows only a
`nimiqpay://` link there looks broken — and a desktop cannot open that scheme at all.

Three implementation details worth stealing verbatim:

**(a) Detect the host, don't guess the device.**

```ts
// knock-chat
export function insideNimiqPay(): boolean {
  return typeof window.nimiqPay !== "undefined"
}
```

Its comment explains why this beats `init()` for the question being asked: the host context
is seeded *before* page scripts run, while the provider arrives whenever it arrives — so
this answers "is a wallet coming?" even before one has.

And why not sniff the user agent:

> *"a user agent is a claim, not a fact, and iPadOS calls itself a Macintosh… Wrong about a
> phone and its owner loses the app entirely; wrong about a desktop and somebody sees one
> button that does nothing. Asking is wrong in neither direction."*

**(b) Detect whether the deeplink worked, rather than predicting it.** `openNimiqPay()`
attaches `pagehide` + `visibilitychange` listeners *before* navigating to
`nimiqpay://miniapp?url=…`, then resolves `answered: false` if the page is still visible
after a 1500 ms grace. An app that opened takes the page into the background; nothing
happening means nothing took it.

**(c) Preserve the query string in the deeplink** so an invite survives the trip from a
phone camera scan into the app:

```ts
const here = window.location.host + window.location.pathname + window.location.search
return `nimiqpay://miniapp?url=${encodeURIComponent(here)}`
```

**(d) Set the Hub endpoint explicitly.** `knock-chat` hardcodes `https://hub.nimiq.com`
because the SDK default reads the page domain and sends anything that isn't `nimiq.com` to
`localhost:8080` — i.e. a wallet nobody is running.

**(e) Lazy-import the Hub.** It is ~11 kB that will never be asked anything on a phone:

```ts
const HubApiClass = (await import("@nimiq/hub-api")).default
```

Imported while connecting, long before any click, so the popup still opens on the tap.

### 2.2 Server-side authority over anything valuable

Not just payments — **anything a cheater would want to control**.

**[evidence]**

- `nimquest` — the quiz answer key never enters the browser bundle; grading is server-side.
  README: *"Quizzes that live in the browser are worse, the answers ship in the page and you
  can cheat in five seconds."*
- `nimjump` — deterministic map generation + **server-side replay verification**. Their
  README documents finding and fixing a client-seed exploit: the client used to generate the
  game seed (to support offline play), so a player could re-roll until they got a favourable
  map. Fixed by issuing **batches of server-signed seeds** consumed during offline play and
  verified as authentic/unused on reconnect. Offline play preserved, exploit closed.
- `nspace/payment-intent-service/src/nim/rpcTx.ts` — fetches the transaction via
  `getTransactionByHash` on a public JSON-RPC node and checks `confirmations`,
  `blockNumber`, `to`, `value`, `recipientData` before honouring it. State is only
  `"included"` when `blockNumber > 0 && confirmations > 0`.
- `PROOF/server/services/nimiq-treasury.js` — separate treasury service.
- `nimiq-kids/src/wallet/earn-settlement.ts` — server-side settlement.

This is the framework docs' rule — *a returned hash identifies the transaction, it does not
prove execution or finality* — actually implemented. **[inference]** Most entrants treated a
resolved `sendBasicTransaction()` as payment received.

### 2.3 A dev harness that works without a phone

**[measured]** 4 of 7 ship one: `knock-chat` (`?as=`), `nspace` (`?payEmulate`),
`Blacktop` (`DEMO_MODE`), `nimiq-kids` (`demo-gate`).

**[evidence]** `knock-chat`'s is the best designed. Four dev identities
(`?as=alice|bob|carol|dave`) are **real Ed25519 keypairs from fixed seeds**, not fake
addresses, with the seeds matching the relay's test wallets:

> *"That matters: the relay authenticates everyone by verifying a signed challenge, so a dev
> identity has to be able to actually sign one. Giving the dev path real keys means the relay
> needs no test-only bypass — there is no back door to forget to close."*

Two further decisions worth copying:

- **Opt-in, never default.** Plain `npm run dev` does *not* sign you in as alice; it reaches
  for your real wallet exactly as a phone does. Their note on why: the old behaviour meant
  the only way to reach your own wallet was `NODE_ENV=production npm run dev`, *"which is a
  lie told to the bundler to get a truthful sign-in."*
- **Gated on the dev server in one place** (`DEV_SERVER`), so a shipped build can never hand
  out a seed-derived key, and every caller inherits that answer.

Open two tabs as alice and bob and you have a real two-party conversation with no phone in
the loop. **[inference]** This compounds: faster iteration shows up as polish by deadline.

### 2.4 Judge-facing documentation

**[measured]** README lines: nimjump 686, nimquest 315, nimiq-kids 248, PROOF 210,
knock-chat 186, nspace 127, Blacktop 93. Markdown files at root+`docs/`: nspace 38,
PROOF 35, nimiq-kids 18, knock-chat 8, nimquest 4, Blacktop 5, nimjump 3.

**[evidence]** Three distinct moves worth copying:

**(a) `nimquest` — lead with proof it exists, then tell the story.** Line 7 of the README is
a row of links: live Mini App · product walkthrough video · launch post · in-app docs ·
leaderboard. Then a personal problem statement:

> *"Every time I onboard to a new chain, the 'learning' is read-only. I skim a docs page,
> nod, and close the tab with nothing to show I understood any of it."*

Then an explicit anti-positioning — *"I did not build a token faucet, an airdrop farm, or a
browser quiz you can cheat by reading the source"* — and an honest scope statement: *"The
real receipt so far: one Meet Nimiq completion signed inside Nimiq Pay on an iPhone, stored
in D1, visible on the live leaderboard."* It also includes an operation→result table that
doubles as a spec.

**(b) `nimjump` — pre-empt the hardest critique.** The README opens with a QA disclaimer
*inviting* the judges to try to cheat (memory editing, packet interception, code injection),
then lists the two known cheating vectors, explains why a bot is economically impractical
against score-driven deterministic RNG, and marks the seed vector `~~struck through~~` with
a fix date. Confidence plus honesty, in the first screen.

**(c) `knock-chat` — ship the thinking.** Root-level `ARCHITECTURE.md`, `CONCEPTS.md`,
`SPEC.md`, `RESEARCH.md`, `ROADMAP.md`, `SPAM-PROTECTION.md`, `DMTO-EVALUATION.md`.

**[inference]** This is a one-afternoon job and plausibly moved placement as much as any
code. A judge who cannot run your app reads your README.

### 2.5 Tests and CI

**[measured]**

| Repo | Test files | CI workflows |
|---|---|---|
| nimiq-kids | 194 | 5 (`ci`, `deploy`, `privacy-gate`, `changelog-fold`, `stack-align`) |
| nspace | 192 | 1 (`deploy-docker`) |
| knock-chat | 36 | 0 |
| PROOF | 17 | 0 |
| nimquest | 5 | 1 (`ci`, badge in README) |
| Blacktop | 0 | 1 (`native`) |
| nimjump | 0 | 0 |

**[inference]** Correlates but is not required — two winners shipped zero tests. The two
heaviest test suites belong to the two largest codebases, which is ordinary engineering
rather than a competition tactic. Worth doing; not worth panicking over.

### 2.6 Comments that record *why*, including postmortems

**[evidence]** The strongest differentiator in code quality, and free to replicate.

`nspace/client/src/pay/sendBasicWithData.ts`:

> *"Do **not** pass `validityStartHeight` — a stale `getBlockNumber()` from an unsynced Pay
> instance causes 'wallet validity end reached'. Let the wallet fill the current height."*

`nimjump-game/backend/game/nimiq.go` — a full bug postmortem living in a constant block: a
retry cooldown was wired to `RetryInterval.Seconds()` = 15 **seconds** while the comment
above it claimed 15 **minutes**, so every failed reward retried on the next tick forever,
which *caused and then perpetuated* the RPC rate limiting that made them fail, and re-pushed
still-in-flight transactions producing "Transaction already in mempool" on top. Now
`RewardRetryCooldown = 3 * time.Minute` with exponential backoff capped at 15 minutes.

`knock-chat/src/lib/wallet.ts` — the Hub popup constraint, which is non-obvious and will
bite anyone adding Hub fallback:

> *"The Hub signs in a popup, and a browser only allows a popup while the click that asked
> for it is still in hand — put an `await` in between and it is blocked, unconditionally on
> Safari."*

Its fix is a design decision, not a workaround: the signer and payer types accept
`message | Promise<message>` so the window opens on the click and the payload arrives after.
And it notes the second benefit — Nimiq Pay raises no dialog until the promise settles, so a
failed pre-check costs nothing and shows nothing: *"the order that matters — decide first,
spend second — is the one the promise states."*

### 2.7 Defensive handling of what the bridge really returns

**[evidence]** `nspace/client/src/auth/nimiq.ts` has `coerceSignBytes()` accepting
`Uint8Array | ArrayBuffer | number[] | hex string | base64 string`, with a comment: *"Nimiq
Pay may return `string`, `Uint8Array`, or JSON numeric byte arrays from the native bridge."*
Plus `decodeBinaryString()` that sniffs hex vs base64.

**[inference]** That is hard-won, undocumented knowledge. Normalize at the boundary rather
than trusting one shape.

### 2.8 Platform-constraint workarounds

**[evidence]** `nimjump`'s best trick: send **1 luna** (the smallest indivisible amount) to a
player purely to trigger **Nimiq Pay's own "payment received" notification**, because a
WebView has no Web Push and no way to reach a player who isn't in the game. The wallet app's
notification becomes your push channel.

**[inference]** Directly stealable, and exactly the kind of platform-native thinking that
reads as mastery rather than compliance.

### 2.9 Mobile chrome

**[measured]** `safe-area-inset` / `env(safe-area-*)` occurrences: nspace 103,
nimiq-kids 41, PROOF 39, nimjump 32, knock-chat 8, Blacktop 4, nimquest 0.
44px/touch-target references: nimiq-kids 80, nspace 40, PROOF 30, Blacktop 9, nimquest 8,
knock-chat 6, nimjump 2.

The winners handled notches and home indicators. Tailwind in only 4 of 7 — not a factor.

### 2.10 AI-assisted development with committed guardrails

**[measured]** 4 of 7 ship agent instruction files:

| Repo | Files |
|---|---|
| nspace | `AGENTS.md`, `CONTEXT.md`, `MEMORY.md`, `.cursor/` |
| Blacktop | `CLAUDE.md`, `AGENTS.md`, `.lovable/` |
| nimiq-kids | `CLAUDE.md` |
| knock-chat | none (but 7 root-level design docs) |

**[inference]** The winners used coding agents *with* committed house rules, not raw prompting.
The framework also ships an official skill for this:
`npx skills add nimiq/developer-center --skill mini-apps`.

---

## 3. Measured API usage across all seven

**[measured]** call sites, fixed-string matched, `node_modules` excluded:

| Call | kids | Blacktop | PROOF | nspace | knock | nimquest | nimjump |
|---|---|---|---|---|---|---|---|
| `.sign(` | 23 | 14 | 7 | 14 | 8 | 3 | 0* |
| `.listAccounts(` | 0 | 0 | 2 | 0 | **0** | 7 | 2 |
| `.sendBasicTransaction(` | 0 | 2 | 1 | 1 | 1 | 1 | 0* |
| `.sendBasicTransactionWithData(` | 0 | 0 | 2 | 2 | 2 | 0 | 1 |
| `.getBalance(` | 28 | 0 | 0 | 0 | 0 | 0 | 0 |
| `.isConsensusEstablished(` | 0 | 0 | 0 | 0 | 1 | 6 | 0 |
| `.getBlockNumber(` | 0 | 0 | 0 | 0 | 1 | 5 | 0 |
| `.disconnect(` | 7 | 18 | 5 | 10 | 3 | 0 | 0 |
| `requestDeviceIdentifier` | 0 | 0 | 2 | 0 | 0 | 0 | 1 |
| `requestFullscreen` | 0 | 4 | 0 | 2 | 0 | 0 | 0 |
| `payLightningInvoice` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `NimiqProviderError` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `setRPCUrl` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `eth_requestAccounts` | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| `eth_sendTransaction` | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| `wallet_switchEthereumChain` | 0 | 1 | 0 | 0 | 0 | 0 | 0 |

\* nimjump's wallet work is in Go on the backend, so its client-side call sites are low.

### What this table says

- **`sign()` is the center of gravity.** Every app's core loop runs through it.
- **Staking: zero usage.** No repo calls any `send*StakerTransaction`.
- **Lightning: zero usage.** Nobody shipped `payLightningInvoice`.
- **`setRPCUrl`: zero usage.** Those that needed chain reads called a JSON-RPC node from
  their own backend (`nspace/nim/rpc.ts`) instead of routing through the provider — which
  also keeps RPC credentials server-side.
- **EVM is nearly untouched.** Only `Blacktop`, and it hand-rolls ERC-20 calldata
  (`0xa9059cbb` + two padded 32-byte words) rather than using viem.
- **`getBalance` is concentrated** in `nimiq-kids` (28), which runs its own custody and needs
  balances constantly.

**[inference]** Staking, Lightning, and multi-chain EVM are open territory. Either a
differentiator or a sign judges didn't reward them — that is a bet, not a finding.

---

## 4. Three things to know before copying

### 4.1 All seven predate SDK 0.2.0 — do not copy their error handling

**[measured]** dependency versions: `nimiq-kids`, `Blacktop`, `knock-chat`, `nimquest` on
`@nimiq/mini-app-sdk ^0.1.0`; `nspace` on `^0.0.2`; `PROOF` and `nimjump` have no SDK
dependency at all (raw `window.nimiq` / backend Go). **`NimiqProviderError` appears zero
times across all seven.**

They all hand-roll the legacy resolved-`{ error }` shape:

```ts
// knock-chat
const result = await provider.sign(await message)
if ("error" in result) throw new Error(result.error.message)
```

```ts
// nspace
function isProviderErrorResponse(x: unknown): x is { error: { message?: string } } { … }
```

```ts
// Blacktop
if (result && typeof result === 'object' && 'error' in result) {
  throw new Error((result as { error: { message?: string } }).error?.message ?? 'NIM payment failed')
}
```

**Build on SDK 0.2.x instead** and use `try` / `catch` with `NimiqProviderError.is(error)`,
branching on `type` (`PERMISSION_DENIED`, `NETWORK_ERROR`, …). You get less code *and* you
are current. This is one place where you can be strictly better than every winner.

Related: `nspace` has `isUserAbortMessage()` doing substring matching on error text
(`cancel|abort|denied|reject|dismiss|closed`) to detect user cancellation. With 0.2.x you
just check `error.type === 'PERMISSION_DENIED'`. Don't inherit the string sniffing.

### 4.2 `nimiq-kids` runs its own custody — against the docs' guidance

**[evidence]** `src/custody-boot.ts`, `src/nimiq/hd.ts`, `src/scripts/generate-hot-wallet.ts`,
`src/scripts/sweep-hot-wallet.ts`, `src/wallet/earn-settlement.ts`.

That is server-side key management, which the framework docs list under "not a good fit" for
mini apps. It won anyway. **[inference]** The rule is softer in practice than the docs state,
but it is real risk surface and real liability. I would not lead a new build with it.

### 4.3 What this analysis cannot tell you

Code cannot show the idea's quality, the demo video, the live app's feel, or how the judges
weighted any of it. Six of seven are NIM-only, four of seven ship agent guardrails, two ship
no tests — these are correlations across seven data points with no losing cohort to compare
against. Treat §1 and §2.1–2.4 as well-supported, and the rest as informed guesswork.

---

## 5. Replication checklist, in build order

1. **Signature-as-identity.** `sign()` → server verifies Ed25519 over the Nimiq
   signed-message digest → derive the address from the public key. Nonce, short expiry,
   single-use. **Skip `listAccounts()` entirely** — the signature already carries the key.
2. **Hub fallback.** Detect the host with `typeof window.nimiqPay !== 'undefined'`, never a
   user-agent guess. Hardcode `https://hub.nimiq.com`. Lazy-import the Hub. Accept
   `message | Promise<message>` in signer/payer so popups open on the click.
3. **Deeplink that works.** Preserve `window.location.search`; detect success via
   `pagehide` / `visibilitychange` with a ~1.5 s grace rather than predicting it.
4. **Server-side authority.** Nothing valuable decided client-side. Verify payments with
   `getTransactionByHash` checking recipient + value + data + confirmations. Grade, score and
   validate on the server. Keep answer keys and RPC credentials out of the bundle.
5. **Dev identities from fixed seeds with real keys**, opt-in only, gated on the dev server
   in exactly one place — so no test-only bypass exists in your server.
6. **SDK 0.2.x error handling.** `try`/`catch` + `NimiqProviderError.is()`; treat
   `PERMISSION_DENIED` as a normal outcome. Normalize bridge return shapes at the boundary.
7. **Mobile chrome.** `safe-area-inset`, 44px targets, 375px floor, no horizontal scroll.
8. **Record every gotcha as a comment at the decision point**, not in a wiki.
9. **README as a pitch**: live link + walkthrough video first, then the problem story, an
   explicit "what this is not", an operation→result table, and an honest limitations section.
10. **Optional edge**: staking, Lightning, or multi-chain EVM — all unused by every winner.

---

## 6. Per-repo notes

**`kaichaosun/knock-chat`** — the best code in the set. 212 files, no bloat, every
non-obvious decision commented with its reasoning. Three interchangeable signers (Nimiq Pay
provider / Hub popup / dev identity) behind one `Wallet` type that carries *no address* by
design. Read `src/lib/wallet.ts` end to end before you write your own wallet layer; it is a
better tutorial than the official ones.

**`harlski/nspace`** — the most operationally serious: four services (analytics, chart,
payment-intent, payout), 192 tests, Docker deploy, `AGENTS.md` + `CONTEXT.md` + `MEMORY.md`.
`payment-intent-service` is the reference for verifying a NIM payment properly.

**`nimjump/game`** — the most adversarially engineered: Go backend, deterministic map
generation, server-side replay verification, server-issued signed seed batches, and the
1-luna notification trick. Its README is a model of pre-empting criticism. Zero tests.

**`mystiquemide/nimquest`** — the leanest (57 files) with the best narrative. Server-graded
quizzes, wallet-bound single-use challenges, D1 storage, CI badge, live demo + video +
launch post in the README's first screen. Proof that small and well-presented beats large.

**`Andjroo111/nimiq-kids`** — the most tested (194 tests, 5 CI workflows including a
`privacy-gate`) and the only one running its own HD custody and hot-wallet sweeps. Only 9
commits at clone depth, so its history is squashed or shallow.

**`LegendaryTunzeverywhere/PROOF`** — clearest statement of the auth principle in
`server/auth.js`. Carries `web/`, `web-old-backup/` and `web-react/` side by side, i.e. a
mid-competition rewrite left in the tree; `CHESS-FIX-GUIDE.md` at root suggests deadline
pressure. Won regardless — tidiness was not decisive.

**`Jayobebe/Blacktop`** — the only EVM user (USDT on Polygon, hand-rolled calldata) and the
only one with native wrappers (Capacitor, `android/` + `ios/`). `ensurePolygon()` tries
`wallet_switchEthereumChain` and falls back to `wallet_addEthereumChain` on failure — a good
pattern. Zero tests; `.lovable/` indicates heavy AI scaffolding.
