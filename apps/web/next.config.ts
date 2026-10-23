import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@squad-stake/ui'],
  serverExternalPackages: ['@nimiq/core', 'postgres'],
  poweredByHeader: false,
};
export default config;
