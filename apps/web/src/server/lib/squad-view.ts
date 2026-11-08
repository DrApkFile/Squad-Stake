import 'server-only';
import { createHash } from 'node:crypto';
import { MINIMUM_STAKE_LUNA } from '../../config/constants';
import type { JoinView } from '../../core/view-contract';
import { isActive } from '../core/squads';
import { squadDetail, squadProof, type DetailDeps, type DetailResult } from '../core/squad-detail';
import { chooseValidator } from '../core/validator-choice';
import { nimiqRpc } from './rpc-client';
import { squadStore } from './squad-store';

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
    member: null, delegation: null, minimumLuna: MINIMUM_STAKE_LUNA,
  };
  if (address === null) return view;

  const [staker, commitments] = await Promise.all([
    rpc.getStakerByAddress(address), squadStore.activeCommitments(address),
  ]);
  const otherCommitmentsLuna = commitments
    .filter((commitment) => commitment.squadId !== squad.id)
    .reduce((total, commitment) => total + commitment.committedLuna, 0);
  if (staker.ok) {
    view.member = {
      activeBalanceLuna: staker.data.status === 'STAKING' ? staker.data.staker.balance : null,
      otherCommitmentsLuna, readAt: staker.readAt,
    };
  }
  // A validator is only needed for a first stake. The spread count per validator arrives
  // with the full §7.7 pool-aware choice (PRD §10, Nov 8); until then eligibility and a
  // deterministic tie-break decide, which never picks a jailed or retired validator.
  if (view.member?.activeBalanceLuna === null) {
    const validators = await rpc.getActiveValidators();
    if (validators.ok) view.delegation = chooseValidator(validators.data, new Map());
  }
  return view;
}

/** One set of dependencies for both read views: the memoised RPC client (so its 60 s
 * per-address cache survives between requests) and the squad store. */
function detailDeps(): DetailDeps {
  const rpc = nimiqRpc();
  return {
    store: squadStore,
    rpc: {
      getBlockNumber: () => rpc.getBlockNumber(),
      getStakerByAddress: (address) => rpc.getStakerByAddress(address),
      // The paid roster reads one transaction per payer, so it asks for the 60 s cache
      // (rpc.ts explains why this method's default is the other way round).
      getTransactionByHash: (hash, options) => rpc.getTransactionByHash(hash, options),
    },
    now: Date.now,
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
