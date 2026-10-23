# IDEA_CHECK — Squad Stake

Date 2026-10-21. Read after `anti-patterns.md`.

## Hook
**"Save together for anything. Nobody holds the pot, and the money earns while you wait."**

## Who, job, how they cope, where it fails (global)
- **Who:** friends, families, roommates, clubs saving toward something, anywhere.
- **Today:** one person collects everyone's money (bank transfer, NimCircle, a jar), or everyone
  "promises" and nobody checks. One person holds the risk; the money earns nothing.
- **Fails because:** trust in the holder; no visibility; idle money.

## Two modes (builder chose both)
- **A, Shared purchase:** goal amount + recipient. On goal day members unstake and pay the
  recipient; the app verifies each payment on-chain.
- **B, Own goals together:** each member saves their own target; the squad shares progress,
  nudges and the goal date. Nobody pays anybody.

## Hard core
1. **Proof without custody:** a member's commitment is verified against their on-chain staker
   (`getStakerByAddress`), derived from their signed identity. Invariant: Σ commitments ≤ active balance.
2. **Goal-day planner that respects the protocol:** inactivation takes effect at the next
   election block; retire only after the collateral lock-up (or jail end); remove must take the
   whole retired balance. The app computes "start leaving by" per member.
3. **Earnings attribution:** rewards arrive by pool payout or restake; attribute a member's
   share to the squad pro rata to the committed part.
4. **Mode A settlement:** each member's payment verified (recipient, value, data, execution,
   finality), sender **not** matched (Nimiq Pay pays from a cosigned HTLC).

## Thin-wrapper / feature test
No model call. Remove staking → it's NimCircle. Remove the squad → it's Nimjar. The product is
the **combination** plus the proof and planner; a wallet can't add it as one button.

## Sponsor deletion
NIM + Nimiq chain + Nimiq Pay staking calls are the whole product. Nothing else on the critical path
(fiat display via a price API is optional).

## Boundary
Members' wallets hold the money. The chain is the truth. Jolt-style rule: the server decides
displayed state from chain data only; Squad Stake never moves or holds funds.

## Loop (incl. the skipped step)
create squad → invite (link) → each member signs in + stakes/commits → live progress + earned
→ goal-day plan → unstake on time → (A) pay recipient, verified / (B) celebrate.
**Skipped step others miss:** a member unstakes early or their validator is jailed → squad sees it,
planner recalculates, Mode A never pays out to an incomplete pot silently.

## Honest weaknesses
1. **NIM price moves.** A trip priced in dollars can fall short if NIM drops. Goals are
   denominated in NIM with a fiat estimate, and the app says so plainly.
2. **No enforcement.** Members can leave anytime (self-custody). Visibility, not locks.
3. **Small yield at today's NIM price.** Earnings are a bonus, not the reason to use it.
4. **Unstaking takes ~1–2 epochs.** Turned into a feature: the planner.

## What we do not claim
Not a bank, not custody, not guaranteed returns, not a lock.

## Rubric map
| Criterion | Answer | Proof |
|---|---|---|
| Functionality 45 | create → join → progress → goal-day plan → settle, every state handled | live app, testnet + mainnet |
| Integration 25 | 6 staking calls, sign-in by signature, NIM payments, chain-verified state | `GET /api/proof/squad/:id` |
| Real usage 15 | each squad invites 3–10 wallets; 25 wallets = full marks (Cycle 2 rule) | measurement |
| Design 10 | Nimiq Pay's own principles: calm on commit | video |
| Promotion 5 | Skool + X | links |

## Category
Recommend **Save**: the Cycle 3 examples page lists "savings goals" and "group savings jars" under Save.
Earn is thinner historically but its brief leans to EVM yield. Final call at submission.

## Verdict
**GO**, pending spikes S1–S8 (`REALITY_SPIKES.md`). Kill if S2 shows staker records can't be read
reliably, or S6 shows staking from a mini app fails.
