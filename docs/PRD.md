# Squad Stake — PRD

Written 2026-10-22. Single source of truth. Evidence lives in `briefing/`. When evidence
contradicts this file, log it in `DECISIONS.md` and update this file.

## 1. One sentence
**Save together for anything: nobody holds the pot, every share is proven on the Nimiq
chain, and the money earns while you wait.**

## 2. Problem
Groups saving for something (a trip, a gift, a shared purchase, or each person's own goal
with friends for motivation) hand money to one person, or rely on promises. One person
carries the risk, nobody can check progress, and the money sits idle.

## 3. Goals / non-goals
**Goals**
- G1. Create a squad in under a minute and invite people with one link.
- G2. Each member's share stays in their own wallet, staked, and is **verified on-chain**.
- G3. Everyone sees honest progress: backed / short / unstaking / ready / paid.
- G4. A goal-day planner that tells each member exactly when to start unstaking.
- G5. Mode A: payments to the recipient verified on-chain.
- G6. Works first time, on a phone, in Nimiq Pay, on mainnet.

**Non-goals (never this cycle):** custody of any funds; locks or penalties; rotating payouts
(circles); single-user staking features NimJar already does well (validator optimisation,
detailed earnings history); EVM assets; push notifications.

## 4. Modes
- **A, Shared goal:** total target (NIM), goal date, **recipient address** fixed at creation
  (default: organiser). On goal day members unstake and pay the recipient.
- **B, Together goals:** each member sets a personal target; shared goal date; nobody pays
  anybody. The squad is accountability and visibility.

## 5. Vocabulary
- **Commitment:** NIM a member assigns to a squad. App-level; backed by their active stake.
- **Backed:** on-chain active balance ≥ the member's total commitments.
- **Short by X:** on-chain active balance is X below their commitments.
- **Leave-by time:** latest moment to start unstaking and still have NIM on goal day.
- **Release block:** block from which inactive stake can be retired.

## 6. Hook, loop, boundary
- **Hook:** "Save together. Nobody holds the pot."
- **Loop:** create → share link → friends sign in and commit → live progress → leave-by
  reminder in-app → unstake → withdraw → (A) pay, verified → squad completed.
- **Boundary:** members' wallets hold the money; the chain is the truth; Squad Stake stores
  intentions (squads, commitments, tx hashes) and derives every status from chain reads.

## 7. Flows

### 7.1 Sign in
Challenge → `sign()` → server verifies (Nimiq signed-message digest, official library) →
address derived from public key = the member's **staker address** (`knowledge/staking.md`).

### 7.2 Create squad
Name, mode, target(s) in NIM, goal date (≥ 3 days ahead), recipient (Mode A). Fiat estimate
shown as an estimate only (P1). Privacy notice accepted before first save.

### 7.3 Join + commit
1. Invite link → sign in → see squad, members, statuses.
2. Server reads `getStakerByAddress(member)`:
   - not a staker → offer **Create staker** (`sendNewStakerTransaction`, validator from §7.7,
     amount ≥ 100 NIM);
   - staker with free active balance → commit without any transaction;
   - staker without enough free balance → offer **Add stake** (`sendStakeTransaction`).
3. Commitment saved only if Σ commitments ≤ active balance after the tracked tx is
   `INCLUDED_OK`.

### 7.4 Progress
`GET /api/squads/:id` reads every member's staker (60 s cache) and returns, per member:
committed, status (BACKED / SHORT by X / UNSTAKING / RELEASABLE / RETIRED / WITHDRAWN /
PAID / LEFT), and the time the data was read. Squad total = Σ backed amounts.

### 7.5 Goal-day planner
- `leaveBy = goalTime − 24 h − 2 h margin`. Shown on every screen from 3 days before.
- When a member taps **Start leaving**: `sendSetActiveStakeTransaction({ newActiveBalance:
  active − amount })`; if they are in other squads, show which squads go SHORT first.
- Release: `getBlockAfterReportingWindow(getElectionBlockAfter(inclusionBlock))`; if the
  validator has `jailedFrom`, use the later of that and `getBlockAfterJail(jailedFrom)`.
- At release: **Confirm withdrawal** (`sendRetireStakeTransaction`, irreversible, needs a
  confirm tick), then **Withdraw** (`sendRemoveStakeTransaction`, `value = retiredBalance`
  read fresh, `fee = 0`).

### 7.6 Mode A settlement
**Pay my share** → `sendBasicTransactionWithData({ recipient, value: share, data: 'sq:<id8>' })`.
Server verifies via RPC: recipient, value ≥ share, data, `executionResult`, finality. **Sender
is not matched** (Nimiq Pay pays from a cosigned HTLC). Roster: "4 of 6 paid".

### 7.7 Validator choice (create staker only)
P0: active, not jailed, not retired validators from `getActiveValidators`, pick the one with
the fewest Squad Stake members (spread). P1: prefer pools that pay stakers (S4b).

### 7.8 Leave a squad
Any time. Commitment removed; nothing on-chain changes unless the member chooses to unstake.

