import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import { uiPurity } from './scripts/ui-purity.mjs';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', 'spikes/**', '**/next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Next checks the config file itself for plugin registration during builds.
    plugins: { '@next/next': nextPlugin },
    settings: { next: { rootDir: `${import.meta.dirname}/apps/web/` } },
  },
  {
    files: ['apps/web/**/*.{js,jsx,mjs,ts,tsx}'],
    rules: nextPlugin.configs.recommended.rules,
  },
  {
    languageOptions: { globals: {
      process: 'readonly', Buffer: 'readonly', console: 'readonly', URL: 'readonly',
      URLSearchParams: 'readonly', Request: 'readonly', Response: 'readonly', Headers: 'readonly',
      TextEncoder: 'readonly', AbortSignal: 'readonly', fetch: 'readonly', window: 'readonly', setTimeout: 'readonly',
    } },
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['packages/ui/**/*.{js,jsx,mjs,ts,tsx}'],
    plugins: { squad: { rules: { 'ui-purity': uiPurity } } },
    rules: { 'squad/ui-purity': 'error' },
  },
);
