# Audit — UX, UI and functionality

Run on **2026-11-09**, before the mainnet go-live on 2026-11-10. Every finding below was
reproduced in this session: in the code, in a browser at three widths and two themes, or
against a local PostgreSQL 18.6 database with live **testnet** chain reads behind it.

**Counts: 3 Blockers · 4 Majors · 15 Minors — all 22 now fixed.**
The 3 Blockers and 8 of the Minors were fixed in the audit slice itself (2026-11-09). The
4 Majors and the other 7 Minors were listed with a proposed fix and left alone, per the
brief; the operator approved them, and they were **fixed on 2026-11-10**. Each is marked
below, and the findings themselves are left as written so the record stands.

| | Blocker | Major | Minor |
|---|---|---|---|
| Fixed 2026-11-09 (audit slice) | 3 | 0 | 8 |
| Fixed 2026-11-10 (on approval) | 0 | 4 | 7 |
| Still open | 0 | 0 | 0 |

No protected file was touched. `git status` over `member-status.ts`, `release.ts`,
`commitments.ts`, `tx-tracker.ts`, `payment-check.ts`, `rpc-schemas.ts`,
`staking-actions.ts`, `app/api/auth/verify/route.ts` and `src/wallet/` is empty.

---

## What this audit actually exercised

| | What ran |
|---|---|
| Code | Every screen in `packages/ui`, every container, every route handler and every `server/core` module read against PRD §7.1–7.8 and §9.0–9.12 |
| Browser | `pnpm check:scenes`: **148 scenes × 2 themes × {390, 375, 320} = 888 frames**, 0 failures |
| Database | A throwaway **PostgreSQL 18.6** cluster (port 55432, TCP-only) with migrations 001–003, driven through `pnpm dev` as dev identities alice / bob / carol |
| Chain | Real **testnet** reads through that dev server (`rpc.testnet.nimiqwatch.com`), head ≈ 16,343,300 |
| Prices | Real CoinGecko reads (USD 0.00025454, EUR 0.0002268 per NIM) |

**Not exercised: any wallet.** No Nimiq Pay approval sheet, no phone, no mainnet, and no
transaction signed or sent by this build on any network. Everything below about the wallet
steps is read from the code and from fixtures. The list of what still needs a device is at
the end.

---

## Blockers — all three fixed

### F-1 · A pasted recipient address was refused, and the screen did not say why
**Where** `/squads/new`, Mode A (Shared goal) · `packages/ui/CreateSquadScreen.tsx` ·
`apps/web/src/containers/create-squad.tsx`

**Reproduced** `POST /api/squads` with `recipient: "NQ6229BTAAJANLCGLN389TQUP56MNRXE4744"`
answers `{"ok":false,"code":"INVALID_INPUT"}` (observed today against the local database).
The wire contract is `^NQ\d{2}(?: [0-9A-HJ-NP-VXY]{4}){8}$` — the spaced form only. An
address copied from an explorer, a chat message or Nimiq Pay's own "copy" is frequently
unspaced or lower case, and the creator got a generic refusal that named no field. Mode A is
the half of the app a judge is most likely to try, and the recipient is its only free-text
field where a paste can be in the wrong shape.

**Fixed** New pure module `apps/web/src/core/nimiq-address.ts`: `normalizeAddress` regroups
any spacing and case into the canonical form, and returns anything it cannot normalise
unchanged, so it is **not** a validator and never invents the missing part of an address.
The container normalises before sending and refuses a genuine non-address with its own
words — `create.recipientInvalid` / `recipientInvalidNext`, added in all five languages.
Tests: `tests/unit/input-and-polling.test.ts` (6 accepted shapes, 8 refused, the catalogue
in five languages).

### F-2 · A settled squad still offered two actions the server refuses
**Where** `/squads/<id>` when the squad reached `COMPLETED` · `packages/ui/SquadScreen.tsx`

**Reproduced** Scene `squad-page-completed` renders the action bar with "Change my
commitment" and "Leave squad". `COMPLETED` is not in `ACTIVE_SQUAD_STATES`, so `isActive`
makes both a commitment (`server/core/commitments.ts`) and a leave (`server/core/squads.ts`)
refuse with `SQUAD_CLOSED`. The end of the happy path therefore offered two taps that can
only fail — the same class of defect as "Start leaving after leaving started".

