#!/usr/bin/env node
/**
 * Builds the two audio tracks the composition plays.
 *
 *  - `assets/audio/narration.mp3` — every spoken sentence laid at its exact start from
 *    narration.json, on one 2:45 track. The captions are timed against this same table, so a
 *    caption and the word it shows cannot drift apart.
 *  - `assets/audio/music.mp3` — the operator's track, looped to length, faded in and out, and
 *    **ducked 18 dB under the narration**, as asked. The duck is not a compressor guessing
 *    from level: narration.json says exactly when the voice speaks, so the envelope is drawn
 *    from that, with a 0.25 s fall before each block and a 0.5 s recovery after it.
 *
 * Keeping the duck baked into the music rather than mixed into one stereo master leaves both
 * tracks separately editable in the HyperFrames desktop app.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO = resolve(HERE, '..');
const OUT = resolve(VIDEO, 'assets/audio');
const MUSIC_SOURCE = resolve(VIDEO, 'assets/music/source.mp3');

/** −18 dB, the level the operator asked the music to sit at under the voice. */
const DUCK_DB = -18;
const DUCK_GAIN = 10 ** (DUCK_DB / 20);
const FALL = 0.25;
const RECOVER = 0.5;
/** The bed's own level under a voice (`/hyperframes` sound.md puts this around 0.14). */
const MUSIC_GAIN = 0.34;
const FADE_IN = 1.6;
const FADE_OUT = 3.2;

const ff = (args) => new Promise((done, fail) => {
  const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  child.stderr.on('data', (chunk) => { err += String(chunk); });
  child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg ${code}: ${err.slice(-700)}`))));
});

/** Sentences that touch become one block, so the music does not bob between them. */
function speakingBlocks(lines, join = 0.9) {
  const blocks = [];
  for (const line of [...lines].sort((a, b) => a.start - b.start)) {
    const last = blocks.at(-1);
    if (last && line.start - last.end <= join) last.end = Math.max(last.end, line.start + line.seconds);
    else blocks.push({ start: line.start, end: line.start + line.seconds });
  }
  return blocks;
}

/** A trapezoid per block, combined with max(): 0 when nothing is spoken, 1 at full duck. */
function duckExpression(blocks) {
  const trapezoid = ({ start, end }) =>
    `clip(min((t-${(start - FALL).toFixed(3)})/${FALL},(${(end + RECOVER).toFixed(3)}-t)/${RECOVER}),0,1)`;
  return blocks.map(trapezoid).reduce((left, right) => `max(${left},${right})`);
}

async function main() {
  const narration = JSON.parse(await readFile(resolve(VIDEO, 'narration.json'), 'utf8'));
  await mkdir(OUT, { recursive: true });
  const total = narration.total;

  // --- the voice ---------------------------------------------------------------------------
  const inputs = narration.lines.flatMap((line) => ['-i', resolve(VIDEO, line.file)]);
  const delays = narration.lines.map((line, index) => {
    const ms = Math.round(line.start * 1000);
    // Bounded padding: a bare `apad` is infinite, and an infinite input into
    // `amix=duration=longest` has no end for atrim to find.
    return `[${index}:a]aresample=48000,adelay=${ms}|${ms},apad=whole_dur=${total}[v${index}]`;
  });
  const mix = `${narration.lines.map((_, index) => `[v${index}]`).join('')}` +
    `amix=inputs=${narration.lines.length}:normalize=0:duration=longest[voice]`;
  await ff([...inputs, '-filter_complex',
    `${delays.join(';')};${mix};[voice]atrim=0:${total},asetpts=N/SR/TB,` +
    'alimiter=limit=0.89:level=disabled,aresample=48000[out]',
    '-map', '[out]', '-c:a', 'libmp3lame', '-q:a', '2', `${OUT}/narration.mp3`]);

  // --- the bed -----------------------------------------------------------------------------
  const blocks = speakingBlocks(narration.lines);
  const duck = duckExpression(blocks);
  await ff(['-stream_loop', '-1', '-i', MUSIC_SOURCE, '-filter_complex',
    [`[0:a]atrim=0:${total},asetpts=N/SR/TB`,
      `volume=${MUSIC_GAIN}`,
      // The duck itself. eval=frame so the expression is sampled along the track.
      `volume='1-(1-${DUCK_GAIN.toFixed(4)})*(${duck})':eval=frame`,
      `afade=t=in:st=0:d=${FADE_IN}`,
      `afade=t=out:st=${(total - FADE_OUT).toFixed(2)}:d=${FADE_OUT}`,
      'aresample=48000',
    ].join(','), '-c:a', 'libmp3lame', '-q:a', '3', `${OUT}/music.mp3`]);

  // --- a reference mix, only so the levels can be measured ---------------------------------
  await ff(['-i', `${OUT}/narration.mp3`, '-i', `${OUT}/music.mp3`, '-filter_complex',
    '[0:a][1:a]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.89:level=disabled[m]',
    '-map', '[m]', '-c:a', 'libmp3lame', '-q:a', '2', `${OUT}/reference-mix.mp3`]);

  await writeFile(`${OUT}/mix.json`, `${JSON.stringify({
    builtAt: new Date().toISOString(), total, duckDb: DUCK_DB, musicGain: MUSIC_GAIN,
    fallSeconds: FALL, recoverSeconds: RECOVER, fadeIn: FADE_IN, fadeOut: FADE_OUT,
    speakingBlocks: blocks.map((block) => ({ start: round(block.start), end: round(block.end) })),
  }, null, 2)}\n`);
  console.log(`narration.mp3, music.mp3 (ducked ${DUCK_DB} dB under ${blocks.length} speaking blocks) ` +
    `and reference-mix.mp3 → apps/video/assets/audio`);
}

const round = (value) => Math.round(value * 1000) / 1000;
await main();
