import type { ReactNode } from 'react';
import { ScreenHeader } from './ScreenHeader';
import { TxStatus } from './TxStatus';
import { countdown, formatLuna, formatMoment, readAge } from './format';

export type LeavingStepState =
  | { state: 'locked' }
  | { state: 'available' }
  /** Inactive stake exists, but the chain has not released it yet (Q11). */
  | { state: 'waiting' }
  | { state: 'pending'; hash: string }
  | { state: 'failed'; hash: string }
  | { state: 'done'; hash: string | null };

export interface LeavingStepsProps {
  squad: { name: string; shortId: string; mode: 'A' | 'B'; goalAt: number };
  leaveBy: number;
  now: number;
  /** Minutes east of UTC. A prop, never read from the machine, so the app, the video and a
   * test all render the same frame (AGENTS.md "UI purity" 1). */
  tzOffsetMinutes: number;
  /** The viewer's own stake. Null when they are not staking at all. */
  stake: { activeLuna: number; inactiveLuna: number; retiredLuna: number } | null;
  shareLuna: number;
  /** What step one will inactivate, as typed in NIM; the container converts at the edge. */
  amountNim: string;
  steps: {
    start: LeavingStepState; retire: LeavingStepState; withdraw: LeavingStepState;
    pay: LeavingStepState | null;
  };
  /** Null when the release cannot be derived yet, which keeps retire switched off. */
  release: {
    releaseBlock: number; remainingBlocks: number; estimatedReleaseAt: number; jailed: boolean;
  } | null;
  headBlock: number | null;
  /** Other squads that would show this member short once step one lands (PRD §7.5). */
  affected: readonly { squadId: string; name: string; committedLuna: number }[];
  shortfallLuna: number;
  confirmTicked: boolean;
  readAt: number | null;
  retireFeeLuna: number;
  unstakeFeeLuna: number;
  busy?: boolean | undefined;
  stalled?: boolean | undefined;
  error?: { message: string; nextAction: string } | undefined;
  explorerBase?: string | null | undefined;
  /** Mode A only: where "Pay my share" lives once the NIM is back in the wallet. */
  payUrl?: string | null | undefined;
  t?: number | undefined;
  onAmountChange?: ((value: string) => void) | undefined;
  onStartLeaving?: (() => void) | undefined;
  onConfirmTick?: ((ticked: boolean) => void) | undefined;
  onRetire?: (() => void) | undefined;
  onWithdraw?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  back?: { label: string; href: string } | undefined;
  demoLabel?: string | undefined;
}

const CHIPS: Record<LeavingStepState['state'], string> = {
  locked: 'Not yet', available: 'Your turn', waiting: 'Waiting for the chain',
  pending: 'Sent', failed: 'Failed', done: 'Done',
};

function Step({ index, title, state, children }: {
  index: number; title: string; state: LeavingStepState; children?: ReactNode;
}) {
  return (
    <section className="step" data-state={state.state}>
      <h2 className="step-title">
        <span className="step-index" aria-hidden="true">{index}</span>
        {title}
        <span className="step-chip" data-state={state.state}>{CHIPS[state.state]}</span>
      </h2>
      <div className="step-body">{children}</div>
    </section>
  );
}

/**
 * Screen 7 (PRD §7.5). Three taps, each its own Nimiq Pay approval, in order, and never
 * automatic: the only thing that happens by itself on this screen is reading the chain.
 */
