import { strings, type Lang } from './i18n';

/**
 * Quick-start templates for the create screen (PRD §10, Nov 9). A template is three
 * pre-filled fields and nothing more: the mode, a suggested name in the member's own language
 * and a suggested goal date. Everything stays editable, and a template never fills the
 * recipient — that address is the one field nobody should accept from a suggestion.
 *
 * The mode is the part that is a real decision: a trip, a gift and an event are paid to one
 * address on goal day (**A**), while a gadget and a rent buffer are each member's own money
 * staying with them (**B**).
 */
export const TEMPLATE_IDS = ['trip', 'gift', 'gadget', 'rent', 'event'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface SquadTemplate {
  mode: 'A' | 'B';
  /** Days after "now" for the suggested goal date. Never under the three days a squad needs
   * (apps/web/src/config/constants.ts GOAL_MIN_AHEAD_MS), with room for the leaving wait. */
  daysAhead: number;
}

export const SQUAD_TEMPLATES: Record<TemplateId, SquadTemplate> = {
  trip: { mode: 'A', daysAhead: 120 },
  gift: { mode: 'A', daysAhead: 30 },
  gadget: { mode: 'B', daysAhead: 60 },
  rent: { mode: 'B', daysAhead: 30 },
  event: { mode: 'A', daysAhead: 90 },
};

/** The chip's label and the name it fills in, from the one catalogue (packages/ui/i18n). */
export function templateText(id: TemplateId, lang: Lang) {
  const t = strings(lang).templates;
  if (id === 'trip') return { label: t.trip, name: t.tripName };
  if (id === 'gift') return { label: t.gift, name: t.giftName };
  if (id === 'gadget') return { label: t.gadget, name: t.gadgetName };
  if (id === 'rent') return { label: t.rent, name: t.rentName };
  return { label: t.event, name: t.eventName };
}

const pad = (value: number) => String(value).padStart(2, '0');

/** `YYYY-MM-DD` in UTC, the format a `<input type="date">` takes. Pure: `now` comes in. */
export function isoDay(milliseconds: number) {
  const date = new Date(milliseconds);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** The suggested goal date of each template, for one instant. */
export function templateGoalDates(now: number): Record<TemplateId, string> {
  const at = (days: number) => isoDay(now + days * 86_400_000);
  return {
    trip: at(SQUAD_TEMPLATES.trip.daysAhead),
    gift: at(SQUAD_TEMPLATES.gift.daysAhead),
    gadget: at(SQUAD_TEMPLATES.gadget.daysAhead),
    rent: at(SQUAD_TEMPLATES.rent.daysAhead),
    event: at(SQUAD_TEMPLATES.event.daysAhead),
  };
}
