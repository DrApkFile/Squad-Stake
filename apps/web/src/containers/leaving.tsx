'use client';

import { useCallback, useEffect, useState } from 'react';
import { LeavingSteps, strings, type Lang, type LeavingStepsProps } from '@squad-stake/ui';
import { LUNA_PER_NIM, STAKING_FEES_LUNA } from '../config/constants';
import { catalogError } from '../core/errors/catalog';
import { planResponse, trackedTxResponse, type PlanWire, type TxKind } from '../core/squad-contract';
import { planLeaving, planRemove, planRetire, type LeavingStep } from '../core/staking-actions';
import { retryOffer } from '../core/retry';
import { useLang } from '../i18n/client';
import { useSceneTime } from '../hooks/use-scene-time';
import { useTxPoll } from '../hooks/use-tx-poll';
import { sendLeavingAction } from '../wallet/staking';

type Failure = { message: string; nextAction: string; retryable: boolean };
const toLuna = (nim: string) => /^\d{1,9}(\.\d{1,5})?$/.test(nim.trim())
  ? Math.round(Number(nim) * LUNA_PER_NIM) : null;
const nim = (luna: number) => String(luna / LUNA_PER_NIM);

/**
 * Screen 7 (PRD §7.5). Three taps, each one its own wallet approval, and before every one of
 * them the plan is read again from the chain — so the amount that goes to Nimiq Pay is the
 * balance the chain has *now*, not the one this page loaded with (Q12).
 */
