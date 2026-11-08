import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LANGS, DEFAULT_LANG, parseLang, pickLang, strings } from '../../packages/ui/i18n';
import { en } from '../../packages/ui/i18n/en';
import { formatCount, formatLuna, formatPercent } from '../../packages/ui/format';
import { SQUAD_TEMPLATES, TEMPLATE_IDS, templateGoalDates, templateText }
  from '../../packages/ui/templates';
import { earnedReasonText } from '../../packages/ui/earned';
import { acceptLanguages } from '../../apps/web/src/i18n/accept-language';
import { catalogError, errors } from '../../apps/web/src/core/errors/catalog';

/** Walks the catalogue, so a key added to English in a nested section cannot be forgotten
 * in another language — and `strings()` is typed, so this also fails `pnpm typecheck`. */
function shape(value: unknown, path = ''): string[] {
  if (typeof value === 'function') return [`${path}:fn(${(value as () => void).length})`];
  if (typeof value === 'string') return [`${path}:string`];
  if (Array.isArray(value)) return value.flatMap((item, index) => shape(item, `${path}[${index}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => shape(item, `${path}.${key}`));
  }
  return [`${path}:${typeof value}`];
}

test('§10 every language carries every string, with the same arity, and none is left English', () => {
  const english = [...shape(en)].sort();
  assert.ok(english.length > 250, `${english.length} strings`);
  for (const lang of LANGS) {
    assert.deepEqual([...shape(strings(lang))].sort(), english, lang);
  }
  // A translation that is still the English sentence is a missing translation. Compared over
  // the longer strings only: "NIM", "Squad Stake" and a date pattern are the same everywhere.
  for (const lang of LANGS.filter((candidate) => candidate !== 'en')) {
    const translated = strings(lang);
    const long = (value: unknown) => typeof value === 'string' && value.length > 24;
    for (const [section, entries] of Object.entries(en)) {
      for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
        if (!long(value)) continue;
        const other = (translated[section as keyof typeof translated] as Record<string, unknown>)[key];
        assert.notEqual(other, value, `${lang}.${section}.${key} is still English`);
      }
    }
  }
});

test('§10 the language follows Nimiq Pay, then the browser, and falls back to English', () => {
  assert.equal(parseLang('de-AT'), 'de');
  assert.equal(parseLang('PT_BR'), 'pt');
  assert.equal(parseLang('es'), 'es');
  assert.equal(parseLang('nl'), null);
  assert.equal(parseLang(''), null);
  assert.equal(parseLang(undefined), null);
  // The host's choice wins; an unsupported one steps aside for the next candidate.
  assert.equal(pickLang(['fr-CA', 'de']), 'fr');
  assert.equal(pickLang(['nl', 'pl', 'pt-BR']), 'pt');
  assert.equal(pickLang([]), DEFAULT_LANG);
  assert.equal(pickLang(['nl']), DEFAULT_LANG);
  // Accept-Language, RFC 9110 §12.5.4: q-weights order the list, q=0 and * are dropped.
  assert.deepEqual(acceptLanguages('de;q=0.4, fr;q=0.9, en;q=0.1'), ['fr', 'de', 'en']);
  assert.deepEqual(acceptLanguages('es-ES,es;q=0.9,en;q=0.8'), ['es-ES', 'es', 'en']);
  assert.deepEqual(acceptLanguages('*'), []);
  assert.deepEqual(acceptLanguages('de;q=0'), []);
  assert.deepEqual(acceptLanguages(''), []);
  assert.deepEqual(acceptLanguages(null), []);
  assert.equal(pickLang(acceptLanguages('nl-NL,nl;q=0.9,de;q=0.5')), 'de');
});

test('§10 numbers, dates and percentages are formatted by the catalogue, not by Intl', () => {
  // One set of separators per language, so the app and the Remotion render agree glyph for
  // glyph whatever ICU data the machine has (AGENTS.md "UI purity" 3).
  assert.equal(formatLuna(1_234_567_800_000, 'en'), '12,345,678 NIM');
  assert.equal(formatLuna(1_234_567_800_000, 'de'), '12.345.678 NIM');
  assert.equal(formatLuna(1_234_567_800_000, 'es'), '12.345.678 NIM');
  assert.equal(formatLuna(1_234_567_800_000, 'pt'), '12.345.678 NIM');
  // French groups with a narrow no-break space, which is its own rule, not a space.
  assert.equal(formatLuna(1_234_567_800_000, 'fr'), '12 345 678 NIM');
  assert.equal(formatCount(12_345, 'de'), '12.345');
  assert.equal(formatPercent(0.05, 'en'), '5%');
  assert.equal(formatPercent(0.0333, 'en'), '3.33%');
  assert.equal(formatPercent(0.0333, 'de'), '3,33 %');
  assert.equal(formatPercent(0, 'en'), '0%');
});

test('§10 the error catalogue is one catalogue: every code in every language, flags apart', () => {
  const codes = Object.keys(errors);
  assert.ok(codes.length >= 40, `${codes.length} codes`);
  for (const lang of LANGS) {
    for (const code of codes) {
      const entry = catalogError(code, lang);
      assert.equal(entry.code, code);
      assert.ok(entry.message.length > 0 && entry.nextAction.length > 0, `${lang} ${code}`);
      // The flags are decisions, not words: they must not change with the language.
      assert.equal(entry.retryable, errors[code as keyof typeof errors].retryable, code);
      assert.equal(entry.changedAnything, errors[code as keyof typeof errors].changedAnything, code);
    }
    // An unknown code never throws on a screen; it degrades to the generic entry.
    assert.equal(catalogError('NOT_A_REAL_CODE', lang).code, 'UNAVAILABLE');
  }
  // And every "earned" reason the server can send has words in every language.
  for (const lang of LANGS) {
    for (const reason of ['NOT_STAKING', 'NO_POOL_DATA', 'PAYOUT_ADDRESS_UNKNOWN',
      'PAYS_NOTHING', 'OUTSIDE_STAKE', 'UNTRACKED_DEPOSIT', 'LEAVING', 'CHAIN_UNAVAILABLE'] as const) {
      assert.ok(earnedReasonText(reason, lang).length > 10, `${lang} ${reason}`);
    }
  }
});

test('§10 a template fills the mode, a name and a date — and never the recipient', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  const dates = templateGoalDates(now);
  assert.deepEqual(Object.keys(dates).sort(), [...TEMPLATE_IDS].sort());
  for (const id of TEMPLATE_IDS) {
    // Every suggested date is well clear of the three days a squad needs, with room for the
    // leaving wait (apps/web/src/config/constants.ts GOAL_MIN_AHEAD_MS).
    assert.ok(SQUAD_TEMPLATES[id].daysAhead >= 30, id);
    assert.match(dates[id], /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Date.parse(`${dates[id]}T00:00:00Z`) > now + 3 * 86_400_000, id);
    for (const lang of LANGS) {
      const text = templateText(id, lang);
      assert.ok(text.label.length > 0 && text.name.length > 0, `${lang} ${id}`);
    }
    // The mode is the real decision in a template: paid out to one address, or kept by each
    // member. Pinned so an edit cannot quietly turn a gift into a personal goal.
    assert.equal(SQUAD_TEMPLATES[id].mode, { trip: 'A', gift: 'A', gadget: 'B', rent: 'B', event: 'A' }[id]);
  }
  assert.equal(dates.trip, '2027-03-08');
  // There is no recipient anywhere in a template, by design.
  assert.equal(JSON.stringify(SQUAD_TEMPLATES).includes('recipient'), false);
});
