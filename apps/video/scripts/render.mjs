#!/usr/bin/env node
/**
 * The render stage, and the two deliverables that come out of it:
 *   out/squad-stake-demo.mp4            1920 x 1080, 30 fps, H.264 + AAC, 2:45, under 100 MB
 *   out/squad-stake-vertical-60s.mp4    1080 x 1920, the first minute, for X
 *   out/poster.jpg                      the one generated file that is in git
 *   out/stills/t+NNN.jpg                a frame every five seconds, for looking at
 *
 * Nothing here guesses: the duration and the size are measured off the file with ffprobe after
 * the fact and reported, and the 100 MB ceiling is enforced by re-encoding at a higher CRF
 * rather than by hoping.
 */
import { spawn } from 'node:child_process';
import { mkdir, stat, rm, link, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO = resolve(HERE, '..');
const OUT = resolve(VIDEO, 'out');
const HF = ['--yes', 'hyperframes@0.9.31'];

/** /tmp on this machine is a small RAM-backed tmpfs, and a 165 s render at 1920 x 1080 does not
 *  fit in it; a full /tmp has already blocked this repo's scene measurement twice
 *  (docs/PROGRESS.md, 2026-11-09). Keep the scratch on the real disk. */
const TMP = resolve(VIDEO, '.render-tmp');

const SIZE_LIMIT = 100 * 1024 * 1024;
const MAX_BYTES_SAFE = 96 * 1024 * 1024; // leave room so "under 100 MB" is not a rounding claim

function run(command, args, options = {}) {
  return new Promise((resolve_, reject) => {
    const child = spawn(command, args, {
      cwd: VIDEO,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      env: { ...process.env, TMPDIR: TMP, HYPERFRAMES_SKILL: 'hyperframes' },
    });
    let out = '';
    let err = '';
    child.stdout?.on('data', (chunk) => { out += chunk; });
    child.stderr?.on('data', (chunk) => { err += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve_({ out, err });
      else reject(new Error(`${command} ${args.slice(0, 3).join(' ')} exited ${code}\n${err.slice(-2000)}`));
    });
  });
}

async function probe(file) {
  const { out } = await run('ffprobe', ['-v', 'error', '-print_format', 'json',
    '-show_format', '-show_streams', file], { capture: true });
  const data = JSON.parse(out);
  const video = data.streams.find((stream) => stream.codec_type === 'video');
  const audio = data.streams.find((stream) => stream.codec_type === 'audio');
  const { size } = await stat(file);
  return {
    seconds: Number(data.format.duration),
    bytes: size,
    width: video?.width, height: video?.height,
    fps: video?.r_frame_rate,
    videoCodec: video?.codec_name,
    audioCodec: audio?.codec_name,
    audioRate: audio?.sample_rate,
  };
}

const clock = (seconds) => {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function main() {
  const narration = JSON.parse(await readFile(resolve(VIDEO, 'narration.json'), 'utf8'));
  await mkdir(OUT, { recursive: true });
  await mkdir(TMP, { recursive: true });

  const master = resolve(OUT, 'squad-stake-demo.mp4');
  await rm(master, { force: true });

  console.log(`\n== master: ${clock(narration.total)} at 1920 x 1080, 30 fps\n`);
  await run('npx', [...HF, 'render', '.',
    '--output', 'out/squad-stake-demo.mp4',
    '--format', 'mp4',
    '--resolution', 'landscape',
    '--fps', '30',
    // The app screens are a screen capture: PNG frame extraction keeps the type crisp instead
    // of putting a second generation of JPEG on text that was already encoded once.
    '--video-frame-format', 'png',
    '--crf', '20',
    '--keyframe-interval', '2',
  ]);

  let info = await probe(master);
  console.log(`\n   ${info.width} x ${info.height} · ${info.fps} · ${info.videoCodec}/` +
    `${info.audioCodec} · ${clock(info.seconds)} (${info.seconds.toFixed(2)}s) · ${mb(info.bytes)}`);

  // The ceiling is a requirement, not an aspiration: if the file is over it, re-encode the
  // rendered master rather than re-rendering, so the frames stay identical.
  if (info.bytes > MAX_BYTES_SAFE) {
    const target = Math.floor((MAX_BYTES_SAFE * 8) / info.seconds / 1000) - 160; // kbit/s, minus audio
    console.log(`\n   over ${mb(MAX_BYTES_SAFE)} — re-encoding at ~${target} kbit/s video`);
    const trimmed = resolve(OUT, 'squad-stake-demo.fit.mp4');
    await run('ffmpeg', ['-y', '-i', master,
      '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${target}k`,
      '-maxrate', `${Math.floor(target * 1.35)}k`, '-bufsize', `${target * 3}k`,
      '-pix_fmt', 'yuv420p', '-g', '60',
      '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', trimmed]);
    await rm(master, { force: true });
    await run('mv', [trimmed, master]);
    info = await probe(master);
    console.log(`   now ${clock(info.seconds)} · ${mb(info.bytes)}`);
  }

  // --- the vertical cut ----------------------------------------------------------------------
  // compositions/vertical.html plays the master itself, so the two cuts cannot disagree.
  const assetMaster = resolve(VIDEO, 'assets/master.mp4');
  await rm(assetMaster, { force: true });
  try { await link(master, assetMaster); } catch { await run('cp', [master, assetMaster]); }

  const vertical = resolve(OUT, 'squad-stake-vertical-60s.mp4');
  await rm(vertical, { force: true });
  console.log(`\n== vertical: the first 60s at 1080 x 1920\n`);
  await run('npx', [...HF, 'render', '.',
    '--composition', 'compositions/vertical.html',
    '--output', 'out/squad-stake-vertical-60s.mp4',
    '--format', 'mp4',
    '--resolution', 'portrait',
    '--fps', '30',
    '--video-frame-format', 'png',
    '--crf', '20',
  ]);
  const vinfo = await probe(vertical);
  console.log(`\n   ${vinfo.width} x ${vinfo.height} · ${vinfo.fps} · ${vinfo.videoCodec}/` +
    `${vinfo.audioCodec} · ${clock(vinfo.seconds)} · ${mb(vinfo.bytes)}`);

  // --- the poster, and a frame every five seconds -------------------------------------------
  // The poster is the end card: the one frame that names the app, so a thumbnail says what it
  // is. It is the only generated file in git (.gitignore).
  const posterAt = Math.max(0, info.seconds - 3);
  await run('ffmpeg', ['-y', '-ss', String(posterAt), '-i', master,
    '-frames:v', '1', '-q:v', '3', resolve(OUT, 'poster.jpg')]);

  const stills = resolve(OUT, 'stills');
  await rm(stills, { recursive: true, force: true });
  await mkdir(stills, { recursive: true });
  await run('ffmpeg', ['-y', '-i', master, '-vf', 'fps=1/5', '-q:v', '2',
    resolve(stills, 'frame-%03d.jpg')]);
  const shots = (await readdir(stills)).filter((name) => name.endsWith('.jpg'));

  console.log(`\n== done`);
  console.log(`   out/squad-stake-demo.mp4         ${clock(info.seconds)}  ${mb(info.bytes)}` +
    `  ${info.bytes <= SIZE_LIMIT ? 'under 100 MB' : 'OVER 100 MB'}`);
  console.log(`   out/squad-stake-vertical-60s.mp4 ${clock(vinfo.seconds)}  ${mb(vinfo.bytes)}`);
  console.log(`   out/poster.jpg                   frame at ${posterAt.toFixed(1)}s`);
  console.log(`   out/stills/                      ${shots.length} frames, one every 5s`);
  if (Math.abs(info.seconds - narration.total) > 0.2) {
    console.log(`\n   note: the file is ${info.seconds.toFixed(2)}s, the timeline asked for ` +
      `${narration.total}s`);
  }
}

await main();
