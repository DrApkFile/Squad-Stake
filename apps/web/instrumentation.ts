export async function register() {
  // FAILURE_MODES: fail at server startup, while keeping clean builds independent
  // of deployment credentials. No connection is opened by environment validation.
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build') {
    const { serverEnv } = await import('./src/server/lib/env');
    serverEnv();
  }
}
