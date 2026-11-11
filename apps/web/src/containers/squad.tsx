'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LeaveConfirm,
  SquadScreen,
  shortAddress,
  strings,
  type FiatRate,
  type Lang,
  type MemberRowView,
  type SquadScreenProps,
} from '@squad-stake/ui';
import { catalogError } from '../core/errors/catalog';
import { squadDetailResponse } from '../core/squad-contract';
import { useFiat } from '../hooks/use-fiat';
import { useLang } from '../i18n/client';
import { useSceneTime } from '../hooks/use-scene-time';
import { useShareLink } from '../hooks/use-share-link';
import type { SquadView } from '../core/view-contract';

type CatalogError = { message: string; nextAction: string };

/**
 * Screen 5. The server renders the first view; this container re-reads it on demand and owns
 * the two actions the page offers (share and leave). It never calls the wallet.
 */
export function SquadContainer({
  initial, identicons, inviteBase, now, initialLang, fiat = null, demoLabel,
}: {
  initial: SquadView;
  /** address → identicon SVG, generated on the server (src/server/lib/identicon.ts). */
  identicons: Record<string, string | null>;
  inviteBase: string;
  /** From the server, so the first render matches the markup it hydrates. */
  now: number;
  initialLang: Lang;
  /** PRD §9.11: null when the price source failed, and then no estimate is shown. */
  fiat?: FiatRate | null | undefined;
  demoLabel?: string | undefined;
}) {
  const t = useSceneTime();

  /**
   * Which ⓘ sheet is open, and the scene time it opened at. The time is what drives the rise
   * (packages/ui/InfoSheet.tsx); keeping it here leaves the component pure, so the video can
   * render any frame of the transition by passing the same two numbers.
   */
  const [infoKey, setInfoKey] = useState<'leaveBy' | null>(null);
  const [infoOpenedT, setInfoOpenedT] = useState(0);
  const openInfo = useCallback((key: 'leaveBy') => {
    setInfoKey(key);
    setInfoOpenedT(t);
  }, [t]);
  const closeInfo = useCallback(() => setInfoKey(null), []);
  const lang = useLang(initialLang);
  // PRD §9.11: the estimate arrives after mount, because only Nimiq Pay knows the currency.
  const hostRate = useFiat();
  const rate = fiat ?? hostRate;
  const [view, setView] = useState(initial);
  const [error, setError] = useState<CatalogError | null>(
    initial.chainUnavailable ? catalogError('CHAIN_UNAVAILABLE', initialLang) : null,
  );
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
        setError(catalogError(parsed.code, lang));
        return;
      }
      setView(parsed.view);
      setError(parsed.view.chainUnavailable ? catalogError('CHAIN_UNAVAILABLE', lang) : null);
    } catch {
      setError(catalogError('NETWORK_ERROR', lang));
    } finally {
      setBusy(false);
    }
  }, [busy, lang, view.squadId]);

  const inviteUrl = view.inviteToken === null ? null : `${inviteBase}/s/${view.inviteToken}`;
  const proofUrl = `${inviteBase}/proof/${view.squad.shortId}`;
  // The same page, opened in the app: `from` is what the proof page's back chevron uses to
  // return here, and it validates the id before building that href.
  const proofHref = `/proof/${view.squad.shortId}?from=${view.squadId}`;

  // One link, handed over the way a phone does it; the hook explains why it is never
  // printed (src/hooks/use-share-link.ts).
  const invite = useShareLink(inviteUrl, view.squad.name);

  // The public link gets the same hook, so a refused clipboard write says so here too.
  const proof = useShareLink(proofUrl, view.squad.name);

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
        setLeaveError(catalogError(code, lang));
        return;
      }
      window.location.assign('/squads');
    } catch {
      setLeaveError(catalogError('NETWORK_ERROR', lang));
    } finally {
      setLeaving(false);
    }
  }, [lang, leaving, view.squadId]);

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
    // Already a code plus figures (view-contract `EarnedWire`); the component words it in
    // the member's language, and it is null for everyone but the viewer.
    earned: member.earned,
  }));

  if (confirmLeave) {
    return (
      <LeaveConfirm
        squad={{ name: view.squad.name }}
        committedLuna={view.members.find((member) => member.isYou)?.committedLuna ?? 0}
        busy={leaving}
        t={t}
        {...(leaveError ? { error: leaveError } : {})}
        onLeave={leave}
        onCancel={() => setConfirmLeave(false)}
        lang={lang}
        back={{ label: strings(lang).common.backSquad, href: `/squads/${view.squadId}` }}
        demoLabel={demoLabel}
      />
    );
  }

  const props: SquadScreenProps = {
    squad: view.squad,
    members,
    backedLuna: view.backedLuna,
    stages: view.stages,
    yourExit: view.yourExit,
    committedLuna: view.committedLuna,
    leaveBy: view.leaveBy,
    now,
    tzOffsetMinutes,
    readAt: view.readAt,
    inviteUrl,
    proofUrl,
    proofHref,
    commitUrl: inviteUrl ?? `/squads/${view.squadId}`,
    leavingUrl: `/squads/${view.squadId}/leaving`,
    payments: view.payments,
    state: view.state,
    payUrl: view.squad.mode === 'A' ? `/squads/${view.squadId}/pay` : null,
    shared: invite.shared,
    copyFailed: invite.failed,
    onShare: () => void invite.share(),
    onCopyInvite: () => void invite.copy(),
    onCopyProof: () => void proof.copy(),
    proofCopied: proof.shared,
    proofCopyFailed: proof.failed,
    // The words come from the catalogue here, not inside the sheet, so the sheet stays a
    // dumb surface and every language renders through the same component.
    info: infoKey === null ? null : {
      title: strings(lang).squad.leaveByInfoTitle,
      body: strings(lang).squad.leaveByInfoBody,
      openedT: infoOpenedT,
    },
    onOpenInfo: openInfo,
    onCloseInfo: closeInfo,
    onLeave: () => setConfirmLeave(true),
    onRefresh: refresh,
    refreshing: busy,
    t,
    lang,
    fiat: rate,
    back: { label: strings(lang).common.backSquads, href: '/squads' },
    demoLabel,
    ...(error ? { error } : {}),
  };
  return <SquadScreen {...props} />;
}
