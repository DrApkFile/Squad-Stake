# Squad Stake — a roadmap for judges

**What it is.** Squad Stake is a Nimiq Pay Mini App where a group saves toward a goal with each
member's NIM **staked in their own wallet** — nobody holds the pot, and every member's progress
is read from the Nimiq chain on every page load rather than typed into a database. It does the
one thing a group savings jar normally cannot: prove the money is there without holding it.

**What you need**

| | |
|---|---|
| Nimiq Pay | on **Default** (mainnet), not testnet |
| NIM | **at least 100 NIM** — the protocol's minimum stake — plus a few luna for fees (creating a staker costs 0.003 NIM) |
| The app | <https://squad-stake.vercel.app> |
| Where it goes | **Your NIM never leaves your wallet.** It is staked from your own address to a validator of your own, it earns while it sits there, and you get it back by leaving (step 3 below). Squad Stake has no custody code and cannot move it — only your approval in Nimiq Pay can. |
| Video | <https://youtu.be/iYhnj-aDvJ8> (2:45) |

---

## ⏱ Read this before you start: one step takes 12–24 hours

Nimiq releases staked NIM only after the **reporting window that follows the next election
block**. An epoch is about 12 hours, so **leave → withdraw cannot finish in one sitting** — the
wait is the protocol's, not ours, and nothing in this app can shorten it.

| Instantly checkable | Needs a return visit (~12–24 h) |
|---|---|
| Sign in, create a squad, invite, commit | **Confirm withdrawal** (step 2 of leaving) |
| *Create staker* approved in Nimiq Pay, tracked to confirmed | **Withdraw** (step 3) |
| Chain-derived status on the squad page, with the age of the read | A Mode A payment, which needs the NIM back in the wallet first |
| The **public proof page** — no session, no wallet, no JavaScript | |
| Every refusal in "Try to break it" below | |

So: do **Path 1** now (5 minutes), start **Path 3** before you close the app, and come back the
next day to finish it. The countdown on the leaving screen is read off the chain — it shows the
release block, the block the chain is at now, and an estimated time — so you can see the wait is
real without waiting for it.

For the slow parts there is evidence rather than a promise: the complete cycle — start leaving →
the chain's own release wait → confirm withdrawal → withdraw, ending in **Withdrawn** — has been
run on testnet from a real phone, so the wait is the only thing between you and the same result.
See **Evidence** at the bottom, and the public proof page of any squad, which prints the exact
RPC call so you can repeat the read yourself.

---

## Path 1 — the 5-minute core

**Open the app.** Inside Nimiq Pay: **Mini Apps → Custom URL →** `https://squad-stake.vercel.app`.
Or tap the deeplink `https://nimpay.app/miniapps/open/squad-stake.vercel.app`. Nimiq Pay shows a
warning screen first for any URL that is not in its own list — that is the host being careful,
not the app failing.

| # | Do | What to look for |
|---|---|---|
| 1 | Read the entry screen | Three rows that say what the app is, and an **Example squad** orbit — labelled as an example, because it is invented data and this build does not show invented numbers as real |
| 2 | **Sign in with Nimiq Pay** | **One** approval. It is a `sign()` of a message, not a transaction: no NIM moves, and the app learns your address by **deriving it from the public key in your signature** — never by asking the wallet which accounts you have |
| 3 | **Create squad** → pick a **Quick start** chip (Trip, Gift, Gadget…) | It fills the mode, a name and a date in your own language. It never fills the recipient address — the one field where a suggestion could cost money |
| 4 | Pick **Together goals** for the fast path, set a date a few days out, **Create squad** | Creating a squad moves no NIM and needs no approval. The privacy notice comes first, before anything is saved |
| 5 | **Open the squad** → **Commit my share** | Type an amount. If you are not staking yet the sheet says so and offers **Create staker** — with the validator it picked and that pool's own name, fee and payout type from Nimiq's Validators API |
| 6 | **Create staker in Nimiq Pay** → approve | Nimiq Pay's own approval sheet. This app never recreates it |
| 7 | Watch the status sheet | It says **"N of 60 confirmations"** and explains that *a hash is not success*. Your commitment is saved only once the chain has **executed** the transaction and finalised it. If a count has not been read it says so in words — it never prints `0` for "unknown" |
| 8 | Back on the squad page | Your row reads **Saved**, with **"Checked N s ago"** beside it. That status came from `getStakerByAddress` on the Nimiq node for *your* address — it is not stored anywhere |
| 9 | Tap **Refresh** | The control spins **and** changes its label, and the read age resets. Every chain figure on every screen carries its own age |
| 10 | In the **Public proof** card, tap **Copy link**, then open it signed out (or on another device) | `/proof/<id>`: the same statuses, every address in full, the network it read, and the **exact `curl` call to repeat the read**. No session, no wallet, no JavaScript |

