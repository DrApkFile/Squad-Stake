import { enCore } from './en-core';
import { enFeatures } from './en-features';
import { enScreens } from './en-screens';

/**
 * English, assembled. `Strings` is `typeof en`, so every other language is checked against
 * this object at compile time: a missing entry, a renamed one or a function with the wrong
 * arguments fails `pnpm typecheck` (packages/ui/i18n/types.ts explains why).
 */
export const en = { ...enCore, ...enScreens, ...enFeatures };
export type Strings = typeof en;
