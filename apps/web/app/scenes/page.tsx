import { notFound } from 'next/navigation';
import { SignInScreen } from '@squad-stake/ui';
import { signInScenes } from '@squad-stake/ui/scenes';
import { isDevServer } from '../../src/dev/is-dev-server';

export const dynamic = 'force-dynamic';
export default function ScenesPage() {
  if (!isDevServer()) notFound();
  return <div className="scene-gallery">
    <h1>Sign-in fixtures · synthetic UI states · 390 × 844</h1>
    {signInScenes.flatMap((scene) => (['light', 'dark'] as const).map((theme) =>
      <figure key={`${scene.id}-${theme}`}>
        <figcaption>{scene.id} · {theme}</figcaption>
        <div className="scene-frame" data-theme={theme}>
          <SignInScreen {...scene.props} demoLabel="SYNTHETIC UI FIXTURE" />
        </div>
      </figure>))}
  </div>;
}