**The point of step 10:** you do not have to believe the app. The proof page hands you the RPC
call and the squad's JSON endpoint, and you can re-derive every status yourself.

---

## Path 2 — the group (a second wallet)

1. On the squad page, **Share** → the phone's own share sheet (or **Copy link**). The invite link
   is never printed on screen as text to retype: it is the one string here that must not be
   mistyped. _(The screen shown right after creating a squad does still print it; the squad
   page's Share is the one to use — see `docs/AUDIT.md`, M-1.)_
2. Open that link on a second wallet → it asks that wallet to **sign in**, then shows the squad
   and the commit sheet. Joining always needs a signed-in wallet of its own.
3. Commit from the second wallet (≥ 100 NIM if it is not staking yet).
4. Open the squad from **either** wallet. Both members, both statuses, both read from the chain.

**What to look for — the privacy line.** Each member sees the other's **commitment** and whether
it is covered, and nothing else. "Short by 40 NIM" is shown **only to the member it is about**,
because that gap equals (their commitments − their balance) and would publish a balance.
"Earned since joining" is the same: computed and sent only for the member looking at the page,
and never on the public proof page. Try it: open `/api/squads/<id>` as each member and compare —
the other member's `shortBy` is `null`, and their `earned` is `null`.

---

## Path 3 — leaving (start today, finish tomorrow)

Start this **before you close the app**, so the chain has the wait running while you do something
else.

| # | Do | What to look for |
|---|---|---|
| 1 | Squad page → **Start leaving** (the banner appears from about four days before goal day, and there is an ⓘ that explains why) | The screen is three steps and a wait, and says so |
| 2 | **Step 1 — Start leaving**, amount pre-filled with your share → approve | If you are in other squads, read the **"This will show you short by …"** warning first: it names them. Every squad reads the same one active balance |
| 3 | Step 1 goes **Done**; step 2 reads **Waiting for the chain** | The countdown is derived: *the reporting-window block after the election block after your inactivation's inclusion block*. It shows the **release block**, the block the chain is at, and an estimate — "the block number is the rule; the time is an estimate" |
| 4 | Go back to the squad page | The banner no longer offers "Start leaving". It reports where your stake is: **"Your 150 NIM unlocks in about 11 h 40 min"** — and the squad total reads "0 NIM saved · 150 NIM leaving (ready in ~11 h 40 min)", not "0 saved" as if you had failed |
| 5 | Close the app. **Come back after the countdown.** | Nothing is lost; the state is on the chain, not in the page |
| 6 | **Step 2 — Confirm withdrawal**: tick *I understand this cannot be undone*, approve | This is the irreversible one, so it needs the tick. It stays switched **off** until the chain has actually released the stake |
| 7 | **Step 3 — Withdraw**, approve | The amount is the **freshly read** retired balance with a **zero** fee, because the staking contract takes the fee out of it. There is nothing to choose |
| 8 | Squad page | Your row reads **Back in your wallet**. The NIM is in your wallet, where it always was |

If your validator happens to be jailed, step 2 says so and the date moves out — the release is
the later of the normal window and the end of the jail period.

---

## Path 4 — Shared goal (Mode A): paying a share, verified on-chain

Create a second squad with **Shared goal**, a total, and a **recipient address** (use a second
address of your own). The recipient is fixed at creation and shown to everyone.

1. Commit, and leave (Path 3) so the NIM is back in your wallet.
2. Squad page → **Pay my share** → approve. It is a plain transfer with the data field
   `sq:<short id>`.
3. The sheet then says **Checking the chain** and the server re-reads your transaction and checks
   five things: the **recipient**, a value of **at least** your share, the **`sq:` marker**, the
   **execution result**, and **finality**.
4. The roster moves to "1 of N paid". When everyone who committed is verified, the squad reads
   **complete**.
5. On the **public proof page** every payment hash is printed, so anyone can re-check it on a
   Nimiq explorer.

**The deliberate part:** the **sender is never matched.** Nimiq Pay pays from a cosigned HTLC, so
the sending address is not the member's own address — matching it would refuse every real
payment. The marker plus the recipient plus the amount is what identifies the settlement, and
the proof page says so in those words.

---

## Try to break it

| Try this | Expected |
|---|---|
| **Over-commit** — commit more NIM than your stake backs | Refused: "That is more than your stake can back", with **your** free amount and the shortfall, and the sheet offers *Add stake*. Checked server-side inside one locked transaction against a **fresh** chain read, so two taps at once cannot both fit |
| **Edit the request** — `POST /api/squads/<id>/commit` with a balance or a status in the body | Rejected. The body is parsed with a strict schema (`amountLuna`, `txHash`, nothing else) and the balance always comes from the chain. A client can never assert a balance, a status or a payment |
| **Double-tap a money button** | One provider call. A module-level flag gates every wallet call in the app, so a second tap cannot open a second approval sheet, and nothing is ever retried automatically |
| **Wrong network** — open the app with Nimiq Pay on testnet | Every action blocked: "Nimiq Pay is on a different network." Reads still work |
| **Reuse an invite after leaving** | The link still works — and re-joins you with a **zero** commitment, because leaving removed it. You have to commit again |
| **Borrow someone else's transaction hash** — commit or pay quoting a hash that is not yours | "That transaction is not tracked here." A hash only counts for the member who tracked it, in the squad they tracked it for |
| **Pay one luna less than your share** | Not counted: "That payment is less than your share" — **and** the sheet says the NIM did leave your wallet. It never claims nothing happened when something did |
| **Pay the recipient directly from Nimiq Pay, without the `sq:` marker** | Not counted: "That payment carries no squad marker." Checked live on testnet against a real transfer to the right recipient for more than the share — refused on the marker alone |
| **Retire before the chain releases the stake** | The control is off. If you force the transaction another way it comes back *included but failed*, the screen says "Nothing moved; the fee was spent", and offers the step again |
| **Replay a sign-in** — reuse a challenge | Refused. Challenges are single-use, expire in five minutes, and are bound to the browser that asked for them |
| **Open a squad you are not in** | You are sent to its **public proof page** — the same chain-derived statuses, without the invite link |
| **Kill the network mid-withdrawal, then reload** | The step still offers itself, because the offer is read off the chain, not kept in the page. A failed **send** may be offered again; a transaction already in flight is never re-sent — the only thing on offer then is reading the chain |

---

## Where the important code lives

| Feature | File |
|---|---|
| Sign-in: challenge, digest, signature → address | `apps/web/src/server/lib/nimiq-signature.ts`, `apps/web/app/api/auth/verify/route.ts`, `apps/web/src/wallet/sign-in.ts` |
| **Commitment rule** (Σ commitments ≤ active balance, one locked transaction, fresh read) | `apps/web/src/server/core/commitments.ts` |
| **Member status** from a staker record (the six chain-derived statuses) | `apps/web/src/server/core/member-status.ts` |
| **Release timing** (election block → reporting window; jail) | `apps/web/src/server/core/release.ts`, `member-release.ts` |
| **Transaction tracker** (execution **and** 60 confirmations; a hash is never success) | `apps/web/src/server/core/tx-tracker.ts`, `pending-view.ts` |
| **Mode A payment check** (recipient, value, marker, execution, finality; sender never matched) | `apps/web/src/server/core/payment-check.ts` |
| The six staking calls and the one-call-at-a-time guard | `apps/web/src/wallet/staking.ts` |
| What each wallet call is allowed to be (pure planners) | `apps/web/src/core/staking-actions.ts` |
| Leaving steps and the plan behind them | `apps/web/src/server/core/leave-steps.ts`, `leave-plan.ts` |
| Chain reader: typed, strict, positional params, 5 s timeout, 60 s cache with `readAt` | `apps/web/src/server/lib/rpc.ts`, `rpc-schemas.ts` |
| Every user-visible error, with a next action | `apps/web/src/core/errors/catalog.ts` + `packages/ui/i18n/` |
| One network switch for the whole app | `apps/web/src/config/network.ts`, `apps/web/src/wallet/network.ts` |
| **UI purity rule** (every screen is a pure function of props, so the demo video renders the same components) | `packages/ui/` + `scripts/ui-purity.mjs`, `packages/ui/motion.ts` |
| Public proof page | `apps/web/app/proof/[id]/page.tsx`, `packages/ui/ProofScreen.tsx` |

`pnpm gate` = typecheck + lint (including the UI purity rule) + unit + adversarial tests + build
+ production-artifact guards + secret scan + dependency-age check. `tests/adversarial/` attacks
the guards above; test names carry the acceptance IDs from `docs/PRD.md` §12.

---

## Evidence: what is proven, and how to check it

Taken only from `briefing/PROOF_PLAN.md`, which is the ledger this project keeps itself to.

| Claim | Status |
|---|---|
| Members' shares never leave their wallets | **Proven by design** — there is no custody code |
| The app on **mainnet** | **Proven on mainnet, 2026-11-11** — a real phone in Nimiq Pay on **Default** at <https://squad-stake.vercel.app>: sign in, create a squad, the squad page and the public proof page, all reading mainnet |
| Progress verified on-chain | **Proven on testnet, 2026-11-08** — a real phone in Nimiq Pay: sign in → create squad → *Create staker* approved → hash tracked to executed-and-final → the squad page showed the member **Backed**, derived from a chain read |
| The complete leaving cycle: start → release → confirm → withdraw | **Proven on testnet** — a real phone in Nimiq Pay: *Start leaving* approved on 2026-11-09, the countdown held until the head reached the release block, then *Confirm withdrawal* and *Withdraw* approved, and the member read **Withdrawn**. This is the one part you cannot sit through in a single visit, so it was run end to end rather than described |
| Planner timing matches the chain | **Proven on testnet** by that cycle, and the math is checked against real testnet reads besides — on 2026-11-09 a real inactivation at block 16,208,043 was still showing `inactiveFrom` 16,251,210, 43,167 blocks later, which is exactly why this app derives the release from the inactivation's *inclusion* block |
| A real shared-goal (Mode A) payment | **Proven on testnet** — a share paid and verified against the chain: recipient, value ≥ share, the `sq:<short_id>` marker, execution and finality, and the sender deliberately never matched. Its refusals have been run against real testnet transfers too — one to the squad's own recipient, for far more than the share, executed and final, was refused on the missing marker alone. On **mainnet** the refusal side was exercised as well: a payment attempted without the NIM to cover it was rightly refused |

**Check the evidence yourself.** The transactions these guards were built on are live on the
chain, and were re-read on 2026-11-11 with `getTransactionByHash` on `rpc.testnet.nimiqwatch.com`:

| Hash | Block | `executionResult` | Confirmations |
|---|---|---|---|
| [`70a282c0…a879b6`](https://test.nimiq.watch/#70a282c066550f00283f01be6d95c8c8341e44cc839ae45e231dc0a4d4a879b6) | 16,172,568 | **`false`** | 309,250 |
| [`0ad4e4a1…627a91`](https://test.nimiq.watch/#0ad4e4a120a7f88c7f5df55304e9804ff53804017f37c43082c4f346e2627a91) | 16,208,043 | `true` | 273,775 |

The first is a **real included-but-failed** transaction: in a block, fee spent, nothing done.
That one transaction is the reason this app never treats a hash as success — it waits for
`executionResult` **and** 60 confirmations. The second is a real inactivation whose staker still
read `inactiveFrom` 16,251,210 afterwards, 43,167 blocks later, which is why the release is
derived from the inclusion block. Both are recorded with their retrieval date in
`tests/fixtures/rpc/testnet.json`; `LIVE_RPC=1 pnpm test:live` runs the same reads against the
live node and signs and sends nothing.

`docs/AUDIT.md` is this project's own audit of itself, with every finding rated and the ones not
yet fixed listed by name. `docs/PROGRESS.md` records what ran, in order, with what output.

---

## FAQ

**Why 12–24 hours to get NIM out?**
It is Albatross's rule, not ours. Inactive stake is released only after the reporting window
that follows the next **election block**, and an epoch is about 12 hours. Squad Stake's job is to
tell you *when to start* so the NIM is liquid on goal day — that is the "Start leaving by …"
deadline: goal day minus 24 hours minus a 2-hour margin.

**Why NIM and not dollars?**
Because the proof only exists in NIM. A dollar figure would be a number we typed; a staked NIM
balance is a number anyone can read off the chain. Fiat is shown as an estimate where Nimiq Pay
tells us your currency — always with "≈", always labelled an estimate, with its source and the
price's age beside it, and **not at all** when the price source cannot be read.

**How do earnings work, and why does "Earned since joining" show "—"?**
Staked NIM earns where it sits, in your own wallet. The figure is measured, never estimated:
for a pool that **restakes**, it is your active balance today minus every deposit this app
watched land. There are eight named reasons it can say "—" instead, and it tells you which one
on tap. The most common at first: your stake has no history here yet, or Nimiq's validator data
does not publish the pool's payout type. One honest finding from building this: **no Nimiq
validator publishes a payout address today** (0 of 21 mainnet, 0 of 13 testnet when checked), so
for a pool that pays rewards *directly* to your wallet, those payouts cannot be told apart from
any other incoming transfer. The branch is written and tested, and it will measure the day a
pool publishes one.

**Who can see what?**
Your squad sees your commitment and whether the chain covers it. It does **not** see your
balance: "short by X" and "earned" go only to you. The public proof page shows commitments,
statuses and payment hashes — no balances, no invite link. Squad Stake never stores your keys,
your seed or your balance, and never stores a status as truth.

**What happens if someone leaves early?**
They can — it is their wallet. Leaving removes their commitment, pays no fee and sends no
transaction, and the squad sees it immediately: the member reads **Left the squad** and the
squad's total drops by their share. Unstaking is a separate decision they make from their own
stake. That is the honest cost of nobody holding the pot.
