/**
 * @nimiq/identicons 1.6.2 ships no types. Only the one method this app uses is declared, so a
 * typo in any other call fails to compile rather than silently returning `any`.
 *
 * The package's own `browser` field points at the build that fetches an external SVG sprite;
 * this app imports it only on the server, where the CommonJS entry is the bundled build
 * (src/server/lib/identicon.ts explains why).
 */
declare module '@nimiq/identicons' {
  const Identicons: {
    /** Deterministic from `text`; returns raw SVG markup. */
    svg(text: string): Promise<string>;
  };
  export default Identicons;
}
