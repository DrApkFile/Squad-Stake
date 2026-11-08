import { notFound } from 'next/navigation';
import { SceneFrame, SceneGallery } from '../../src/dev/scene-gallery';
import { isDevServer } from '../../src/dev/is-dev-server';

export const dynamic = 'force-dynamic';

/**
 * The dev-only fixture gallery (AGENTS.md "Dev harness"). `?scene=<id>&theme=<light|dark>
 * &w=<390|375>` renders one frame alone, which is what scripts/measure-scenes.mjs drives.
 * `isDevServer()` gates the route, so a production artifact has no gallery at all (Q16).
 */
export default async function ScenesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isDevServer()) notFound();
  const search = await searchParams;
  const theme = search.theme === 'dark' ? 'dark' : 'light';
  const width = search.w === '375' ? '375' : '390';
  if (typeof search.scene === 'string') {
    return <SceneFrame scene={search.scene} theme={theme} width={width} />;
  }
  return <SceneGallery />;
}
