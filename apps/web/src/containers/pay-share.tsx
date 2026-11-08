'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PayShareSheet, strings, type Lang, type PayShareSheetProps, type PayShareState,
} from '@squad-stake/ui';
import { catalogError } from '../core/errors/catalog';
import {
  payResponse, planResponse, trackedTxResponse, type PlanWire,
} from '../core/squad-contract';
import { planPayment } from '../core/staking-actions';
import { useLang } from '../i18n/client';
import { useTxPoll } from '../hooks/use-tx-poll';
import { sendPayment } from '../wallet/staking';

/**
 * Screen 8 (PRD §7.6). The sheet sends the payment and then asks the server to judge it: the
 * client learns whether it settled, it never asserts it. The recipient, the share and the
 * `sq:<short_id>` marker all come from the plan the server built.
 */
export function PayShareContainer({ initial, now, explorerBase, initialLang, demoLabel }: {
  initial: PlanWire;
  now: number;
  explorerBase: string | null;
  initialLang: Lang;
  demoLabel?: string | undefined;
}) {
  const poll = useTxPoll();
  const lang = useLang(initialLang);
  const [plan, setPlan] = useState(initial);
  const [state, setState] = useState<PayShareState>(() => firstState(initial, initialLang));
  const [tzOffsetMinutes, setTz] = useState(0);
  useEffect(() => { setTz(-new Date().getTimezoneOffset()); }, []);

  const fail = (code: string, hash: string | null = null) => {
    const entry = catalogError(code, lang);
    setState(hash === null
      ? { status: 'failed', message: entry.message, nextAction: entry.nextAction,
        changedAnything: entry.changedAnything }
      : { status: 'refused', hash, message: entry.message, nextAction: entry.nextAction });
  };

  const loadPlan = useCallback(async (): Promise<PlanWire | null> => {
    const parsed = planResponse.parse(await (await fetch(`/api/plan/${plan.squadId}`, {
      headers: { accept: 'application/json' },
    })).json());
    if (!parsed.ok) {
      fail(parsed.code);
      return null;
    }
    setPlan(parsed.plan);
    return parsed.plan;
  }, [plan.squadId]);

  /** Asks the server to verify the payment against the chain and, if it was the last one
   * outstanding, to complete the squad. The verdict is the server's (Q15). */
  async function settle(hash: string) {
    setState({ status: 'checking', hash });
    const parsed = payResponse.parse(await (await fetch(`/api/squads/${plan.squadId}/pay`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash }),
    })).json());
    if (!parsed.ok) return fail(parsed.code, hash);
    setState({ status: 'paid', hash, squadCompleted: parsed.completed });
    await loadPlan();
  }

  async function pay() {
    const fresh = await loadPlan();
    if (fresh === null) return;
    const action = planPayment({ recipient: fresh.squad.recipient, shareLuna: fresh.shareLuna,
      shortId: fresh.squad.shortId });
    if (action.kind === 'blocked') return fail(action.reason);
    setState({ status: 'waiting' });
    const sent = await sendPayment(action);
    if (!sent.ok) return fail(sent.code);
    const recorded = trackedTxResponse.parse(await (await fetch('/api/tx', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: sent.hash, squadId: fresh.squadId, kind: 'pay',
        valueLuna: action.valueLuna }),
    })).json());
    if (!recorded.ok) return fail(recorded.code, sent.hash);
    await follow(sent.hash);
  }

  /** Waits for execution and finality, then asks the server for the §7.6 verdict. */
  async function follow(hash: string) {
    const verdict = await poll.follow(hash, (tracked) => {
      setState({ status: 'pending', hash, confirmations: tracked.confirmations ?? 0,
        requiredConfirmations: tracked.requiredConfirmations });
    });
    if (verdict === null) return;                 // Still unknown: nothing resent, sheet waits.
    if (verdict.state === 'INCLUDED_FAILED') return fail('TX_FAILED', hash);
    await settle(hash);
  }

  async function guarded(run: () => Promise<void>) {
    try { await run(); } catch { fail('NETWORK_ERROR'); }
  }

  const pending = state.status === 'pending' || state.status === 'checking' ? state.hash : null;
  const props: PayShareSheetProps = {
    squad: { name: plan.squad.name, shortId: plan.squad.shortId, goalAt: plan.squad.goalAt },
    // The page only renders this container for a Mode A squad, which always has a recipient.
    recipient: plan.squad.recipient ?? '',
    shareLuna: plan.shareLuna,
    roster: plan.roster ?? { paid: 0, owing: 0 },
    state,
    now,
    tzOffsetMinutes,
    readAt: plan.stake?.readAt ?? null,
    canPay: plan.steps.pay?.state === 'available' || plan.steps.pay?.state === 'failed',
    stalled: poll.stalled,
    explorerBase,
    lang,
    onPay: () => void guarded(pay),
    ...(pending === null
      ? {}
      : { onRefresh: () => void guarded(() => follow(pending)) }),
    back: { label: strings(lang).common.backSquad, href: `/squads/${plan.squadId}` },
    demoLabel,
  };
  return <PayShareSheet {...props} />;
}

/** What the sheet opens on: a payment already verified, one still waiting, or nothing yet. */
function firstState(plan: PlanWire, lang: Lang): PayShareState {
  const step = plan.steps.pay;
  if (step?.state === 'done' && step.hash !== null) {
    return { status: 'paid', hash: step.hash, squadCompleted: plan.roster !== null
      && plan.roster.owing > 0 && plan.roster.paid === plan.roster.owing };
  }
  if (step?.state === 'failed' && plan.payment !== null) {
    const entry = catalogError(plan.payment.code ?? 'PAYMENT_NOT_VERIFIED', lang);
    return { status: 'refused', hash: plan.payment.hash, message: entry.message,
      nextAction: entry.nextAction };
  }
  if (step?.state === 'pending') {
    return { status: 'checking', hash: step.hash };
  }
  return { status: 'ready' };
}
