# Knowledge: NIM staking for Squad Stake

Sources read 2026-10-21: nimiq.dev protocol "Stakers" page and web-client staking guide (via
fetch, 2026-10-20); github.com/nimiq/core-rs-albatross `rpc-interface/src/{blockchain,policy,types}.rs`
(raw files); Nimiq Pay source @ eb1c1f2 (`useMiniAppHost.ts`, `src/lib/tx.ts`,
`src/lib/mini-app-launcher.ts`); `docs/reference/nimiq-mini-apps-tech-reference.md` §staking.

## What a mini app can do (provider, all need user approval, return a tx hash)
| Call | Params | Effect |
|---|---|---|
| `sendNewStakerTransaction` | `delegation` (validator address), `value` (luna) | create staker + first stake |
| `sendStakeTransaction` | `value` | add to active stake |
| `sendSetActiveStakeTransaction` | `newActiveBalance` | move stake between active and inactive |
| `sendUpdateStakerTransaction` | `newDelegation`, `reactivateAllStake?` | change validator |
| `sendRetireStakeTransaction` | `retireStake` | inactive → retired |
| `sendRemoveStakeTransaction` | `value` | retired → back to wallet |
There is **no read call** for staking state in the provider. Reads go through Nimiq JSON-RPC.

## Who the staker is (Nimiq Pay source)
- `add-stake` uses `stakerAddress = useLocalWallet().localAddress` (`src/lib/tx.ts`).
- That is the address derived from the key that `sign()` uses. So the server can derive a
  member's staker address from their verified sign-in and read it on-chain. No claims needed.
- **One staker per address, one delegation.** A user cannot split stake per squad on-chain.

## Protocol rules that shape the product (nimiq.dev "Stakers")
- Initial stake minimum: 100 NIM.
- Activate / inactivate / update take effect at the **next election block**.
- Inactive stake is released after the collateral lock-up window counted from the next election
  block; if the validator is jailed, the later of that and the jail end.
- Removal must withdraw the **entire retired balance** (no partial remove).
- Switching validator: set active to 0 → wait for release → update → reactivate.
- Epoch ≈ 12 hours (Validator Trustscore page).
- Rewards are distributed by validators/pools **off-chain**; pool payout types include
  restake, payout, none (Validators API).

## JSON-RPC (method names are camelCase, from `rename_all = "camelCase"`)
| Method | Use |
|---|---|
| `getStakerByAddress(address)` | `{ address, balance (active), delegation, inactiveBalance, inactiveFrom, retiredBalance }` |
| `getValidatorByAddress`, `getActiveValidators`, `getValidators` | validator status |
| `getStakersByValidatorAddress` | spikes only |
| `getTransactionsByAddress` | reward payouts, squad payments |
| `getTransactionByHash` | verify a member's payment on goal day |
| `getBlockNumber`, `getEpochNumber`, `getPolicyConstants` | time math |
| `getElectionBlockAfter(block)` | when an inactivation takes effect |
| `getBlockAfterCollateralLockup(block)` | when inactive stake can be retired (`getBlockAfterReportingWindow` is the deprecated name) |
| `getBlockAfterJail(block)` | if the validator is jailed |
Endpoints used by Nimiq Pay itself: `https://rpc.nimiqwatch.com`,
`https://rpc.testnet.nimiqwatch.com` (`src/lib/mini-app-launcher.ts`).

## Consequences for Squad Stake
1. A squad commitment is an **app-level claim on top of one staker balance**. Invariant:
   sum of a member's active commitments ≤ their on-chain active balance. Checked server-side.
2. Squads cannot force a validator. Each member keeps their own delegation.
3. Goal day needs **planning backwards**: inactivate → wait (election + lock-up, ~1–2 epochs)
   → retire → remove → (Mode A) pay. The app must tell members when to start.
4. "Earned so far" depends on the pool's payout type: restake shows as balance growth;
   payout shows as incoming transactions from the pool's reward address.
5. Nimiq Pay has **no native staking screen** (no staking views in `src/`), so staking inside
   Nimiq Pay happens only through mini apps today.
