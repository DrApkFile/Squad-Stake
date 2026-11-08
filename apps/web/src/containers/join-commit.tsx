'use client';

import { useState } from 'react';
import { JoinCommitSheet, type JoinCommitState } from '@squad-stake/ui';
import { LUNA_PER_NIM, STAKING_FEES_LUNA } from '../config/constants';
import { catalogError, errors } from '../core/errors/catalog';
import { commitResponse, joinSquadResponse, trackedTxResponse } from '../core/squad-contract';
import { planStakingAction } from '../core/staking-actions';
import { useTxPoll } from '../hooks/use-tx-poll';
import { sendStakingAction } from '../wallet/staking';
import type { JoinView } from '../core/view-contract';

const toLuna = (nim: string) => /^\d{1,9}(\.\d{1,5})?$/.test(nim.trim())
  ? Math.round(Number(nim) * LUNA_PER_NIM) : null;
export function JoinCommitContainer({ view, token, now }: {
  view: JoinView; token: string; now: number;
}) {
  const [amountNim, setAmountNim] = useState('');
  const poll = useTxPoll();
  /** The transaction being followed, so the manual re-check knows what to ask about. */
  const [pendingTx, setPendingTx] = useState<{ hash: string; amountLuna: number } | null>(null);
  const [state, setState] = useState<JoinCommitState>(() => {
    if (view.member === null) return { status: 'failed', changedAnything: false,
      message: errors.CHAIN_UNAVAILABLE.message, nextAction: errors.CHAIN_UNAVAILABLE.nextAction };
    if (view.member.activeBalanceLuna === null) return { status: 'not-staking', minimumLuna: view.minimumLuna };
    return { status: 'ready',
      freeLuna: Math.max(0, view.member.activeBalanceLuna - view.member.otherCommitmentsLuna) };
  });
  const [readAt, setReadAt] = useState<number | null>(view.member?.readAt ?? null);

  const fail = (code: string, changedAnything = false) => {
    const entry = catalogError(code);
    setState({ status: 'failed', message: entry.message, nextAction: entry.nextAction,
      changedAnything: changedAnything || entry.changedAnything });
  };

  async function commit(amountLuna: number, txHash: string | null) {
    const joined = joinSquadResponse.parse(await (await fetch(`/api/squads/${view.squadId}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
    })).json());
    if (!joined.ok) return fail(joined.code);
    const response = await fetch(`/api/squads/${view.squadId}/commit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountLuna, txHash }),
    });
    const result = commitResponse.parse(await response.json());
    if (!result.ok) {
      if (result.code === 'OVER_COMMITTED' && result.freeLuna !== null) {
        const action = view.member?.activeBalanceLuna === null ? 'create' : 'add';
        setState({ status: 'needs-stake', shortfallLuna: result.shortfallLuna ?? 0,
          action, feeLuna: STAKING_FEES_LUNA[action] });
        return;
      }
      return fail(result.code);
    }
    setReadAt(result.readAt);
    setState({ status: 'committed', committedLuna: result.committedLuna, freeLuna: result.freeLuna });
  }

  /** The shared bounded poll (5 s × 24). It never calls the wallet, so nothing is resent;
   * after the window the sheet offers "Check status again" (PRD Q10, FAILURE_MODES). */
  async function awaitInclusion(hash: string, amountLuna: number) {
    setPendingTx({ hash, amountLuna });
    const verdict = await poll.follow(hash, (tracked) => {
      setState({ status: 'pending', confirmations: tracked.confirmations ?? 0,
        requiredConfirmations: tracked.requiredConfirmations });
    });
    if (verdict === null) return;              // Still unknown: the sheet says so, and waits.
    if (verdict.state === 'INCLUDED_FAILED') return fail('TX_FAILED', true);
    setPendingTx(null);
    await commit(amountLuna, hash);
  }

  async function approve() {
    const amountLuna = toLuna(amountNim);
    if (amountLuna === null) return fail('INVALID_INPUT');
    const action = planStakingAction({
      activeBalanceLuna: view.member?.activeBalanceLuna ?? null,
      otherCommitmentsLuna: view.member?.otherCommitmentsLuna ?? 0,
      amountLuna, delegation: view.delegation,
    });
    if (action.kind === 'none') return commit(amountLuna, null);
    if (action.kind === 'blocked') return fail('NOT_STAKING');
    setState({ status: 'waiting' });
    const sent = await sendStakingAction(action);
    if (!sent.ok) return fail(sent.code);
    const recorded = trackedTxResponse.parse(await (await fetch('/api/tx', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: sent.hash, squadId: view.squadId,
        kind: action.kind === 'create-staker' ? 'create' : 'add', valueLuna: action.valueLuna }),
    })).json());
    if (!recorded.ok) return fail(recorded.code, true);
    await awaitInclusion(sent.hash, amountLuna);
  }

  async function guarded(run: () => Promise<void>) {
    try { await run(); } catch { fail('NETWORK_ERROR'); }
  }

  return <JoinCommitSheet squad={view.squad} amountNim={amountNim} state={state} now={now} readAt={readAt}
    onAmountChange={setAmountNim}
    stalled={poll.stalled}
    {...(pendingTx ? { onRefresh: () => void guarded(() =>
      awaitInclusion(pendingTx.hash, pendingTx.amountLuna)) } : {})}
    back={{ label: 'Home', href: '/squads' }}
    onCommit={() => void guarded(async () => {
      const amountLuna = toLuna(amountNim);
      if (amountLuna === null) return fail('INVALID_INPUT');
      await commit(amountLuna, null);
    })}
    onApprove={() => void guarded(approve)} />;
}
