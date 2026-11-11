# SUBMISSION — Nimiq Mini Apps Competition, Cycle III

Submit on **2026-11-10**. Hard deadline **2026-11-11 23:59 UTC**.
Category: **Save** (Cycle 3's own examples list "savings goals" and "group savings jars").

Go live first: `docs/GO-LIVE.md`. Judges' roadmap: `JUDGING.md`.

## The 250-word description (paste as-is)

Exactly 250 words, which is the cap in eligibility gate A07 (`briefing/EVENT.md`). Counted with
`wc -w`. If the portal counts differently, cut from the fourth paragraph, not the fifth — the
fifth is the Nimiq integration, which is 25 of the 100 points.

---

> Squad Stake lets a group save toward a goal without anyone holding the money.
>
> Groups normally hand their cash to one person, who then carries the risk; nobody else can check the balance, and the money sits idle. Squad Stake keeps every share staked in its owner's own Nimiq wallet, where it earns — and reads the group's progress off the chain instead of out of a database.
>
> Create a squad: a name, a goal day, and either one shared total with a recipient fixed up front or everyone's own target. One link invites the rest; each member commits an amount and stakes it themselves. The squad page shows each member as saved, short, leaving, ready, withdrawn or paid — each status derived from a fresh chain read, with the age of that read beside it. A public proof page shows the same to anyone, with no account, and prints the RPC call to repeat it.
>
> It is for groups that trust each other enough to plan something, and not enough to put one person in charge of the money: trips, gifts, shared purchases, saving alongside friends.
>
> Nimiq Pay is the whole experience. Signing in is one message signature, and the member's address is derived from its public key. Six staking calls — create staker, add stake, set active stake, retire, remove, and a payment carrying an on-chain reference — go through Nimiq Pay, and nothing moves without an approval. Statuses, release times and payments are checked against Nimiq RPC.

---

## Form fields

| Field | Value |
|---|---|
| App name | **Squad Stake** |
| Category | **Save** |
| One-liner | Save together for anything — nobody holds the pot, and every share is proven on the Nimiq chain. |
| Description | the 250 words above |
| Live URL | `https://squad-stake.vercel.app` |
| Nimiq Pay deeplink | `https://nimpay.app/miniapps/open/squad-stake.vercel.app` |
| Repository (public, MIT) | `https://github.com/DrApkFile/Squad-Stake` |
| Demo video | <https://youtu.be/iYhnj-aDvJ8> — 2:45, also in `README.md` and `JUDGING.md` |
| Team lead name / pseudonym | ☐ **to fill in** |
| GitHub handle | `DrApkFile` |
| Contact email | ☐ **to fill in** |
| Nimiq payout address (mainnet) | ☐ **to fill in** — check every character; nobody can undo a payout to the wrong address |
| Team size | 1 (confirm: ≤ 5, all 18+) |

## Checklist before submitting

Eligibility gates are from `briefing/EVENT.md`; tick each one against the real thing, not from
memory.

- [ ] **A02** The repository is **public** and `LICENSE` (MIT) is in it. Third-party notices:
      `THIRD_PARTY_NOTICES.md`.
- [ ] **A05** No keys or secrets: `pnpm secrets` passes, and `.env*` is gitignored except
      `.env.example`.
- [ ] **A06** Live on **mainnet** and working first try: `docs/GO-LIVE.md` steps 1–9 done,
      including one real squad created from a phone and the proof page loading signed out.
- [ ] **A07** The description is ≤ 250 words (it is 250).
- [ ] **A08** Category **Save** selected.
- [ ] **A09** Nothing off-limits: no chance mechanics, no custody, no impersonation. The app
      recreates no part of Nimiq Pay's own UI.
- [ ] **A11** The privacy notice is shown **before** the first save, and it says what is kept
      (squads, commitments, hashes) and what never is (keys, seed, balance).
- [ ] The commit being submitted passes `pnpm gate` from a clean tree.
- [ ] `JUDGING.md` and `README.md` both carry the live link and the video link, and
      `JUDGING.md` is linked from the top of the README.
- [ ] Every claim in the README and `JUDGING.md` is marked PROVEN in `briefing/PROOF_PLAN.md`,
      and anything proven on **testnet** says the word testnet.
- [ ] **Builder promotion** (5 points): the Skool post and a public social post, both before
      2026-11-10.

## What the submission may claim

`briefing/PROOF_PLAN.md` is the ledger, and nothing in the submission may say more than it does.
As of 2026-11-11, each of these was done on a real phone in Nimiq Pay:

- **Mainnet:** sign in, create a squad, the squad page and the public proof page, all reading
  mainnet at <https://squad-stake.vercel.app>.
- **Testnet:** progress verified on-chain (2026-11-08) — *Create staker* approved, the hash
  tracked to executed-and-final, and the squad page showing a chain-derived status.
- **Testnet:** the complete leaving cycle — start leaving, the chain's own release wait, confirm
  withdrawal, withdraw, ending in **Withdrawn** — so the planner's timing is the chain's.
- **Testnet:** a shared-goal (Mode A) payment settled and verified against the chain; its refusal
  side exercised on mainnet as well.
- **Real usage:** used end to end by the builder. No outside users and **no usage numbers** are
  claimed anywhere — a traction figure nobody can check is worth less than none.

Judge-checkable without waiting: the hash table in `JUDGING.md`, whose transactions were re-read
from the live node on 2026-11-11, and the public proof page of any squad, which prints the exact
RPC call. `docs/AUDIT.md` lists this project's own findings against itself.
