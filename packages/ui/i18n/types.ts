/**
 * The five languages the app speaks (PRD §10, Nov 9). English is the fallback in every
 * direction: an unknown tag, a host that reports nothing, a browser that sends no
 * Accept-Language.
 *
 * Catalogue shape: every language is one object of the same type, and an entry that takes
 * values is a **function** rather than a template with placeholders. That gives TypeScript the
 * job a runtime key check would otherwise do — a missing entry, a renamed one or a wrong
 * argument list fails `pnpm typecheck`, not a screen in Spanish — and it lets each language
 * write its own plural and word-order rules in its own file (`members(2)` is "2 miembros",
 * "2 Mitglieder", and German may reorder the sentence around it).
 */
export const LANGS = ['en', 'es', 'de', 'fr', 'pt'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/**
 * An ISO 639-1 tag, with or without a region, as Nimiq Pay's `getHostLanguage()` and the
 * browser both report them (`pt`, `pt-BR`, `de-CH`). The region is dropped: Squad Stake has
 * one catalogue per language, and `pt-BR` reading European wording is better than English.
 */
export function parseLang(tag: string | null | undefined): Lang | null {
  if (typeof tag !== 'string') return null;
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : null;
}

/** The first candidate that names a language we have, else English. Order is the caller's
 * preference order: Nimiq Pay's own setting first, then the browser's list (AGENTS.md "Host"). */
export function pickLang(candidates: readonly (string | null | undefined)[]): Lang {
  for (const candidate of candidates) {
    const lang = parseLang(candidate);
    if (lang !== null) return lang;
  }
  return DEFAULT_LANG;
}
