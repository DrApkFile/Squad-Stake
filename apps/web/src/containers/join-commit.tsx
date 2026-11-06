'use client';

import { useState } from 'react';
import { JoinCommitSheet, type JoinCommitState } from '@squad-stake/ui';
import { LUNA_PER_NIM } from '../config/constants';
import { catalogError, errors } from '../core/errors/catalog';
import { commitResponse, joinSquadResponse, trackedTxResponse } from '../core/squad-contract';
import { planStakingAction } from '../core/staking-actions';
import { sendStakingAction } from '../wallet/staking';
import type { JoinView } from '../core/view-contract';

const POLL_INTERVAL_MS = 5_000;
const POLL_ATTEMPTS = 24;
const toLuna = (nim: string) => /^\d{1,9}(\.\d{1,5})?$/.test(nim.trim())
  ? Math.round(Number(nim) * LUNA_PER_NIM) : null;
const wait = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms); });

export function JoinCommitContainer({ view, token, now }: {
  view: JoinView; token: string; now: number;
}) {
  const [amountNim, setAmountNim] = useState('');
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
        setState({ status: 'needs-stake', shortfallLuna: result.shortfallLuna ?? 0,
          action: view.member?.activeBalanceLuna === null ? 'create' : 'add', feeLuna: 0 });
        return;
      }
      return fail(result.code);
    }
    setReadAt(result.readAt);
    setState({ status: 'committed', committedLuna: result.committedLuna, freeLuna: result.freeLuna });
  }

  /** Bounded polling: route handlers are short-lived, so the client asks (ARCHITECTURE). */
  async function awaitInclusion(hash: string, amountLuna: number) {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      const checked = trackedTxResponse.parse(await (await fetch(`/api/tx/${hash}`)).json());
      if (!checked.ok) return fail(checked.code);
      if (checked.state === 'INCLUDED_OK') return commit(amountLuna, hash);
      if (checked.state === 'INCLUDED_FAILED') return fail('TX_FAILED', true);
      setState({ status: 'pending', confirmations: checked.confirmations ?? 0,
        requiredConfirmations: checked.requiredConfirmations });
      await wait(POLL_INTERVAL_MS);
    }
    // Still unknown after the window: never reported as failed (PRD §8).
    fail('TX_OUTCOME_UNKNOWN', true);
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
    onCommit={() => void guarded(async () => {
      const amountLuna = toLuna(amountNim);
      if (amountLuna === null) return fail('INVALID_INPUT');
      await commit(amountLuna, null);
    })}
    onApprove={() => void guarded(approve)} />;
}
