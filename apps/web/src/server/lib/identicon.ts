import 'server-only';

/**
 * Nimiq identicons for a member list, generated on the server.
 *
 * Why here and not in the component: every generating method in @nimiq/identicons returns a
 * promise, and `packages/ui` components are pure and synchronous (AGENTS.md "UI purity" 1). Why
 * not in the browser: the package's `browser` entry loads an external SVG sprite over the
 * network, which this app does not do. The CommonJS entry is the bundled build, so the sprite is
 * compiled in and nothing is fetched.
 *
 * The SVG is derived from the address with no randomness, so the same address always produces
 * the same markup — which is what lets the Remotion video and the app render identical glyphs.
 * Each identicon's internal clip-path id is derived from the same hash; two of them can collide
 * on one page, which is harmless because the clip shape is the same hexagon in every identicon.
 */
const cache = new Map<string, string | null>();

interface IdenticonModule { default: { svg(text: string): Promise<string> } }

async function load() {
  // Imported lazily so a request that renders no identicon never pays for the module, and so
  // the dependency stays out of any client bundle.
  const loaded = (await import('@nimiq/identicons')) as unknown as IdenticonModule;
  return loaded.default;
}

/** One identicon, or null if the library could not produce one: a neutral seat beats a wrong
 * face, and it never blocks the page. */
export async function identiconSvg(address: string): Promise<string | null> {
  const known = cache.get(address);
  if (known !== undefined) return known;
  try {
    const identicons = await load();
    const svg = (await identicons.svg(address)).replace(/\s+/g, ' ').trim();
    cache.set(address, svg);
    return svg;
  } catch {
    cache.set(address, null);
    return null;
  }
}

/** Identicons for a roster, as an address → SVG map the container can look up by address. */
export async function identiconsFor(
  addresses: readonly string[],
): Promise<Record<string, string | null>> {
  const unique = [...new Set(addresses)];
  const svgs = await Promise.all(unique.map((address) => identiconSvg(address)));
  return Object.fromEntries(unique.map((address, index) => [address, svgs[index] ?? null]));
}