export function LeavingContainer({ initial, now, explorerBase, initialLang, demoLabel }: {
  initial: PlanWire;
  /** From the server, so the first render matches the markup it hydrates. */
  now: number;
  explorerBase: string | null;
  initialLang: Lang;
  demoLabel?: string | undefined;
}) {
  const t = useSceneTime();
  const lang = useLang(initialLang);
  const poll = useTxPoll();
  const [plan, setPlan] = useState(initial);
  const [amountNim, setAmountNim] = useState(() => nim(initial.shareLuna));
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(
    initial.chainUnavailable ? catalogError('CHAIN_UNAVAILABLE', initialLang) : null,
  );
  // What "Try again" would repeat. Null means the last failure was a *read*, so trying again
  // is simply reading the chain again.
  const [lastKind, setLastKind] = useState<TxKind | null>(null);
  // The member's own zone, read once after mount. The server cannot know it, so the first
  // paint says UTC and then corrects itself; the label always names the zone it is showing,
  // so neither frame can be misread (packages/ui/format.ts).
  const [tzOffsetMinutes, setTz] = useState(0);
  useEffect(() => { setTz(-new Date().getTimezoneOffset()); }, []);

  const fail = (code: string) => setError(catalogError(code, lang));

  const loadPlan = useCallback(async (): Promise<PlanWire | null> => {
    const response = await fetch(`/api/plan/${plan.squadId}`, {
      headers: { accept: 'application/json' },
    });
    const parsed = planResponse.parse(await response.json());
    if (!parsed.ok) {
      fail(parsed.code);
      return null;
    }
    setPlan(parsed.plan);
    setError(parsed.plan.chainUnavailable ? catalogError('CHAIN_UNAVAILABLE', lang) : null);
    return parsed.plan;
  }, [lang, plan.squadId]);

  /** The pure planner decides every wallet argument from one fresh plan (never from state). */
  function decide(kind: TxKind, fresh: PlanWire): LeavingStep {
    if (kind === 'unstake') {
      return planLeaving({
        activeBalanceLuna: fresh.stake?.activeLuna ?? null,
        commitments: fresh.commitments,
        squadId: fresh.squadId,
        amountLuna: toLuna(amountNim) ?? 0,
        // From the plan just re-read, so a page left open while an earlier inactivation landed
        // cannot send a second one (`ALREADY_LEAVING`).
        inactiveBalanceLuna: fresh.stake?.inactiveLuna ?? 0,
        retiredBalanceLuna: fresh.stake?.retiredLuna ?? 0,
        unstakeOpen: fresh.steps.start.state === 'pending',
      });
    }
    if (kind === 'retire') {
      return planRetire({
        inactiveBalanceLuna: fresh.stake?.inactiveLuna ?? 0,
        headBlock: fresh.headBlock ?? 0,
        releaseBlock: fresh.release?.releaseBlock ?? null,
      });
    }
    return planRemove({ retiredBalanceLuna: fresh.stake?.retiredLuna ?? 0 });
  }

  const valueOf = (action: LeavingStep) => {
    switch (action.kind) {
      // What the wallet was asked for, recorded as the audit trail beside the hash. For an
      // inactivation that is the resulting active balance, which is the figure sent.
      case 'set-active-stake': return Math.max(1, action.newActiveBalanceLuna);
      case 'retire-stake': return action.retireStakeLuna;
      case 'remove-stake': return action.valueLuna;
      default: return 1;
    }
  };

  async function act(kind: TxKind) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setLastKind(kind);
    try {
      const fresh = await loadPlan();
      if (fresh === null) return;
      const action = decide(kind, fresh);
      if (action.kind === 'blocked') return fail(action.reason);
      const sent = await sendLeavingAction(action);
      if (!sent.ok) return fail(sent.code);
      const recorded = trackedTxResponse.parse(await (await fetch('/api/tx', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: sent.hash, squadId: fresh.squadId, kind,
          valueLuna: valueOf(action) }),
      })).json());
      if (!recorded.ok) return fail(recorded.code);
      // The shared bounded poll: five seconds × 24, then it stops. It reads the chain and
      // never the wallet, so nothing is ever resent (FAILURE_MODES).
      const verdict = await poll.follow(sent.hash, () => undefined);
      if (verdict?.state === 'INCLUDED_FAILED') fail('TX_FAILED');
      await loadPlan();
    } catch {
      fail('NETWORK_ERROR');
    } finally {
      setBusy(false);
      setTicked(false);
    }
  }

  /** What the chain says about the failed action's step *now*; the pure rule does the rest. */
  const stepStateOf = (kind: TxKind) => {
    if (kind === 'unstake') return plan.steps.start.state;
    if (kind === 'retire') return plan.steps.retire.state;
    if (kind === 'remove') return plan.steps.withdraw.state;
    return null;
  };
  const offer = retryOffer({
    retryable: error?.retryable === true,
    lastKind,
    lastStepState: lastKind === null ? null : stepStateOf(lastKind),
  });
  const retry = offer.kind === 'none' ? null : () => {
    // `act` re-reads the plan from the chain before it decides anything, so a transaction that
    // did land between the failure and this tap is seen first and the planner refuses it.
    if (offer.kind === 'resend') void act(offer.tx); else void loadPlan();
  };

  // What step one would do to this member's other squads, from the same pure function that
  // will build the transaction. Falls back to their share so the warning is visible before
  // anything is typed.
  const preview = planLeaving({
    activeBalanceLuna: plan.stake?.activeLuna ?? null,
    commitments: plan.commitments,
    squadId: plan.squadId,
    amountLuna: toLuna(amountNim) ?? plan.shareLuna,
    inactiveBalanceLuna: plan.stake?.inactiveLuna ?? 0,
    retiredBalanceLuna: plan.stake?.retiredLuna ?? 0,
    unstakeOpen: plan.steps.start.state === 'pending',
  });
  const props: LeavingStepsProps = {
    squad: plan.squad,
    leaveBy: plan.leaveBy,
    now,
    tzOffsetMinutes,
    stake: plan.stake,
    shareLuna: plan.shareLuna,
    amountNim,
    steps: plan.steps,
    release: plan.release,
    headBlock: plan.headBlock,
    affected: preview.kind === 'set-active-stake' ? preview.affected : [],
    shortfallLuna: preview.kind === 'set-active-stake' ? preview.shortfallLuna : 0,
    confirmTicked: ticked,
    readAt: plan.stake?.readAt ?? null,
    retireFeeLuna: STAKING_FEES_LUNA.retire,
    unstakeFeeLuna: STAKING_FEES_LUNA.unstake,
    busy,
    stalled: poll.stalled,
    t,
    explorerBase,
    payUrl: plan.squad.mode === 'A' ? `/squads/${plan.squadId}/pay` : null,
    onAmountChange: setAmountNim,
    onConfirmTick: setTicked,
    onStartLeaving: () => void act('unstake'),
    onRetire: () => void act('retire'),
    onWithdraw: () => void act('remove'),
    // Reading is not retrying: a plain refresh forgets which send failed, so the next failure
    // is judged on its own.
    onRefresh: () => { setLastKind(null); void loadPlan(); },
    ...(retry ? { onRetry: retry } : {}),
    lang,
    back: { label: strings(lang).common.backSquad, href: `/squads/${plan.squadId}` },
    demoLabel,
    ...(error ? { error } : {}),
  };
  return <LeavingSteps {...props} />;
}
