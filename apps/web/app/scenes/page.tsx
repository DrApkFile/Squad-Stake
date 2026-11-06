import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import {
  CreateSquadScreen, JoinCommitSheet, LeaveConfirm, MemberStatusScene, PrivacyNotice, SignInScreen,
} from '@squad-stake/ui';
import {
  createSquadScenes, DEMO_LABEL, joinCommitScenes, leaveScenes, memberStatusScenes, privacyScenes, signInScenes,
} from '@squad-stake/ui/scenes';
import { isDevServer } from '../../src/dev/is-dev-server';

export const dynamic = 'force-dynamic';

const SYNTHETIC = 'SYNTHETIC UI FIXTURE';
function Gallery<P>({ scenes, render }: {
  scenes: readonly { id: string; props: P }[]; render: (props: P) => ReactNode;
}) {
  return scenes.flatMap((scene) => (['light', 'dark'] as const).map((theme) =>
    <figure key={`${scene.id}-${theme}`}>
      <figcaption>{scene.id} · {theme}</figcaption>
      <div className="scene-frame" data-theme={theme}>{render(scene.props)}</div>
    </figure>));
}

export default function ScenesPage() {
  if (!isDevServer()) notFound();
  return <div className="scene-gallery">
    <h1>Fixture scenes · synthetic UI states · 390 × 844</h1>
    <Gallery scenes={signInScenes} render={(props) => <SignInScreen {...props} demoLabel={SYNTHETIC} />} />
    <Gallery scenes={memberStatusScenes} render={(props) =>
      <MemberStatusScene {...props} demoLabel="SYNTHETIC TESTNET UI FIXTURE · NOT MAINNET PROOF" />} />
    <Gallery scenes={privacyScenes} render={(props) => <PrivacyNotice {...props} demoLabel={SYNTHETIC} />} />
    <Gallery scenes={createSquadScenes} render={(props) => <CreateSquadScreen {...props} demoLabel={DEMO_LABEL} />} />
    <Gallery scenes={joinCommitScenes} render={(props) => <JoinCommitSheet {...props} demoLabel={DEMO_LABEL} />} />
    <Gallery scenes={leaveScenes} render={(props) => <LeaveConfirm {...props} demoLabel={DEMO_LABEL} />} />
  </div>;
}