**Fixed** The action bar is not rendered at all on a settled squad; the existing "This squad
is complete" banner is the whole end of the story. Test: `§7.4 a settled squad offers no
action the server would refuse` in `tests/unit/ui-screens.test.ts`, which also asserts an
open squad still offers both.

### F-3 · The public proof page answered 500 for an id it did not recognise
**Where** `/proof/<id>` (public) and `/squads/<id>` · `apps/web/src/server/lib/squad-store.ts`

**Reproduced** against the real database: `/proof/cbnkj8dn-typo` → **500**,
`/squads/notauuid` → **500**, with `PostgresError: invalid input syntax for type uuid:
"cbnkj8dn-typo"` in the server log. `squadProof` falls back from `getSquadByShortId` (a text
column) to `getSquad` (a `uuid` column), and Postgres rejects the cast rather than returning
no rows. `/api/proof/<unknown>` answered `503 UNAVAILABLE` for the same reason — "we are
broken" instead of "no such squad".

This is the link `JUDGING.md` tells judges to open signed out and to pass to someone else, so
a stale or mistyped one lands a stranger on an error page.

**Fixed** `getSquad` answers `null` for anything that cannot be a uuid, before the query. An
id that cannot exist is a squad that does not exist. Verified after the fix against the same
database: **500 → 404** on both pages, and `/api/proof/nosuchid` now says `SQUAD_NOT_FOUND`.
Test: `tests/unit/store-ids.test.ts`, which proves the guard runs *before* the query by
running with no database configured — malformed ids resolve to null, a well-formed one still
tries to connect and rejects.

---

## Majors — all four approved and fixed on 2026-11-10

### M-1 · The create screen prints the invite URL and offers no way to send it
**Where** `packages/ui/CreateSquadScreen.tsx`, the `created` step (after "Create squad")

The share step renders `created.inviteUrl` in full in a mono field, with a hint, and a single
"Open squad" button. Slice B deliberately removed exactly this from the squad page — a URL is
the one string that must not be mistyped and a phone cannot select it comfortably — and
replaced it with `navigator.share` plus a quiet **Copy link**. The create screen never got
the same treatment, so:
- the two screens contradict each other on the same string, and
- the moment the creator most needs to share (just after creating) is the one moment the app
  offers no share control at all. `JUDGING.md` works around this by telling judges to share
  from the squad page.

The Q17 test "no printed invite link" only renders `SquadScreen`, so nothing fails.

**Proposed fix** Give `CreateSquadScreen` the same `onShare` / `onCopy` / `copied` props
`SquadScreen` has, drop the printed URL, and let `containers/create-squad.tsx` own the
`navigator.share` call (`AbortError` = a decision, anything else falls through to the
clipboard). Extend the existing test to take the fixture's own URL as the needle on **both**
screens. One new scene for the copied state.

**Fixed 2026-11-10.** The share step now hands the link to the phone's own share sheet, with a quiet **Copy link** beside it and a "Copied" confirmation, through one new `apps/web/src/hooks/use-share-link.ts` that the squad page uses too (its inline copy of this logic is gone). `AbortError` is a decision, not a failure. `packages/ui` stays pure: the component takes `onShare` / `onCopyInvite` / `shared`. A Q17 test takes the fixture's own URL as the needle and asserts it appears nowhere in the create screen's markup, the same guard the squad page already had.

### M-2 · Half the screens have a sticky action bar and half do not
**Where** `packages/ui/styles.css` (`.sheet-footer` vs `.action-bar`)

`.action-bar` is `position: sticky`, opaque, with `--safe-bottom` padding and a fade band
above it: the primary action is always reachable. It is used on three screens (squad page,
leaving, entry). The other six — create, join/commit, pay share, leave confirm, my squads,
privacy — use `.sheet-footer`, which is a plain static block at the end of the scroll.

On the create form (the longest screen in the app) and on the commit and pay sheets, the
primary action is below the fold at 390 px and well below it at 320 px, while the same kind
of action on the squad page is pinned. Nothing fails `check:scenes`, which measures overflow
and tap size, not whether the main action is reachable without scrolling.

**Proposed fix** Move those six footers to `.action-bar` (the markup is identical, only the
class changes), then re-run `pnpm check:scenes` at all three widths — the sticky bar changes
the bottom of every one of those screens, and Slice C found three real paint bugs in that bar
the last time it moved.

**Fixed 2026-11-10.** The `.sign-in-footer, .sheet-footer` rule is deleted from `styles.css`, and the six screens that used it — create (both steps), commit, pay, leave-confirm, My squads and the privacy notice — render `<footer className="action-bar">`. One rule, so the main action is pinned inside `--safe-bottom` on every screen. Re-measured at 390, 375 and 320 px in both themes.

### M-3 · A payment whose refusal is already final still reads "Sent"
**Where** `apps/web/src/server/core/leave-steps.ts`, the `payStep` branch

`isOpen(pay)` is tested before `input.paymentVerified === false`, and `paymentVerified` is a
boolean, so a `pay` transaction that executed with the wrong marker or a short value shows as
*pending* ("Waiting for the chain") until the tracker's own poll marks it `INCLUDED_OK` — even
though §7.6 can already answer definitively the moment it executes. The sheet never says
"paid", so nothing false is claimed, but the member waits for an answer the server already
has. Carried over from 2026-11-08 as a known rough edge; it is still live.

**Proposed fix** Pass the §7.6 refusal **code** rather than a boolean into
`deriveLeavingSteps`, and let a definite refusal outrank `pending` the way the release gate
outranks `failed` today. Needs the Q15 fixtures extended and the existing adversarial payment
tests re-pointed; `payment-check.ts` itself is protected and does not change.

**Fixed 2026-11-10.** `deriveLeavingSteps` now takes `payment: PaymentOutcome | null` — `{ verified: true }` or `{ verified: false, code }` — instead of a boolean. `WRONG_RECIPIENT`, `PAYMENT_DATA_MISMATCH`, `PAYMENT_SHORT` and `TX_FAILED` are final, so the step reads `failed` the moment the chain says so rather than waiting for the tracker's poll; the codes that can still change (`TX_NOT_CONFIRMED`, an unreadable transaction) keep reading `pending`. `leave-plan.ts` passes the verdict's own code. The step machine still does no I/O.

### M-4 · The commit sheet asks for a number and suggests none
**Where** `apps/web/src/containers/join-commit.tsx` (`useState('')`) · `packages/ui/JoinCommitSheet.tsx`

The amount field starts empty on every visit, including for a member who already has a
commitment and is only changing it. The sheet knows the squad's target, the member count and
the member's own current commitment, so it can propose a figure; a first-time user who has
just been told "pick a goal together" is otherwise left to invent one, which is the single
biggest piece of thinking on the core path.

**Proposed fix** Prefill with the member's existing commitment when there is one, otherwise
with the Mode A even share (`targetLuna / memberCount`, rounded down to whole NIM) or the Mode
B personal target, and label it as a suggestion the member can change. Behaviour change in a
container plus one new scene; the server-side commitment rule (protected) is untouched —
whatever is typed still faces `Σ commitments ≤ active balance`.

**Fixed 2026-11-10.** New pure `apps/web/src/core/commit-suggestion.ts`: the member's own commitment if they have one, otherwise an equal split of a Mode A target rounded **down** to whole NIM (so a suggested split can never total more than the goal), and nothing at all for Mode B or a squad with no target. It is a function of the squad row and the member count — never of a balance, which stays server-side — and `joinView` sends it as `suggestion`, which the sheet pre-fills and explains in one hint line ("Your share of 12,000 NIM" / "What you committed before").

---

## Minors

### Fixed in this slice

| # | Finding | Fix |
|---|---|---|
| m-1 | **The status poll gave up on a refusal that said nothing about the transaction.** `useTxPoll.follow` ended its two-minute window on *any* refusal from `GET /api/tx/:hash`, including `UNAVAILABLE`, which is the handler itself failing (a database hiccup). Both "stalled" strings also promised "Still no verdict **after two minutes**", which a refusal could make false after five seconds. | `UNAVAILABLE` now costs one attempt and the loop continues; a refusal *about this transaction* (`NOT_TRACKED`, `INVALID_INPUT`, `AUTH_REFUSED`) still ends it at once rather than asking 24 times. The claim about two minutes is gone in all five languages. The loop is now a pure `followTracked(read, hash, onProgress, wait)`, covered by 3 tests. |
| m-2 | **`app/manifest.ts` still carried the pre-Slice-C navy and gold** (`#0d102c`, `#e9b213`), so an installed icon's splash and status-bar tint did not match the white-and-black app behind them. | Both read `#ffffff`, with a comment pointing at the tokens. |
| m-3 | **`SignInScreen` did not pass `lang` to `ScreenHeader`**, so the one screen a non-English speaker sees first had an English-defaulted header. | Passed. |
| m-4 | **Step four said "Finish withdrawing first, then pay your share" while the payment was in flight** — directly contradicting the transaction block above it, which said the chain was being checked. | `payBody` renders nothing extra for a `pending` pay step. New scene `leaving-pay-pending`, new Q17 test asserting the sentence is absent there and still present when nothing is withdrawn. |
| m-5 | **The age of a chain read ran into hundreds of minutes.** `readAge` had seconds and minutes only, and a snapshot keeps its original timestamp when a refresh fails, so "Checked 184 min ago" is reachable on the figure members are asked to judge freshness by. | An hours unit in all five languages (`Checked 3 h 4 min ago`), with assertions in `tests/unit/i18n.test.ts`. |
| m-6 | **The ⓘ sheet is `aria-modal` but focus stayed behind it**, so a keyboard or screen-reader user was left on the ⓘ button under the scrim. | `autoFocus` on the sheet's Close button — an attribute, not an effect, so the component stays pure. *Not covered by a test: React does not emit the attribute in server markup, and this was reasoned from the ARIA contract rather than watched on a device.* |
| m-8 | **A fixture contradicted itself.** `squad-page-completed` set every member to PAID but inherited the base scene's stage totals, so it read "4,500 NIM saved · 1,100 NIM leaving · 1,800 NIM missing" beside a banner saying every member had paid — the same class of bug as the countdown fixture on 2026-11-08, and found the same way, by looking at the frame. | The scene's stages are derived from its own roster. It now reads "0 NIM saved · 7,400 NIM paid". |
| m-7 | **Every screenshot this repo has inspected since 2026-11-08 was clipped.** `scripts/measure-scenes.mjs` captured with a plain `Page.captureScreenshot` under mobile emulation, which applies a page scale of its own: the PNG was 390 px holding the left ~390 px of a ~474 px layout, so the right edge of every frame — including the brand mark in the top bar — was missing. The measurements were never affected: they are read from the DOM in CSS pixels. | An explicit `clip: {x:0,y:0,width,height:844,scale:1}`. Re-captured and compared; `docs/screenshots/` is from the fixed path. |

