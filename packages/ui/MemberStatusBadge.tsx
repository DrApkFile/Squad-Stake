import { formatLuna } from './format';

export type MemberStatusView =
  | { status: 'BACKED' | 'RELEASABLE' | 'RETIRED' | 'NOT_STAKING' }
  | { status: 'SHORT'; shortBy: number }
  | { status: 'UNSTAKING'; releaseBlock: number | null };

export interface MemberStatusBadgeProps {
  state: MemberStatusView | null;
  readAt: number | null;
  now: number;
  estimatedReleaseAt?: number | null;
  refreshError?: { message: string; nextAction: string };
}

function ageText(readAt: number | null, now: number) {
  if (readAt === null) return 'Chain read: —';
  const seconds = Math.max(0, Math.floor((now - readAt) / 1000));
  return `Checked ${seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min`} ago`;
}

export function MemberStatusBadge({ state, readAt, now, estimatedReleaseAt = null, refreshError }: MemberStatusBadgeProps) {
  if (state === null || readAt === null) return <section className="member-status" role="status">
    <p className="member-status-label">—</p>
    <p className="member-status-detail">Waiting for a chain read.</p>
    <p className="member-status-age">Chain read: —</p>
    {refreshError && <p className="fine-print">{refreshError.message}. {refreshError.nextAction}</p>}
  </section>;
  const labels = {
    BACKED: 'Backed', SHORT: 'Short', UNSTAKING: 'Unstaking', RELEASABLE: 'Ready to retire',
    RETIRED: 'Ready to withdraw', NOT_STAKING: 'Not staking',
  };
  const minutes = estimatedReleaseAt === null ? null : Math.max(0, Math.ceil((estimatedReleaseAt - now) / 60_000));
  return <section className="member-status" data-status={state.status} role="status" aria-live="polite">
    <p className="member-status-label">{state.status === 'SHORT' ? `Short by ${formatLuna(state.shortBy)}` : labels[state.status]}</p>
    <p className="member-status-detail">
      {state.status === 'BACKED' && 'Your active stake covers your commitments.'}
      {state.status === 'SHORT' && 'Your active stake is below your total commitments.'}
      {state.status === 'UNSTAKING' && (state.releaseBlock === null ? 'Release estimate: —'
        : minutes === null ? `Waiting for block ${state.releaseBlock.toLocaleString('en-US')}.`
          : minutes === 0 ? 'Waiting for chain confirmation.'
            : `About ${Math.floor(minutes / 60)} h ${minutes % 60} min until release.`)}
      {state.status === 'RELEASABLE' && 'The wait is over. You can confirm retirement.'}
      {state.status === 'RETIRED' && 'Your retired stake can now return to your wallet.'}
      {state.status === 'NOT_STAKING' && 'No staker record was found for your address.'}
    </p>
    <p className="member-status-age">{ageText(readAt, now)}{refreshError && ` · ${refreshError.message}`}</p>
    {refreshError && <p className="fine-print">{refreshError.nextAction}</p>}
    {state.status === 'UNSTAKING' && <p className="fine-print">Timing is approximate. The chain confirms release.</p>}
  </section>;
}

export function MemberStatusScene({ demoLabel, ...props }: MemberStatusBadgeProps & { demoLabel: string }) {
  return <main className="member-scene">
    <header className="brand"><span className="brand-mark" aria-hidden="true">s.</span> Squad Stake</header>
    <p className="demo-label">{demoLabel}</p>
    <div className="member-scene-body"><p className="eyebrow">ON-CHAIN STATUS</p><h1>Your stake.</h1>
      <MemberStatusBadge {...props} />
    </div>
  </main>;
}
