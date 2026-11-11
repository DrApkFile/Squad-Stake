'use client';

import { useEffect, useState } from 'react';
import { REDUCED_MOTION_T } from '@squad-stake/ui';

/** Steps per second. The slowest orbit turns once in 60 s, so fifteen steps a second is
 * smooth and costs a fraction of a frame-perfect loop on a phone. */
const STEPS_PER_SECOND = 15;

/**
 * The one place in the app that reads a clock for animation. Components take `t` — seconds
 * since the screen appeared — as a prop and derive their frame from it (AGENTS.md "UI purity"
 * 6), so the HyperFrames video can pass `frame / fps` to the very same components.
 *
 * With `prefers-reduced-motion` this returns a single frozen `t` at which every entrance has
 * finished and the typewriter is complete, and never schedules a frame.
 */
export function useSceneTime() {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setT(REDUCED_MOTION_T);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (nowMs: number) => {
      const stepped = Math.round(((nowMs - start) / 1000) * STEPS_PER_SECOND) / STEPS_PER_SECOND;
      // Identical state short-circuits the re-render, so this costs one render per step.
      setT((previous) => (previous === stepped ? previous : stepped));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return t;
}
