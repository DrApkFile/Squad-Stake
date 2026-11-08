'use client';

import { useState } from 'react';
import { CreateSquadScreen, type CreateSquadValues, PrivacyNotice } from '@squad-stake/ui';
import { LUNA_PER_NIM } from '../config/constants';
import { createSquadResponse } from '../core/squad-contract';
import { catalogError, errors } from '../core/errors/catalog';

const EMPTY: CreateSquadValues = {
  name: '', mode: 'A', targetNim: '', recipient: '', personalTargetNim: '', goalDate: '',
};
/** NIM as typed → integer luna, or null when it is not a clean amount (AGENTS.md 10). */
function toLuna(nim: string): number | null {
  if (!/^\d{1,9}(\.\d{1,5})?$/.test(nim.trim())) return null;
  const luna = Math.round(Number(nim) * LUNA_PER_NIM);
  return Number.isSafeInteger(luna) && luna > 0 ? luna : null;
}

/** Every screen keeps a way out (no dead ends): the creator's own squads. */
const HOME = { label: 'My squads', href: '/squads' };

export function CreateSquadContainer({ minGoalDate, inviteBase }: {
  minGoalDate: string; inviteBase: string;
}) {
  const [accepted, setAccepted] = useState(false);
  const [values, setValues] = useState<CreateSquadValues>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; nextAction: string } | undefined>();
  const [created, setCreated] = useState<
    { shortId: string; inviteUrl: string; squadUrl: string } | undefined>();

  if (!accepted) return <PrivacyNotice onAccept={() => setAccepted(true)} back={HOME} />;

  async function submit() {
    if (busy) return;
    // Goal dates are read as UTC midnight so the server and the UI agree on the day.
    const goalAt = Date.parse(`${values.goalDate}T00:00:00Z`);
    const target = toLuna(values.targetNim);
    const personal = toLuna(values.personalTargetNim);
    const body = values.mode === 'A'
      ? { mode: 'A' as const, name: values.name.trim(), goalAt, targetLuna: target,
        recipient: values.recipient.trim().toUpperCase() }
      : { mode: 'B' as const, name: values.name.trim(), goalAt, personalTargetLuna: personal };
    if (!Number.isFinite(goalAt) || (values.mode === 'A' ? target === null : personal === null)) {
      setError(errors.INVALID_INPUT);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch('/api/squads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = createSquadResponse.parse(await response.json());
      if (!result.ok) setError(catalogError(result.code));
      else setCreated({ shortId: result.shortId, squadUrl: `/squads/${result.id}`,
        inviteUrl: `${inviteBase}/s/${result.inviteToken}` });
    } catch {
      setError(errors.NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return <CreateSquadScreen values={values} minGoalDate={minGoalDate} busy={busy} back={HOME}
    {...(error ? { error } : {})} {...(created ? { created } : {})}
    onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
    onSubmit={() => void submit()} />;
}
