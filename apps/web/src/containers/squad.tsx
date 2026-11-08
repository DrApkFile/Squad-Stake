'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LeaveConfirm,
  SquadScreen,
  shortAddress,
  type MemberRowView,
  type SquadScreenProps,
} from '@squad-stake/ui';
import { catalogError } from '../core/errors/catalog';
import { squadDetailResponse } from '../core/squad-contract';
import { useSceneTime } from '../hooks/use-scene-time';
import type { SquadView } from '../core/view-contract';

type CatalogError = { message: string; nextAction: string };

/**
 * Screen 5. The server renders the first view; this container re-reads it on demand and owns
 * the two actions the page offers (share and leave). It never calls the wallet.
 */
export function SquadContainer({ initial, identicons, inviteBase, now, demoLabel }: {
  initial: SquadView;
  /** address → identicon SVG, generated on the server (src/server/lib/identicon.ts). */
  identicons: Record<string, string | null>;
  inviteBase: string;
  /** From the server, so the first render matches the markup it hydrates. */
  now: number;
  demoLabel?: string | undefined;
}) {
  const t = useSceneTime();
  const [view, setView] = useState(initial);
  const [error, setError] = useState<CatalogError | null>(
    initial.chainUnavailable ? catalogError('CHAIN_UNAVAILABLE') : null,
  );
  const [shared, setShared] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<CatalogError | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  // The leave-by deadline is a moment, so it is shown in the member's own zone. The server
  // cannot know it: the first paint says UTC and then corrects itself, and the label always
  // names the zone (packages/ui/format.ts).
  const [tzOffsetMinutes, setTz] = useState(0);
  useEffect(() => { setTz(-new Date().getTimezoneOffset()); }, []);

  const refresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/squads/${view.squadId}`, {
        headers: { accept: 'application/json' },
      });
      const parsed = squadDetailResponse.parse(await response.json());
      if (!parsed.ok) {
        setError(catalogError(parsed.code));
        return;
      }
      setView(parsed.view);
      setError(parsed.view.chainUnavailable ? catalogError('CHAIN_UNAVAILABLE') : null);
    } catch {
      setError(catalogError('NETWORK_ERROR'));
    } finally {
      setBusy(false);
    }
  }, [busy, view.squadId]);

  const inviteUrl = view.inviteToken === null ? null : `${inviteBase}/s/${view.inviteToken}`;
  const proofUrl = `${inviteBase}/proof/${view.squad.shortId}`;

  const share = useCallback(async () => {
    if (inviteUrl === null) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setShared(true);
    } catch {
      // No clipboard permission: the link is on screen in full, so there is nothing to recover.
      setShared(false);
    }
  }, [inviteUrl]);

  const leave = useCallback(async () => {
    if (leaving) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      const response = await fetch(`/api/squads/${view.squadId}/leave`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const body: unknown = await response.json();
      const ok = typeof body === 'object' && body !== null && 'ok' in body && body.ok === true;
      if (!ok) {
        const code = typeof body === 'object' && body !== null && 'code' in body
          ? String(body.code) : 'UNAVAILABLE';
        setLeaveError(catalogError(code));
        return;
      }
      window.location.assign('/squads');
    } catch {
      setLeaveError(catalogError('NETWORK_ERROR'));
    } finally {
      setLeaving(false);
    }
  }, [leaving, view.squadId]);

  const members: readonly MemberRowView[] = view.members.map((member) => ({
    id: member.address,
    shortAddress: shortAddress(member.address),
    fullAddress: member.address,
    identiconSvg: identicons[member.address] ?? null,
    committedLuna: member.committedLuna,
    status: member.status,
    readAt: member.readAt,
    isYou: member.isYou,
    pending: member.pending,
  }));

  if (confirmLeave) {
    return (
      <LeaveConfirm
        squad={{ name: view.squad.name }}
        committedLuna={view.members.find((member) => member.isYou)?.committedLuna ?? 0}
        busy={leaving}
        {...(leaveError ? { error: leaveError } : {})}
        onLeave={leave}
        onCancel={() => setConfirmLeave(false)}
        back={{ label: 'Squad', href: `/squads/${view.squadId}` }}
        demoLabel={demoLabel}
      />
    );
  }

  const props: SquadScreenProps = {
    squad: view.squad,
    members,
    backedLuna: view.backedLuna,
    committedLuna: view.committedLuna,
    leaveBy: view.leaveBy,
    now,
    tzOffsetMinutes,
    readAt: view.readAt,
    inviteUrl,
    proofUrl,
    commitUrl: inviteUrl ?? `/squads/${view.squadId}`,
    leavingUrl: `/squads/${view.squadId}/leaving`,
    payments: view.payments,
    state: view.state,
    payUrl: view.squad.mode === 'A' ? `/squads/${view.squadId}/pay` : null,
    shared,
    onShare: share,
    onLeave: () => setConfirmLeave(true),
    onRefresh: refresh,
    t,
    back: { label: 'Squads', href: '/squads' },
    demoLabel,
    ...(error ? { error } : {}),
  };
  return <SquadScreen {...props} />;
}
