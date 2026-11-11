'use client';

import { useState } from 'react';
import {
  CreateSquadScreen, PrivacyNotice, strings,
  type CreateSquadValues, type Lang, type TemplateId,
} from '@squad-stake/ui';
import { LUNA_PER_NIM } from '../config/constants';
import { createSquadResponse } from '../core/squad-contract';
import { isAddress, normalizeAddress } from '../core/nimiq-address';
import { catalogError } from '../core/errors/catalog';
import { useLang } from '../i18n/client';
import { useSceneTime } from '../hooks/use-scene-time';
import { useShareLink } from '../hooks/use-share-link';

const EMPTY: CreateSquadValues = {
  name: '', mode: 'A', targetNim: '', recipient: '', personalTargetNim: '', goalDate: '',
};
/** NIM as typed → integer luna, or null when it is not a clean amount (AGENTS.md 10). */
function toLuna(nim: string): number | null {
  if (!/^\d{1,9}(\.\d{1,5})?$/.test(nim.trim())) return null;
  const luna = Math.round(Number(nim) * LUNA_PER_NIM);
  return Number.isSafeInteger(luna) && luna > 0 ? luna : null;
}

export function CreateSquadContainer({ minGoalDate, inviteBase, initialLang, templateDates }: {
  minGoalDate: string;
  inviteBase: string;
  initialLang: Lang;
  /** PRD §10: the suggested goal date per template, computed from the server's clock so the
   * first paint and the hydrated screen agree (`templateGoalDates`). */
  templateDates: Record<TemplateId, string>;
}) {
  const lang = useLang(initialLang);
  const t = useSceneTime();
  /** Every screen keeps a way out (no dead ends): the creator's own squads. */
  const home = { label: strings(lang).common.backSquads, href: '/squads' };
  const [accepted, setAccepted] = useState(false);
  const [values, setValues] = useState<CreateSquadValues>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; nextAction: string } | undefined>();
  const [created, setCreated] = useState<
    { shortId: string; inviteUrl: string; squadUrl: string } | undefined>();
  // The share step hands the link over instead of printing it (docs/AUDIT.md, M-1). Declared
  // before the early return below, because hooks cannot be called conditionally.
  const invite = useShareLink(created?.inviteUrl ?? null, values.name.trim());

  if (!accepted) return <PrivacyNotice onAccept={() => setAccepted(true)} back={home} lang={lang} />;

  async function submit() {
    if (busy) return;
    // Goal dates are read as UTC midnight so the server and the UI agree on the day.
    const goalAt = Date.parse(`${values.goalDate}T00:00:00Z`);
    const target = toLuna(values.targetNim);
    const personal = toLuna(values.personalTargetNim);
    // The same address is pasted with single spaces, with none at all, or in lower case
    // depending on where it was copied from; all three are the same address
    // (src/core/nimiq-address.ts). Normalising here means the wire contract sees the one form
    // it accepts, and a genuinely wrong address is named as such instead of coming back as
    // "that request was not valid".
    const recipient = normalizeAddress(values.recipient);
    const body = values.mode === 'A'
      ? { mode: 'A' as const, name: values.name.trim(), goalAt, targetLuna: target, recipient }
      : { mode: 'B' as const, name: values.name.trim(), goalAt, personalTargetLuna: personal };
    if (values.mode === 'A' && !isAddress(values.recipient)) {
      const words = strings(lang).create;
      setError({ message: words.recipientInvalid, nextAction: words.recipientInvalidNext });
      return;
    }
    if (!Number.isFinite(goalAt) || (values.mode === 'A' ? target === null : personal === null)) {
      setError(catalogError('INVALID_INPUT', lang));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch('/api/squads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = createSquadResponse.parse(await response.json());
      if (!result.ok) setError(catalogError(result.code, lang));
      else setCreated({ shortId: result.shortId, squadUrl: `/squads/${result.id}`,
        inviteUrl: `${inviteBase}/s/${result.inviteToken}` });
    } catch {
      setError(catalogError('NETWORK_ERROR', lang));
    } finally {
      setBusy(false);
    }
  }

  return <CreateSquadScreen values={values} minGoalDate={minGoalDate} busy={busy} t={t} back={home}
    lang={lang} templateDates={templateDates}
    {...(error ? { error } : {})} {...(created ? { created } : {})}
    onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
    onShare={() => void invite.share()}
    onCopyInvite={() => void invite.copy()}
    shared={invite.shared}
    copyFailed={invite.failed}
    onSubmit={() => void submit()} />;
}