## 8. State machines
**Squad:** `OPEN → SAVING → LEAVING (now ≥ leaveBy) → SETTLING (A) → COMPLETED`; `CANCELLED`
from OPEN/SAVING by organiser.
**Member status** (derived from chain each read, never stored as truth):
`JOINED → BACKED ⇄ SHORT → UNSTAKING → RELEASABLE → RETIRED → WITHDRAWN → PAID (A)`; `LEFT`.
**Tracked tx:** `SUBMITTED → INCLUDED_OK | INCLUDED_FAILED | UNKNOWN`. `UNKNOWN` never becomes
failed by timeout; it is re-checked.

## 9. Screens (P0 unless marked)
0 Privacy notice · 1 Open in Nimiq Pay · 2 Sign in · 3 My squads · 4 Create squad ·
5 Squad page (progress ring, members, leave-by banner, share link) · 6 Join/commit sheet ·
7 Leaving steps (3 steps, countdown, confirm tick) · 8 Pay my share (A) · 9 Tx status sheet
· 10 Proof view (per member: last chain read, staker address link) · 11 Fiat estimates (P1)
· 12 Earned since joining (P1, S4b)

## 10. Priorities
- **P0 (live on mainnet by 2026-10-30):** 7.1–7.6, 7.8, screens 0–10, error catalog, tx tracker,
  planner incl. jail case, dev harness.
- **P1 (by 2026-11-05):** 7.7 pool-aware choice, earned since joining, fiat estimates,
  multi-squad warnings polish.
- **P2:** extra languages (es, de, fr, pt), squad templates.

## 11. Security
| Threat | Guard |
|---|---|
| Replayed sign-in | single-use 5-min wallet-bound challenge |
| Claimed address | derived from verified public key |
| Fake progress | statuses only from chain reads; client never sends balances |
| Fake payment (A) | RPC-verified recipient, value, data, execution, finality |
| Invite enumeration | 128-bit tokens; join requires sign-in |
| Over-commitment | Σ commitments ≤ active balance, checked server-side at every commit |

## 12. Acceptance tests (IDs in test titles)
- Q01 challenge reuse / expiry / wrong key refused.
- Q02 session address derived from public key, client address ignored.
- Q03 commit refused when Σ commitments would exceed active balance.
- Q04 member status BACKED / SHORT computed correctly from a staker record.
- Q05 "Internal error" from `getStakerByAddress` maps to NOT_STAKING.
- Q06 release block = `getBlockAfterReportingWindow(getElectionBlockAfter(b))`.
- Q07 jailed validator → release = max(window, after-jail).
- Q08 leaveBy = goal − 26 h.
- Q09 every `NimiqProviderError` type maps to a catalog entry.
- Q10 a hash with `executionResult: false` is shown failed, never done.
- Q11 retire disabled before release block.
- Q12 remove sends `value = fresh retiredBalance`, `fee = 0`.
- Q13 one provider call per tap.
- Q14 actions blocked when Nimiq Pay network ≠ app network.
- Q15 Mode A payment verified without matching sender; wrong recipient/value/data refused.
- Q16 dev identities, mock provider and `/scenes` impossible in production builds.
- Q17 every `packages/ui` scene renders from fixtures alone (no network, no `window.nimiqPay`, no clock); a lint rule bans fetch/SDK/Date.now/Math.random imports in `packages/ui`.

## 13. Definition of finished
Live on mainnet; one real squad of ≥ 3 wallets with a complete Mode B cycle and one Mode A
payment verified (`PROOF_PLAN.md`); `pnpm gate` passes from a clean clone; README with live link
+ video first; every P0 screen checked at 390 px; Skool + X post.

## 13b. Demo video (≈ 90 s)
A **how-to walkthrough for judges**, rendered with Remotion from the **same `packages/ui`
components** as the app, inside a phone frame at 390 × 844, with **hand-written sample-data
fixtures** (`packages/ui/scenes/demo/`). It does not depend on the mainnet run, so it can be built
as soon as its screens exist. Nimiq Pay approval moments: neutral "Approve in Nimiq Pay" step or
real phone footage (never a recreation of their UI).
Script: problem (10 s) → create a trip squad, share link (20 s) → friends join, ring fills,
"verified on-chain" (25 s) → leave-by banner, three leaving steps (20 s) → shares paid, squad
complete (15 s). Acceptance: Q17 every demo scene renders from a fixture with no network access.

## 14. Submission
Category **Save** (Cycle 3 examples list "savings goals" and "group savings jars"). Public MIT
repo. ≤ 250-word description: what, who, how it uses Nimiq Pay (sign, 6 staking calls,
payments, chain-verified state).

## 15. Judge Q&A
- *NimCircle?* Money goes to the owner there; here it never leaves your wallet and it earns.
- *NimJar?* NimJar is great single-user staking; Squad Stake is a group product built on staking.
- *What if someone leaves?* Self-custody means they can; the squad sees it immediately.
- *NIM price risk?* Goals are in NIM; fiat is an estimate and labelled as one.
