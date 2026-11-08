import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@squad-stake/ui'],
  serverExternalPackages: ['@nimiq/core', '@nimiq/identicons', 'postgres'],
  poweredByHeader: false,
  // pnpm workspace: the repository root, not apps/web, is the root of the file trace, so
  // Vercel's build packages the symlinked workspace packages (@squad-stake/ui) as well.
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
};
export default config;
