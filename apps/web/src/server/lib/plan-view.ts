import 'server-only';
import { leavePlan, type PlanResult } from '../core/leave-plan';
import { settlePayment, type SettleResult } from '../core/settle';
import { nimiqRpc } from './rpc-client';
import { squadStore } from './squad-store';

/**
 * Screens 7 and 8 (PRD §7.5, §7.6). The memoised RPC client is passed whole: the planner and
 * the settlement both want its per-address caches and its explicit `fresh` bypasses, and both
 * read only methods that exist on it.
 */
export function leavePlanView(squadId: string, address: string): Promise<PlanResult> {
  return leavePlan(squadId, address, { store: squadStore, rpc: nimiqRpc(), now: Date.now });
}

/** Judges one member's payment against the chain and completes the squad if it was the last
 * one outstanding. The only write on this path, and conditional (settle.ts). */
export function settleMemberPayment(
  address: string, squadId: string, hash: string,
): Promise<SettleResult> {
  return settlePayment(address, squadId, hash, { store: squadStore, rpc: nimiqRpc() });
}
