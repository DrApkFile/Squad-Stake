import 'server-only';
import { createHash } from 'node:crypto';
import { EARNED_TX_PAGE, MINIMUM_STAKE_LUNA, SPREAD_SAMPLE_LIMIT } from '../../config/constants';
import { commitSuggestion } from '../../core/commit-suggestion';
import type { JoinView, PoolWire } from '../../core/view-contract';
import type { EarnedDeps, EarnedPool } from '../core/member-earned';
import { isActive } from '../core/squads';
import { createTxTracker } from '../core/tx-tracker';
import { squadDetail, squadProof, type DetailDeps, type DetailResult } from '../core/squad-detail';
import { chooseValidator, choosePoolValidator } from '../core/validator-choice';
import { poolDirectory, type Pool } from './pool-directory';
import { nimiqRpc } from './rpc-client';
import { squadStore } from './squad-store';

/**
 * PRD §7.7 "spread members": how many of this app's members each validator already has,
 * counted from the chain — every current member's own staker record says who it delegates
 * to. Nothing about a delegation is stored, so the count cannot drift from the chain, and a
 * member whose read fails simply does not count towards the spread this time.
 *
 * Capped at SPREAD_SAMPLE_LIMIT addresses (ordered, so the sample is deterministic) because
 * this runs on the one screen where a member is about to create a staker, and an unbounded
 * fan-out of reads on a user-facing path is worse than a slightly stale spread. The reads go
 * through the 60 s per-address cache, and a wrong count would only mean a less even spread.
 */
async function membersPerValidator(): Promise<ReadonlyMap<string, number>> {
  const rpc = nimiqRpc();
  const addresses = await squadStore.activeMemberAddresses(SPREAD_SAMPLE_LIMIT);
  const stakers = await Promise.all(addresses.map((address) => rpc.getStakerByAddress(address)));
  const counts = new Map<string, number>();
  for (const staker of stakers) {
    if (!staker.ok || staker.data.status !== 'STAKING') continue;
    const delegation = staker.data.staker.delegation;
    if (delegation === null) continue;
    counts.set(delegation, (counts.get(delegation) ?? 0) + 1);
  }
  return counts;
}

/**
 * The validator a first stake would be delegated to, and the pool facts shown before the
 * approval (PRD §7.7). Pool-aware when Nimiq's Validators API answers; when it does not, the
 * chain-only rule decides and `fallback: true` makes the sheet say so, because a fee and a
 * payout type nobody read must not appear on screen (AGENTS.md "Never fabricate").
 */
async function choosePool(): Promise<{ delegation: string | null; pool: PoolWire | null }> {
  const rpc = nimiqRpc();
  const [validators, directory] = await Promise.all([rpc.getActiveValidators(), poolDirectory()()]);
  if (!validators.ok) return { delegation: null, pool: null };
  const counts = await membersPerValidator();
  if (!directory.ok) {
    const delegation = chooseValidator(validators.data, counts);
    return {
      delegation,
      pool: delegation === null ? null : {
        address: delegation, name: null, feeFraction: null,
        payout: null, payoutSchedule: null, fallback: true,
      },
    };
  }
  const delegation = choosePoolValidator(validators.data, directory.pools, counts);
  if (delegation === null) return { delegation: null, pool: null };
  const pool: Pool | undefined = directory.pools.get(delegation);
  return {
    delegation,
    pool: pool === undefined ? null : {
      address: pool.address, name: pool.name, feeFraction: pool.feeFraction,
      payout: pool.payout, payoutSchedule: pool.payoutSchedule, fallback: false,
    },
  };
}

/**
 * Everything the join/commit sheet needs, read on the server (PRD §7.3.2). Display reads
 * may come from the 60 s cache; the commitment itself re-reads with `fresh: true`.
 */
export async function joinView(token: string, address: string | null): Promise<JoinView | null> {
  const hash = createHash('sha256').update(token).digest('hex');
  const squad = await squadStore.getSquadByInviteHash(hash);
  if (!squad || !isActive(squad)) return null;
  const rpc = nimiqRpc();
  const memberCount = await squadStore.countActiveMembers(squad.id);
  const view: JoinView = {
    squadId: squad.id,
    squad: { name: squad.name, mode: squad.mode, targetLuna: squad.targetLuna,
      goalAt: squad.goalAt, memberCount },
    member: null, delegation: null, minimumLuna: MINIMUM_STAKE_LUNA, pool: null,
    suggestion: null,
  };
  if (address === null) return view;

  const [staker, commitments, membership] = await Promise.all([
    rpc.getStakerByAddress(address), squadStore.activeCommitments(address),
    squadStore.getMembership(squad.id, address),
  ]);
  const otherCommitmentsLuna = commitments
    .filter((commitment) => commitment.squadId !== squad.id)
    .reduce((total, commitment) => total + commitment.committedLuna, 0);
  view.suggestion = commitSuggestion(squad, memberCount,
    membership !== null && membership.leftAt === null,
    commitments.find((commitment) => commitment.squadId === squad.id)?.committedLuna ?? 0);
  if (staker.ok) {
    view.member = {
      activeBalanceLuna: staker.data.status === 'STAKING' ? staker.data.staker.balance : null,
      otherCommitmentsLuna, readAt: staker.readAt,
    };
  }
  // A validator is only needed for a first stake, so the pool directory and the spread count
  // are read on that screen alone (PRD §7.7).
  if (view.member?.activeBalanceLuna === null) {
    const chosen = await choosePool();
    view.delegation = chosen.delegation;
    view.pool = chosen.pool;
  }
  return view;
}

