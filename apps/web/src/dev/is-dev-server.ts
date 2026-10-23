// Q16: Next replaces NODE_ENV at build time. A production artifact remains closed
// even if it is later started with NODE_ENV=development or DEV_HARNESS=1.
const developmentBuild = process.env.NODE_ENV === 'development';
export function isDevServer() {
  return developmentBuild && process.env.NODE_ENV === 'development'
    && process.env.DEV_HARNESS === '1' && process.env.VERCEL_ENV !== 'production';
}
export function devOptions(query: URLSearchParams) {
  if (!isDevServer()) return { identity: null, mockChain: false } as const;
  const identity = query.get('as');
  return {
    identity: identity === 'alice' || identity === 'bob' || identity === 'carol' ? identity : null,
    mockChain: query.get('chain') === 'mock',
  } as const;
}
