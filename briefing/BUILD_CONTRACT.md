# BUILD_CONTRACT — Squad Stake
Date 2026-10-22. Changes need a `docs/DECISIONS.md` entry.

## Frozen
Category Save · both modes (A shared goal, B together goals) · non-custodial · chain is the truth ·
stack per `AGENTS.md` · public nimiqwatch RPC · NIM only.

## Protected critical path (tests first, DECISIONS entry to change)
`apps/web/app/api/auth/verify/route.ts` · `apps/web/src/server/core/{commitments,member-status,release,payment-check,tx-tracker}.ts` ·
`apps/web/src/core/staking-actions.ts` · the provider call sites in `apps/web/src/wallet/` ·
`packages/ui` purity rules (any change that makes a component impure breaks the video).

## Never
Hold funds or keys · retry a wallet call · show done on a hash · store balances as truth ·
use `listAccounts()` for identity · match a payment's sender · invent a number.

## Cut order if short on time
P2 → fiat estimates → earned-since-joining → pool-aware validator choice.
**Never cut:** sign-in, commitment invariant, chain-derived statuses, planner incl. jail,
tx tracker, Mode A payment check, privacy notice, one real mainnet squad.
