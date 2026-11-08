import { formatLuna, readAge } from './format';
import { ScreenHeader } from './ScreenHeader';
import { StatusDot } from './StatusDot';
import { STATUS_LABELS, statusTone } from './status';
import type { MemberStatusView } from './status';

export type { MemberStatusView } from './status';

export interface MemberStatusBadgeProps {
  state: MemberStatusView | null;
  readAt: number | null;
  now: number;
  estimatedReleaseAt?: number | null;
  refreshError?: { message: string; nextAction: string };
}

export function MemberStatusBadge({ state, readAt, now, estimatedReleaseAt = null, refreshError }: MemberStatusBadgeProps) {
  if (state === null || readAt === null) return <section className="member-status" role="status">
    <p className="member-status-label">—</p>
    <p className="member-status-detail">Waiting for a chain read.</p>
    <p className="member-status-age">Chain read: —</p>
    {refreshError && <p className="fine-print">{refreshError.message}. {refreshError.nextAction}</p>}
  </section>;
  const minutes = estimatedReleaseAt === null ? null : Math.max(0, Math.ceil((estimatedReleaseAt - now) / 60_000));
  const label = state.status === 'SHORT' && state.shortBy !== null
    ? `Short by ${formatLuna(state.shortBy)}`
    : STATUS_LABELS[state.status];
  return <section className="member-status" data-status={state.status} role="status" aria-live="polite">
    <p className="member-status-label">
      <StatusDot tone={statusTone(state.status)} label={STATUS_LABELS[state.status]} /> {label}
    </p>
    <p className="member-status-detail">
      {state.status === 'BACKED' && 'Your active stake covers your commitments.'}
      {/* A masked gap is another member's: the squad sees backed or short, never a balance
          (briefing/FAILURE_MODES.md, "Privacy"). */}
      {state.status === 'SHORT' && (state.shortBy === null
        ? 'This stake is below the commitment. The squad sees short, not the balance.'
        : 'Your active stake is below your total commitments.')}
      {state.status === 'UNSTAKING' && (state.releaseBlock === null ? 'Release estimate: —'
        : minutes === null ? `Waiting for block ${state.releaseBlock.toLocaleString('en-US')}.`
          : minutes === 0 ? 'Waiting for chain confirmation.'
            : `About ${Math.floor(minutes / 60)} h ${minutes % 60} min until release.`)}
      {state.status === 'RELEASABLE' && 'The wait is over. You can confirm retirement.'}
      {state.status === 'RETIRED' && 'Your retired stake can now return to your wallet.'}
      {state.status === 'NOT_STAKING' && 'No staker record was found for your address.'}
      {state.status === 'LEFT' && 'This member left the squad. Their commitment was removed.'}
    </p>
    <p className="member-status-age">{readAge(readAt, now)}{refreshError && ` · ${refreshError.message}`}</p>
    {refreshError && <p className="fine-print">{refreshError.nextAction}</p>}
    {state.status === 'UNSTAKING' && <p className="fine-print">Timing is approximate. The chain confirms release.</p>}
  </section>;
}

export function MemberStatusScene({ demoLabel, ...props }: MemberStatusBadgeProps & { demoLabel: string }) {
  return <main className="member-scene">
    <ScreenHeader demoLabel={demoLabel} />
    <div className="member-scene-body"><p className="eyebrow">ON-CHAIN STATUS</p><h1>Your stake.</h1>
      <MemberStatusBadge {...props} />
    </div>
  </main>;
}