/** One set of dependencies for both read views: the memoised RPC client (so its 60 s
 * per-address cache survives between requests) and the squad store. */
function earnedDeps(): EarnedDeps {
  const rpc = nimiqRpc();
  return {
    async pools() {
      const directory = await poolDirectory()();
      if (!directory.ok) return null;
      const facts = new Map<string, EarnedPool>();
      for (const [address, pool] of directory.pools) {
        facts.set(address, { payout: pool.payout, payoutAddress: pool.payoutAddress });
      }
      return facts;
    },
    trackedTxsForAddress: async (address) =>
      (await squadStore.trackedTxsForAddress(address)).map((tx) => ({
        kind: tx.kind, state: tx.state, valueLuna: tx.expected.valueLuna,
      })),
    async incomingFrom(address, from, since) {
      // Only reached when a `direct` pool has published a payout address; none does today
      // (pool-directory.ts), so this path is proven by test rather than by a live pool.
      const page = await rpc.getTransactionsByAddress(address, EARNED_TX_PAGE);
      if (!page.ok) return null;
      // `timestamp` is milliseconds on the wire (tests/fixtures/rpc/testnet.json) and absent
      // for a mempool transaction, which has not earned anybody anything yet.
      return page.data
        .filter((tx) => tx.from === from && tx.to === address
          && tx.timestamp !== undefined && tx.timestamp >= since)
        .map((tx) => ({ valueLuna: tx.value }));
    },
  };
}

function detailDeps(): DetailDeps {
  const rpc = nimiqRpc();
  const detailRpc: DetailDeps['rpc'] = {
    getBlockNumber: () => rpc.getBlockNumber(),
    getStakerByAddress: (address) => rpc.getStakerByAddress(address),
    getValidatorByAddress: (address) => rpc.getValidatorByAddress(address),
    getElectionBlockAfter: (block) => rpc.getElectionBlockAfter(block),
    getBlockAfterReportingWindow: (block) => rpc.getBlockAfterReportingWindow(block),
    getBlockAfterJail: (block) => rpc.getBlockAfterJail(block),
    // The paid roster reads one transaction per payer, so it asks for the 60 s cache
    // (rpc.ts explains why this method's default is the other way round).
    getTransactionByHash: (hash, options) => rpc.getTransactionByHash(hash, options),
  };
  return {
    earned: earnedDeps(),
    store: squadStore,
    rpc: detailRpc,
    now: Date.now,
    /**
     * The tracker, so an open transaction is checked against the chain when this page is read
     * rather than only while a client happens to be polling `/api/tx/:hash`.
     *
     * Its transaction read deliberately goes through the 60 s cache, unlike the tracker's own
     * default of a fresh read (`rpc.ts`): this is a display path that may be reached once per
     * member per page load, and on the **public** proof view by anyone at all, so it must not
     * turn page views into uncached node traffic. The client's poll keeps the fresh read, which
     * is the path that needs to see confirmations climb.
     */
    tracker: createTxTracker({
      store: squadStore,
      rpc: { getTransactionByHash: (hash) => rpc.getTransactionByHash(hash, { fresh: false }) },
      now: Date.now,
    }),
  };
}

/** Screen 5: the squad's own page, for a member. */
export function squadDetailView(squadId: string, viewer: string): Promise<DetailResult> {
  return squadDetail(squadId, viewer, detailDeps());
}

/** Screen 10: the public proof view, by short id or uuid, with no viewer. */
export function proofView(id: string): Promise<DetailResult> {
  return squadProof(id, detailDeps());
}

/** Screen 3: the viewer's squads. No chain read — the figures are our record of commitments,
 * and the screen says "committed" rather than "backed" because of it. */
export async function mySquadsView(address: string) {
  const summaries = await squadStore.squadsForAddress(address);
  const squads = await Promise.all(summaries.map(async (summary) => ({
    id: summary.squad.id,
    shortId: summary.squad.shortId,
    name: summary.squad.name,
    mode: summary.squad.mode,
    goalAt: summary.squad.goalAt,
    targetLuna: summary.squad.targetLuna,
    committedLuna: summary.committedLuna,
    squadCommittedLuna: summary.squadCommittedLuna,
    memberCount: summary.memberCount,
    // Addresses only: the card draws identicons from them and claims no status.
    members: (await squadStore.listMembers(summary.squad.id))
      .filter((membership) => membership.leftAt === null)
      .map((membership) => membership.address),
  })));
  return squads;
}
