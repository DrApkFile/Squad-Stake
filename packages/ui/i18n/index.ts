import { en, type Strings } from './en';
import { es } from './es';
import { de } from './de';
import { fr } from './fr';
import { pt } from './pt';
import { DEFAULT_LANG, type Lang } from './types';

export { DEFAULT_LANG, LANGS, isLang, parseLang, pickLang } from './types';
export type { Lang } from './types';
export type { Strings } from './en';

// Static imports, not a dynamic one: `packages/ui` may not import at runtime (Q17 purity
// lint), and five small tables cost less than the machinery to defer them.
const CATALOGUES: Record<Lang, Strings> = { en, es, de, fr, pt };

/** The catalogue for one language. Unknown values never reach here: `parseLang` returns null
 * and the caller falls back to English (types.ts). */
export function strings(lang: Lang = DEFAULT_LANG): Strings {
  return CATALOGUES[lang];
}