export function LeavingSteps(props: LeavingStepsProps) {
  const {
    squad, leaveBy, now, tzOffsetMinutes, stake, shareLuna, amountNim, steps, release, headBlock,
    affected, shortfallLuna, confirmTicked, readAt, retireFeeLuna, unstakeFeeLuna, busy = false,
    stalled = false, error, explorerBase = null, payUrl = null, t = 0, onAmountChange,
    onStartLeaving, onConfirmTick, onRetire, onWithdraw, onRefresh, back, demoLabel,
  } = props;
  // The one moving value on the screen. `t` is seconds since the screen appeared, so the
  // countdown ticks in the app and renders frame by frame in the video.
  const instant = now + Math.round(t * 1000);
  const explorer = (hash: string) => (explorerBase === null ? null : `${explorerBase}${hash}`);
  const tx = (state: LeavingStepState) =>
    state.state === 'pending' || state.state === 'failed'
      ? <TxStatus state={state.state === 'pending' ? 'pending' : 'failed'} hash={state.hash}
        stalled={stalled} explorerUrl={explorer(state.hash)} {...(onRefresh ? { onRefresh } : {})} />
      : null;

  return (
    <main className="sheet" aria-busy={busy}>
      <ScreenHeader back={back} demoLabel={demoLabel} />
      <div className="sheet-body">
        <p className="eyebrow">LEAVING · SQUAD {squad.shortId.toUpperCase()}</p>
        <h1>Get your NIM<br />ready in time.</h1>
        <p className="intro">
          Your share of {squad.name} is {formatLuna(shareLuna)}. Leaving a stake takes three
          separate approvals and a wait the chain decides. Nothing here starts by itself.
        </p>
        <div className="banner" role="note">
          <p className="banner-title">Start leaving by {formatMoment(leaveBy, tzOffsetMinutes)}</p>
          <p>
            {leaveBy > instant
              ? `${countdown(leaveBy - instant)} left.`
              : 'That deadline has passed — start now and it may still arrive in time.'}{' '}
            Goal day is {formatMoment(squad.goalAt, tzOffsetMinutes)}.
          </p>
        </div>
        <p className="member-status-age">
          {stake === null
            ? 'No stake found for your address'
            : `${formatLuna(stake.activeLuna)} active · ${formatLuna(stake.inactiveLuna)} unstaking · ${formatLuna(stake.retiredLuna)} ready to withdraw`}
          {' · '}{readAge(readAt, now)}
        </p>

        <Step index={1} title="Start leaving" state={steps.start}>
          {steps.start.state === 'available' && <>
            <label className="field">
              <span className="field-label">NIM to free up</span>
              <input className="field-input" type="text" inputMode="decimal" value={amountNim}
                placeholder="2000" disabled={busy}
                onChange={(event) => onAmountChange?.(event.target.value)} />
              <span className="field-hint">Your share is {formatLuna(shareLuna)}. Fee
                {' '}{formatLuna(unstakeFeeLuna)}.</span>
            </label>
            {shortfallLuna > 0 && (
              <div className="banner" role="note">
                <p className="banner-title">
                  This will show you short by {formatLuna(shortfallLuna)}
                </p>
                <p>
                  Your squads all read the same one active balance, so taking NIM out of it
                  changes what every squad sees.{affected.length > 0 && ' These would say so:'}
                </p>
                {affected.length > 0 && (
                  <ul className="affected-list">
                    {affected.map((squadRow) => (
                      <li key={squadRow.squadId}>
                        {squadRow.name} — {formatLuna(squadRow.committedLuna)} committed
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <button className="primary-button" onClick={onStartLeaving} disabled={busy}>
              {busy ? 'Waiting…' : 'Start leaving in Nimiq Pay'}
            </button>
          </>}
          {steps.start.state === 'locked' && (
            <p>You have no stake to leave. Commit and stake first.</p>
          )}
          {steps.start.state === 'done' && (
            <p>Your stake is on its way out. The chain decides when it is released.</p>
          )}
          {tx(steps.start)}
        </Step>

        <Step index={2} title="Confirm withdrawal" state={steps.retire}>
          {steps.retire.state === 'waiting' && <>
            <p>
              {release === null
                ? 'The release time is not known yet, so this stays switched off rather than guessing.'
                : `About ${countdown(Math.max(0, release.estimatedReleaseAt - instant))} to go.`}
            </p>
            {release !== null && (
              <p className="field-hint">
                Released at block {release.releaseBlock.toLocaleString('en-US')}
                {headBlock === null ? '' : `, chain is at ${headBlock.toLocaleString('en-US')}`}
                {' '}— about {formatMoment(release.estimatedReleaseAt, tzOffsetMinutes)}. The block
                number is the rule; the time is an estimate.
                {release.jailed && ' Your validator has been jailed, which pushes this later.'}
              </p>
            )}
          </>}
          {steps.retire.state === 'available' && <>
            <p>
              This is the irreversible one: retired stake no longer earns, and it can only go
              back to your wallet. Fee {formatLuna(retireFeeLuna)}.
            </p>
            <label className="confirm-tick">
              <input type="checkbox" checked={confirmTicked} disabled={busy}
                onChange={(event) => onConfirmTick?.(event.target.checked)} />
              <span>I understand this cannot be undone.</span>
            </label>
            <button className="primary-button" onClick={onRetire} disabled={busy || !confirmTicked}>
              {busy ? 'Waiting…' : 'Confirm withdrawal in Nimiq Pay'}
            </button>
          </>}
          {steps.retire.state === 'locked' && <p>Nothing is unstaking yet.</p>}
          {steps.retire.state === 'done' && <p>Confirmed. Your NIM is ready to withdraw.</p>}
          {tx(steps.retire)}
        </Step>

        <Step index={3} title="Withdraw" state={steps.withdraw}>
          {steps.withdraw.state === 'available' && <>
            <p>
              {formatLuna(stake?.retiredLuna ?? 0)} goes back to your wallet. It has to be the
              whole amount, and the fee comes out of it, so there is nothing to choose here.
            </p>
            <button className="primary-button" onClick={onWithdraw} disabled={busy}>
              {busy ? 'Waiting…' : 'Withdraw in Nimiq Pay'}
            </button>
          </>}
          {steps.withdraw.state === 'locked' && <p>Confirm the withdrawal first.</p>}
          {steps.withdraw.state === 'done' && <p>Your NIM is back in your own wallet.</p>}
          {tx(steps.withdraw)}
        </Step>

        {steps.pay !== null && (
          <Step index={4} title="Pay my share" state={steps.pay}>
            {steps.pay.state === 'available' && payUrl !== null
              ? <>
                <p>
                  {formatLuna(shareLuna)} to the recipient fixed when the squad was created. The
                  squad sees it once the chain confirms it.
                </p>
                <a className="primary-button" href={payUrl}>Pay my share</a>
              </>
              : steps.pay.state === 'done'
                ? <p>Your share is paid and verified on-chain.</p>
                : <p>Finish withdrawing first, then pay your share.</p>}
            {tx(steps.pay)}
          </Step>
        )}

        {error && (
          <div className="sheet-status" role="status" aria-live="polite">
            <p className="status-title">{error.message}</p>
            <p>{error.nextAction}</p>
          </div>
        )}
      </div>
      <footer className="sheet-footer">
        {/* Always offered: every figure above is a chain read, and an age is only meaningful
            next to a way to renew it. Reading is not sending. */}
        <button className="secondary-button" onClick={onRefresh}>Check the chain again</button>
        <p className="fine-print">
          Squad Stake cannot move your NIM. Each step waits for your approval in Nimiq Pay.
        </p>
      </footer>
    </main>
  );
}
