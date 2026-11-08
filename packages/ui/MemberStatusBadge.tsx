import { formatCount, formatLuna, readAge } from './format';
import { DEFAULT_LANG, strings, type Lang } from './i18n';
import { ScreenHeader } from './ScreenHeader';
import { StatusDot } from './StatusDot';
import { statusLabel, statusTone } from './status';
import type { MemberStatusView } from './status';

export type { MemberStatusView } from './status';

export interface MemberStatusBadgeProps {
  state: MemberStatusView | null;
  readAt: number | null;
  now: number;
  estimatedReleaseAt?: number | null;
  refreshError?: { message: string; nextAction: string };
  lang?: Lang | undefined;
}

export function MemberStatusBadge({
  state, readAt, now, estimatedReleaseAt = null, refreshError, lang = DEFAULT_LANG,
}: MemberStatusBadgeProps) {
  const s = strings(lang);
  if (state === null || readAt === null) return <section className="member-status" role="status">
    <p className="member-status-label">{s.common.unknownValue}</p>
    <p className="member-status-detail">{s.memberStatus.waitingRead}</p>
    <p className="member-status-age">{s.fmt.readAgeNone}</p>
    {refreshError && <p className="fine-print">{refreshError.message}. {refreshError.nextAction}</p>}
  </section>;
  const minutes = estimatedReleaseAt === null ? null : Math.max(0, Math.ceil((estimatedReleaseAt - now) / 60_000));
  const label = state.status === 'SHORT' && state.shortBy !== null
    ? s.status.shortBy(formatLuna(state.shortBy, lang))
    : statusLabel(state.status, lang);
  return <section className="member-status" data-status={state.status} role="status" aria-live="polite">
    <p className="member-status-label">
      <StatusDot tone={statusTone(state.status)} label={statusLabel(state.status, lang)} /> {label}
    </p>
    <p className="member-status-detail">
      {state.status === 'BACKED' && s.memberStatus.backed}
      {/* A masked gap is another member's: the squad sees backed or short, never a balance
          (briefing/FAILURE_MODES.md, "Privacy"). */}
      {state.status === 'SHORT' && (state.shortBy === null
        ? s.memberStatus.shortMasked
        : s.memberStatus.shortYours)}
      {state.status === 'UNSTAKING' && (state.releaseBlock === null ? s.memberStatus.releaseUnknown
        : minutes === null ? s.memberStatus.waitingBlock(formatCount(state.releaseBlock, lang))
          : minutes === 0 ? s.memberStatus.waitingConfirmation
            : s.memberStatus.untilRelease(Math.floor(minutes / 60), minutes % 60))}
      {state.status === 'RELEASABLE' && s.memberStatus.releasable}
      {state.status === 'RETIRED' && s.memberStatus.retired}
      {state.status === 'NOT_STAKING' && s.memberStatus.notStaking}
      {state.status === 'LEFT' && s.memberStatus.left}
    </p>
    <p className="member-status-age">{readAge(readAt, now, lang)}{refreshError && ` · ${refreshError.message}`}</p>
    {refreshError && <p className="fine-print">{refreshError.nextAction}</p>}
    {state.status === 'UNSTAKING' && <p className="fine-print">{s.memberStatus.approximate}</p>}
  </section>;
}

export function MemberStatusScene({ demoLabel, ...props }: MemberStatusBadgeProps & { demoLabel: string }) {
  const s = strings(props.lang ?? DEFAULT_LANG);
  return <main className="member-scene">
    <ScreenHeader demoLabel={demoLabel} />
    <div className="member-scene-body">
      <p className="eyebrow">{s.memberStatus.sceneEyebrow}</p><h1>{s.memberStatus.sceneHeading}</h1>
      <MemberStatusBadge {...props} />
    </div>
  </main>;
}
