#!/usr/bin/env node
/** Moves what the capture recorded into the composition's assets/ under stable names. */
import { readFile, mkdir, copyFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO = resolve(HERE, '..');
const CAPTURE = resolve(VIDEO, 'capture');

const log = JSON.parse(await readFile(resolve(CAPTURE, 'capture-log.json'), 'utf8'));
await mkdir(resolve(VIDEO, 'assets/clips'), { recursive: true });
await mkdir(resolve(VIDEO, 'assets/stills'), { recursive: true });

const manifest = { builtAt: new Date().toISOString(), phone: log.phone, clips: {}, stills: {}, taps: {} };
for (const shot of log.shots) {
  if (!shot.ok) continue;
  if (shot.kind === 'clip') {
    const name = `${shot.id}.mp4`;
    await copyFile(resolve(CAPTURE, shot.id, 'clip.mp4'), resolve(VIDEO, 'assets/clips', name));
    manifest.clips[shot.id] = { src: `assets/clips/${name}`, seconds: shot.seconds };
    manifest.taps[shot.id] = shot.taps;
  } else {
    const files = (await readdir(resolve(CAPTURE, shot.id))).filter((file) => file.endsWith('.png')).sort();
    for (const [index, file] of files.entries()) {
      const name = index === 0 ? `${shot.id}.png` : `${shot.id}-${index}.png`;
      await copyFile(resolve(CAPTURE, shot.id, file), resolve(VIDEO, 'assets/stills', name));
      manifest.stills[index === 0 ? shot.id : `${shot.id}-${index}`] = `assets/stills/${name}`;
    }
  }
}
await writeFile(resolve(VIDEO, 'assets/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${Object.keys(manifest.clips).length} clips, ${Object.keys(manifest.stills).length} stills → apps/video/assets`);
