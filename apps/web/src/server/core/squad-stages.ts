import type {
  ExitStage, MemberStatusWire, SquadMemberWire, StageTotals,
} from '../../core/view-contract';

/**
 * PRD §7.4's squad total, counted by the stage each share has reached instead of as
 * backed-or-nothing. Pure: statuses in, figures out.
 *
 * Why it exists: the squad page read "0 NIM backed" for a member who had started leaving on
 * schedule, because the total counted only BACKED (docs/PROGRESS.md 2026-11-09). Leaving is a
 * step through the plan, not a failure of it, so every stage of the exit keeps counting toward
 * the squad's progress under its own name, and a share is only missing when the member is
 * actually short of it.
 */
export type Stage =
  | 'backed' | 'leaving' | 'ready' | 'withdrawn' | 'paid' | 'missing' | 'unread' | 'left';

export function stageOf(status: MemberStatusWire | null): Stage {
  if (status === null) return 'unread';
  switch (status.status) {
    case 'BACKED': return 'backed';
    case 'UNSTAKING': return 'leaving';
    // Both mean the stake has come out of the active balance and is waiting on the member's
    // next tap: released but not yet retired, or retired but not yet withdrawn.
    case 'RELEASABLE':
    case 'RETIRED': return 'ready';
    case 'WITHDRAWN': return 'withdrawn';
    case 'PAID': return 'paid';
    case 'LEFT': return 'left';
    // SHORT and NOT_STAKING are the only two the chain says are not there.
    default: return 'missing';
  }
}

/** Null when not one active member could be read — the same rule as `backedLuna`, so the
 * screen says "not read" rather than showing a total built out of nothing. */
export function stageTotals(members: readonly SquadMemberWire[]): StageTotals | null {
  const active = members.filter((member) => stageOf(member.status) !== 'left');
  if (active.length === 0 || active.every((member) => member.status === null)) return null;
  const totals = { backedLuna: 0, leavingLuna: 0, readyLuna: 0, withdrawnLuna: 0, paidLuna: 0,
    missingLuna: 0, unreadLuna: 0, coveredLuna: 0 };
  for (const member of active) {
    const luna = member.committedLuna;
    switch (stageOf(member.status)) {
      case 'backed': totals.backedLuna += luna; break;
      case 'leaving': totals.leavingLuna += luna; break;
      case 'ready': totals.readyLuna += luna; break;
      case 'withdrawn': totals.withdrawnLuna += luna; break;
      case 'paid': totals.paidLuna += luna; break;
      case 'unread': totals.unreadLuna += luna; break;
      default: totals.missingLuna += luna; break;
    }
  }
  totals.coveredLuna = totals.backedLuna + totals.leavingLuna + totals.readyLuna
    + totals.withdrawnLuna + totals.paidLuna;
  return totals;
}

/**
 * Which stage of their own exit the viewer is in. Anything but `none` means leaving has already
 * started, so the banner must show the countdown and must not offer to start it again
 * (PRD §7.5; the second of the three defects found on testnet).
 */
export function exitStageOf(status: MemberStatusWire | null): ExitStage {
  switch (stageOf(status)) {
    case 'leaving': return 'leaving';
    case 'ready': return 'ready';
    case 'withdrawn': return 'withdrawn';
    case 'paid': return 'paid';
    default: return 'none';
  }
}
