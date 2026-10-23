import { registerHooks } from 'node:module';

// Next enforces this boundary in builds; the Node test runner has no RSC resolver.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,export {}', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