### Listed, then approved and fixed on 2026-11-10

| # | Finding | Proposed fix |
|---|---|---|
| n-1 | **Two error codes have no producer.** `STALE_READ` and `LEAVE_BLOCKED` carry flags in `catalog.ts` and words in all five languages, and nothing in `apps/web/app` or `apps/web/src` ever emits them. Every other one of the 41 codes has at least one producer (`TX_DECLINED`, `TX_REJECTED`, `TX_UNSUPPORTED`, `TX_SUBMIT_FAILED` through `providerErrorCode()`). | Either wire them — `STALE_READ` when a view is served from a `lastKnown` snapshot, `LEAVE_BLOCKED` for the leave route's own failure — or delete both. A product call, not a copy fix, so it is listed. |
| n-2 | **`GET /api/tx/:hash` is not scoped to the caller.** Observed: bob tracked a hash, then alice read `{"ok":true,"state":"INCLUDED_FAILED"}` for it. A session is required (signed out → `AUTH_REFUSED`), and the data is chain-public, so nothing private leaks — but it does tell any signed-in member that Squad Stake tracked a given hash. | Scope the lookup to the caller's own tracked rows and answer `NOT_TRACKED` otherwise, as `POST /api/squads/:id/pay` already does. |
| n-3 | **`joined_at` survives a re-join.** Confirmed in SQL: bob left and re-joined, and his row kept the original `joined_at`. "Earned since joining" (§9.12) therefore measures from the first join, over a period when he was not a member. | `joined_at = now()` in the `DO UPDATE` of `joinMembership`, which already resets `left_at` and `committed_luna`. One line of SQL plus a store test. |
| n-4 | **Two store verdicts are discarded.** `markLeft` and `joinMembership` each return whether their conditional `UPDATE` matched a row, and `createSquadService.leave` / `.join` ignore it, so a lost race reports success to both callers. Harmless today (both are idempotent and the second caller's read is correct), but it is a verdict thrown away. | Return `NOT_A_MEMBER` / re-read when the write matched no row. |
| n-5 | **The entry screen's one call to action is quieter than ordinary buttons elsewhere.** "Sign in with Nimiq Pay" is the outlined gradient-border pill (the documented style for non-money actions) while "Change my commitment" on the squad page is filled ink. The first screen's single action therefore looks secondary. | Either make the entry action filled, or record in `docs/DECISIONS.md` that the entry screen is deliberately quiet. A design call. |
| n-6 | **The ⓘ sheet's scrim is not tap-to-dismiss and Escape does nothing** — on a phone, tapping outside a bottom sheet is how everyone closes one. | An `onClick` on the scrim calling `onClose`, and a `keydown` handler for Escape. Both are pure (no timers), but they change a shared component's behaviour on four screens. |
| n-7 | **`GET /api/price` emits codes the error catalogue does not contain** (`TIMEOUT`, `NO_QUOTE`; both observed today — USD timed out on the cold read, GMD has no quote). By design the fiat line simply disappears rather than showing an error, so neither code ever reaches `catalogError`, which would degrade them to `UNAVAILABLE`. | Leave as is, or name them in the catalogue so a future caller cannot show "Squad Stake is unavailable" for a missing exchange rate. Recorded so the next reader does not treat it as a gap. |

#### What was actually done, 2026-11-10

| # | Fixed |
|---|---|
| n-1 | **Decided both ways.** `STALE_READ` is **deleted** — nothing ever served a `lastKnown` snapshot *as* a stale read, and every screen already prints the age of the read it is showing, which is the honest version of the same information. `LEAVE_BLOCKED` is **wired**: it is now the leave route's own refusal (next row). A new test scans every `.ts`/`.tsx` under `apps/web/app` and `apps/web/src` — with the `FLAGS` table itself cut out, so a code cannot vouch for itself — and fails if any catalogue code has no producer. |
| n-2 | `checkTx` looks the hash up with `getTrackedTx` and answers **`NOT_TRACKED` (404)** unless the row's address is the caller's: the same answer an invented hash gets. `SquadHandlerDeps` gained a `store` of exactly `Pick<SquadStore, 'getTrackedTx'>`. New `tests/unit/squad-http.test.ts` proves a stranger is refused, an unknown hash is refused, the owner still gets a verdict, and a malformed hash never reaches the store. |
| n-3 | `joined_at = now()` in the `DO UPDATE` of `joinMembership`, with a comment saying why: "earned since joining" measures from it, and the member was not in the squad during the gap. The in-memory twin had always done this; only the SQL kept the first join's timestamp. |
| n-4 | Both verdicts are read. `leave` answers **`LEAVE_BLOCKED`** (409, retryable, "your stake is untouched") when `markLeft` matches no row, rather than reporting a release that did not happen. `join` **re-reads** when `joinMembership` matches no row: a current membership is the same success the other request got (`alreadyMember: true`), anything else is `UNAVAILABLE`. Three cases tested, including the re-read finding a membership that has since left. |
| n-5 | Made filled. "Sign in with Nimiq Pay" is now the `.primary-button` ink fill, with the spinner and `aria-busy` while Nimiq Pay has the approval; the two link states ("Open in Nimiq Pay", "Go to my squads") match it. The gradient pill stays for genuinely secondary actions. Recorded in `docs/DECISIONS.md`. |
| n-6 | The scrim carries an `onClick` that closes only when the tap's target **is** the scrim (so a tap inside the sheet does not), and an `onKeyDown` for Escape. Both are React handlers on that element — no `window` listener, no effect — so the component is still a pure function of `t`. Tested by calling the returned element's own handlers with scrim and sheet targets, and with a non-Escape key. |
| n-7 | `TIMEOUT` (retryable) and `NO_QUOTE` (not retryable) are named in `catalog.ts` with words in all five languages, so a future caller cannot show "Squad Stake is unavailable" for a read that timed out or a currency nobody quotes. The fiat line still simply disappears; nothing on screen changed. |

---

## Coverage

### Functionality — PRD §7, exercised today

| PRD | Flow | How it was exercised | Result |
|---|---|---|---|
| §7.1 | Sign in | `POST /api/dev/sign-in` as alice, bob, carol | Three sessions, three derived addresses |
| §7.2 | Create squad | Mode A and Mode B created against the database | Both created; `GOAL_TOO_SOON` for a goal an hour out; `INVALID_INPUT` for an unspaced recipient (**F-1**) |
| §7.3 | Join + commit | bob joined by token; a guessed token; the right token on the wrong squad id; a commit | `INVITE_INVALID` twice; commit refused `CHAIN_UNAVAILABLE` on the cold read, then `NOT_STAKING` with `shortfallLuna 200000000` from a real testnet read |
| §7.4 | Progress | `GET /api/squads/:id` as a member and as a stranger | Six-status derivation, `readAt` per member, `NOT_A_MEMBER` for carol; `earned` present only for the viewer, `null` for every other row |
| §7.5 | Goal-day planner | `GET /api/plan/:id` as a member | Real `headBlock` 16,343,325, `leaveBy`, `showFrom`, four steps all `locked` with no stake |
| §7.6 | Mode A settlement | `POST /api/squads/:id/pay` with a hash tracked as a `retire` | `NOT_TRACKED` — the payer cannot nominate an arbitrary transaction |
| §7.7 | Validator choice | Code read; live pool/validator behaviour covered by `pnpm test:live` in the previous slice | Unchanged |
| §7.8 | Leave a squad | bob left, left again, re-joined with the same invite | `ok`, then `NOT_A_MEMBER`, then a fresh membership at zero — which is what `JUDGING.md` promises |
| Tracker | `POST /api/tx` → `GET /api/tx/:hash` | A **real testnet included-but-failed** retire (`70a282c0…`) | `SUBMITTED` → **`INCLUDED_FAILED` with 170,877 confirmations**, written back to `tracked_txs` with `checked_at`; a duplicate hash → `DUPLICATE_HASH` |
| Fiat | `GET /api/price` | USD, EUR, GMD | `TIMEOUT` cold, then 0.00025454 / 0.0002268; GMD `NO_QUOTE`, as documented |

### Screens — PRD §9, every page loaded

| Path | Signed in | Result |
|---|---|---|
| `/` | — | 307 → `/squads` with a session; entry screen without |
| `/squads` · `/squads/new` · `/squads/<id>` | member | 200 |
| `/squads/<id>/leaving` · `/squads/<id>/pay` | member | 200 |
| `/proof/<shortId>` · `/proof/<uuid>` | signed out | 200, public, `inviteToken: null`, `earned: null` on every row |
| `/s/<token>` · `/join/<token>` | either | 200 / 308 → `/s/<token>`; an existing member gets the commit sheet, not a second join |
| `/squads/<id>/pay` on a Mode B squad | member | 307 — no dead end |
| `/squads/<id>/leaving` · `/pay` as a non-member | carol | 307 |
| `/squads/<unknown uuid>` | member | 404 |
| `/squads/<not a uuid>` · `/proof/<unknown>` | either | **was 500 → now 404** (**F-3**) |

**No dead ends found** beyond F-2 and F-3. Every failure path renders a screen with a control
on it: a refused commit keeps the sheet and its amount, a refused payment re-enables the pay
button (the step reads `failed`, which `canPay` accepts), and a failed exit step offers itself
again from the chain's own state rather than from React state (Slice D).

### Error catalogue
41 codes at the time of the audit; **42 now** — `STALE_READ` deleted, `TIMEOUT` and `NO_QUOTE`
added (n-1, n-7). Every one is produced somewhere, which a source scan in
`tests/unit/i18n.test.ts` now enforces rather than leaving to a reading. The flags are language
independent and an unknown code degrades to `UNAVAILABLE` — both already pinned by the same
suite.

### Taps on the core path
Deeplink → signed-in member with a staked share: **7 taps and one Nimiq Pay approval.**

1. Sign in with Nimiq Pay · 2. Create squad · 3. a template chip · 4. Create squad ·
5. Open squad · 6. Commit my share · 7. Create staker → *approve in Nimiq Pay*.

Two cuts are available and both are listed above: the share step (tap 5) exists only to print
a URL (**M-1**) and could hand over the share sheet and go straight on, and the commit amount
(**M-4**) is the only number the member has to invent. With both, the path is five taps.

### Accessibility
Checked and **sound**: every `<input>` is wrapped in its own `<label>`; the only icon-only
controls (back chevron, ⓘ) carry `aria-label`s; status is never colour alone — every
`StatusDot` sits beside its word and carries `role="img"` with a label; `aria-busy` is on the
screen root and on every control that starts work, and every such control also changes its
label, so a frozen spinner under `prefers-reduced-motion` still says something; the transaction
block is `role="status" aria-live="polite"`, and a failed exit step is `role="alert"`; the
sticky bar is last in DOM order, so focus order follows reading order; contrast was computed in
Slice C (ink 19.67:1, muted 5.59:1, faint 3.46:1 on white).

Found: **m-6** (focus did not enter the ⓘ dialog) and **n-6** (no scrim tap, no Escape).
Both fixed — m-6 in the audit slice, n-6 on approval.

### Docs versus the app
`JUDGING.md` and `README.md` were re-read against what the app does:
- The four paths, the "what is instantly checkable" table and the "try to break it" table match
  the code, including the one that is easy to get wrong — *reuse an invite after leaving*:
  "the link still works and re-joins you with a **zero** commitment" is exactly what
  `joinMembership`'s `ON CONFLICT … DO UPDATE SET left_at = NULL, committed_luna = 0` does, and
  what was observed today.
- The feature → file table points at files that exist and hold what it says they hold.
- The evidence table carries only claims marked **PROVEN** in `briefing/PROOF_PLAN.md`, with
  the word *testnet* on each, and says mainnet is unproven.
- One documented work-around: `JUDGING.md` sends judges to the squad page to share the invite,
  because the create screen cannot (**M-1**). If M-1 is approved, that sentence can be simpler.
- `README.md` references `docs/screenshots/*.png`; those six files now exist, rendered from the
  fixture scenes at 390 px light (and now un-clipped, **m-7**).

---

## Not verifiable here — needs a real phone, Nimiq Pay, or mainnet

1. **Every wallet call.** `sendSignedMessage`, `sendCreateStaker`, `sendAddStake`,
   `sendSetActiveStake`, `sendRetireStake`, `sendRemoveStake`, `sendBasicTransactionWithData`
   — none has been called by this build in this session, and the leaving steps and Mode A
   payment have never been sent on any network.
2. **The Nimiq Pay approval sheet** itself, including declining one (the `PERMISSION_DENIED`
   path) and the single-pending-call guard under a real double tap.
3. **`navigator.share`**, which needs a secure context: the share sheet, its `AbortError`
   branch and the clipboard fallback have never run.
4. **`getHostLanguage()` and `getHostFiat()`** returning real values inside Nimiq Pay — so the
   language following the host, and the fiat line appearing at all, are unproven.
5. **The retry after a real failure**: let a withdrawal fail, reload `/squads/<id>/leaving`,
   and check step three still offers "Try again" (Slice D's fix, never fired in anger).
6. **Pressed states, the ⓘ sheet's travel and the spinner at real DPI**, and
   `prefers-reduced-motion` actually set on a device.
7. **Mainnet reads** through this adapter, and the first mainnet squad end to end
   (`docs/GO-LIVE.md` is the checklist).
8. **Neon through the pooler**, including a concurrent-commit refusal on PgBouncer. Every
   database run so far, including today's, has been a local throwaway cluster.
9. **A jailed validator and an inactive/retired live staker** — still fixture-only.
