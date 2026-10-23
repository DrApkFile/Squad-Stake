const globals = new Set([
  'fetch', 'window', 'globalThis', 'self', 'document', 'navigator',
  'XMLHttpRequest', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage',
  'setTimeout', 'setInterval', 'requestAnimationFrame', 'performance', 'crypto',
]);
const hooks = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useId']);
export const uiPurity = {
  meta: { type: 'problem', schema: [], messages: { impure: 'Pure UI only: pass data, callbacks, now and progress as props (AGENTS.md / PRD Q17).' } },
  create(context) {
    const report = (node) => context.report({ node, messageId: 'impure' });
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (source !== 'react' && !source.startsWith('.')) report(node);
        if (source.startsWith('.') && /(?:apps|wallet|server)/.test(source)) report(node);
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier' && hooks.has(specifier.imported.name)) report(specifier);
        }
      },
      ImportExpression: report,
      ExportNamedDeclaration(node) {
        if (node.source && !node.source.value.startsWith('.')) report(node);
      },
      ExportAllDeclaration(node) {
        if (!node.source.value.startsWith('.')) report(node);
      },
      Identifier(node) {
        if (node.name !== 'Date' && node.name !== 'Math') return;
        const parent = node.parent;
        if (parent.type === 'MemberExpression' && parent.object === node &&
          (!parent.computed || parent.property.type === 'Literal')) return;
        if (parent.type === 'NewExpression' && parent.callee === node && parent.arguments.length > 0) return;
        // Reject aliases and implicit clocks, e.g. const clock = Date; new Date().
        if (context.sourceCode.getScope(node).through.some((ref) => ref.identifier === node)) report(node);
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') report(node);
      },
      MemberExpression(node) {
        const object = node.object;
        const property = node.computed ? node.property.value : node.property.name;
        if (object.type === 'Identifier' && ((object.name === 'Date' && property === 'now')
          || (object.name === 'Math' && property === 'random') || hooks.has(property))) report(node);
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'ObjectPattern' || node.init?.type !== 'Identifier') return;
        for (const prop of node.id.properties) {
          if (prop.type !== 'Property') continue;
          const key = prop.key.name ?? prop.key.value;
          if ((node.init.name === 'Date' && key === 'now') || (node.init.name === 'Math' && key === 'random')
            || hooks.has(key)) report(prop);
        }
      },
      'Program:exit'() {
        for (const name of globals) {
          // Scope references also catch aliasing: const request = fetch; request(...).
          for (const reference of context.sourceCode.getScope(context.sourceCode.ast).through) {
            if (reference.identifier.name === name) report(reference.identifier);
          }
        }
      },
    };
  },
};
