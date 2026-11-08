'use client';

import type { ReactNode } from 'react';
import {
  CreateSquadScreen, JoinCommitSheet, LeaveConfirm, LeavingSteps, MemberStatusScene, MySquadsScreen,
  OrbitScene, PayShareSheet, PrivacyNotice, ProofScreen, SignInScreen, SquadScreen, TxStatusScene,
} from '@squad-stake/ui';
import {
  createSquadScenes, DEMO_LABEL, featureCommitScenes, featureCreateScenes, featureMySquadsScenes,
  featureSquadScenes, joinCommitScenes, leaveScenes, leavingScenes, memberStatusScenes,
  mySquadsScenes, orbitScenes, payShareScenes, privacyScenes, proofScenes, signInScenes,
  squadPageScenes, txStatusScenes,
} from '@squad-stake/ui/scenes';

const SYNTHETIC = 'SYNTHETIC UI FIXTURE';
const CHAIN = 'SYNTHETIC TESTNET UI FIXTURE · NOT MAINNET PROOF';

/**
 * A client component, because the fixtures include screens with form controls: React Server
 * Components may not emit a DOM event handler, and `packages/ui` is deliberately free of
 * 'use client' so the Remotion renderer can import the same files.
 */
function registry(): readonly { id: string; node: ReactNode }[] {
  const from = <P,>(
    scenes: readonly { id: string; props: P }[], render: (props: P) => ReactNode,
  ) => scenes.map((scene) => ({ id: scene.id, node: render(scene.props) }));
  return [
    ...from(signInScenes, (props) => <SignInScreen {...props} demoLabel={SYNTHETIC} />),
    ...from(memberStatusScenes, (props) => <MemberStatusScene {...props} demoLabel={CHAIN} />),
    ...from(orbitScenes, (props) => <OrbitScene {...props} demoLabel={DEMO_LABEL} />),
    ...from(mySquadsScenes, (props) => <MySquadsScreen {...props} demoLabel={DEMO_LABEL} />),
    ...from(squadPageScenes, (props) => <SquadScreen {...props} demoLabel={DEMO_LABEL} />),
    ...from(proofScenes, (props) => <ProofScreen {...props} demoLabel={DEMO_LABEL} />),
    ...from(privacyScenes, (props) => <PrivacyNotice {...props} demoLabel={SYNTHETIC} />),
    ...from(createSquadScenes, (props) => <CreateSquadScreen {...props} demoLabel={DEMO_LABEL} />),
    ...from(joinCommitScenes, (props) => <JoinCommitSheet {...props} demoLabel={DEMO_LABEL} />),
    ...from(leaveScenes, (props) => <LeaveConfirm {...props} demoLabel={DEMO_LABEL} />),
    ...from(leavingScenes, (props) => <LeavingSteps {...props} demoLabel={DEMO_LABEL} />),
    ...from(payShareScenes, (props) => <PayShareSheet {...props} demoLabel={DEMO_LABEL} />),
    ...from(txStatusScenes, (props) => <TxStatusScene {...props} demoLabel={SYNTHETIC} />),
    // PRD §7.7, §9.11, §9.12, §10 and every language at 375 px (scenes/features.ts).
    ...from(featureCommitScenes, (props) => <JoinCommitSheet {...props} demoLabel={DEMO_LABEL} />),
    ...from(featureSquadScenes, (props) => <SquadScreen {...props} demoLabel={DEMO_LABEL} />),
    ...from(featureMySquadsScenes, (props) => <MySquadsScreen {...props} demoLabel={DEMO_LABEL} />),
    ...from(featureCreateScenes, (props) => <CreateSquadScreen {...props} demoLabel={DEMO_LABEL} />),
  ];
}

/** One frame alone, which is what scripts/measure-scenes.mjs screenshots and measures. */
export function SceneFrame({ scene, theme, width }: {
  scene: string; theme: 'light' | 'dark'; width: '390' | '375';
}) {
  const found = registry().find((entry) => entry.id === scene);
  if (!found) return <p className="scene-missing">No scene with the id “{scene}”.</p>;
  return <div className="scene-single" data-theme={theme}>
    <div className="scene-frame" data-theme={theme} data-width={width}>{found.node}</div>
  </div>;
}

/** The whole gallery, every scene in both themes at the canonical 390 × 844. */
export function SceneGallery() {
  const scenes = registry();
  return <div className="scene-gallery">
    <h1>Fixture scenes · synthetic UI states · {scenes.length} scenes at 390 × 844</h1>
    {scenes.flatMap((scene) => (['light', 'dark'] as const).map((theme) =>
      <figure key={`${scene.id}-${theme}`}>
        <figcaption>{scene.id} · {theme}</figcaption>
        <div className="scene-frame" data-theme={theme}>{scene.node}</div>
      </figure>))}
  </div>;
}
