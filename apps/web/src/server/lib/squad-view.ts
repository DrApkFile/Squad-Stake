import 'server-only';
import { createHash } from 'node:crypto';
import { MINIMUM_STAKE_LUNA } from '../../config/constants';
import type { JoinView } from '../../core/view-contract';
import { isActive } from '../core/squads';
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
