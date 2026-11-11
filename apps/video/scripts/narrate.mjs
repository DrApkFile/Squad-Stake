#!/usr/bin/env node
/**
 * Speaks the script with Kokoro-82M on this machine (Apache-2.0, via `hyperframes tts`) and
 * lays the result out on a 2:45 timeline.
 *
 * One WAV per **sentence**, not per section, for two reasons: Kokoro keeps natural prosody
 * inside a sentence, and a sentence's measured duration is what makes the captions accurate
 * without a transcriber (whisper-cpp and parakeet are both absent here). Caption groups are
 * cut inside a sentence by character count, which drifts by well under a frame over a line of
 * this length.
 *
 * Silence is cut from the head and tail of every sentence and replaced with a fixed breath, so
 * the delivery has no dead air — the operator asked for a breath, never a pause.
 *
 * Usage: node apps/video/scripts/narrate.mjs [--speed 0.95]
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SECTIONS, TOTAL_SECONDS } from './script.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO = resolve(HERE, '..');
const VO = resolve(VIDEO, 'assets/vo');
const WORK = resolve(VIDEO, '.narration');
const PYTHON = process.env.HYPERFRAMES_PYTHON ?? resolve(VIDEO, '.venv/bin/python');
const VOICE = process.env.VOICE ?? 'af_heart';
const SPEED = Number(process.env.VOICE_SPEED ?? arg('--speed') ?? 0.88);

/** A breath between sentences inside one section, and a beat between sections — both solved
 *  for below, because the film is a fixed 2:45 and the voice is however long it is. The
 *  operator asked for no pauses, "JUST A TINY LITTLE BREATHE", and said even 3 s is too long
 *  while 2 is fine, so the breath cannot exceed ~0.7 s and the beat cannot exceed 1.8 s. */
const BREATH_MIN = 0.2;
const BREATH_MAX = 0.7;
const GAP_MIN = 0.35;
const GAP_MAX = 1.8;
/** A section beat is a breath plus this: the same silence, read as a new paragraph. */
const GAP_LEAD = 1;
/** A cold open — music and the first picture before the first word — and an end card that
 *  holds long enough for a judge to read the URL off it. Neither is a pause in the delivery:
 *  the operator's "no long pauses" is about the silence between spoken lines, above.
 *  The slack is spent on breath first and the card last, so the film never ends on dead air. */
const LEAD_IN = 2;
const END_HOLD_AIM = 6;
const END_HOLD_MIN = 4;
const END_HOLD_MAX = 9;

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function run(command, args, env = {}) {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env } });
    let out = ''; let err = '';
    child.stdout.on('data', (chunk) => { out += String(chunk); });
    child.stderr.on('data', (chunk) => { err += String(chunk); });
    child.on('exit', (code) => (code === 0 ? done(out)
      : fail(new Error(`${command} exited ${code}: ${err.slice(-600) || out.slice(-600)}`))));
  });
}

const ffprobeSeconds = async (file) => Number((await run('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])).trim());

/** Kokoro leaves a little silence at both ends of a clip. Cutting it is what removes the dead
 *  air between sentences; the breath that replaces it is added back deliberately, in the mix. */
async function trimSilence(from, to) {
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', from,
    '-af', ['silenceremove=start_periods=1:start_silence=0.03:start_threshold=-50dB:detection=peak',
      'areverse',
      'silenceremove=start_periods=1:start_silence=0.03:start_threshold=-50dB:detection=peak',
      'areverse'].join(','),
    '-ar', '24000', '-ac', '1', to]);
}

/** 3–5 words a group, broken at punctuation first, which is where the voice breaks too. */
function captionGroups(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const groups = [];
  let current = [];
  for (const word of words) {
    current.push(word);
    const breaks = /[.,;:—?!]$/.test(word);
    if ((breaks && current.length >= 2) || current.length >= 5) {
      groups.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) {
    // Never leave a single trailing word on its own line.
    if (current.length === 1 && groups.length > 0) groups[groups.length - 1] += ` ${current[0]}`;
    else groups.push(current.join(' '));
  }
  return groups;
}

async function main() {
  // `--relayout` re-solves the timing from the WAVs already in assets/vo without asking
  // Kokoro for a single word again: the layout is arithmetic over their measured lengths, and
  // re-speaking 33 sentences to move a breath by a tenth of a second is forty minutes wasted.
  // It fails rather than falls back if a file is missing, so a relayout can never quietly
  // describe a sentence that was never spoken.
  const relayout = process.argv.includes('--relayout');
  await mkdir(VO, { recursive: true });
  if (!relayout) {
    await rm(WORK, { recursive: true, force: true });
    await mkdir(WORK, { recursive: true });
  }

  // --- speak every sentence ---------------------------------------------------------------
  const spoken = [];
  for (const section of SECTIONS) {
    for (const [index, line] of section.lines.entries()) {
      const id = `${section.id}-${index}`;
      const say = line.say ?? line.text;
      let file = `${VO}/${id}.wav`;
      if (relayout) {
        if (!existsSync(file)) {
          throw new Error(`--relayout: ${file} does not exist; run without the flag first`);
        }
      } else {
        const raw = `${WORK}/${id}.raw.wav`;
        file = `${WORK}/${id}.wav`;
        await run('npx', ['hyperframes', 'tts', say, '-o', raw, '-v', VOICE, '-s', String(SPEED), '--json'],
          { HYPERFRAMES_PYTHON: PYTHON });
        await trimSilence(raw, file);
      }
      const seconds = await ffprobeSeconds(file);
      spoken.push({ section: section.id, index, id, file, seconds, ...line });
      process.stdout.write(`  ${id.padEnd(12)} ${seconds.toFixed(2)}s  ${say.slice(0, 54)}\n`);
    }
  }

  // --- solve the layout -------------------------------------------------------------------
  // Three unknowns — the breath between sentences, the beat between sections, and the end
  // card's hold — and one equation: they have to fill 2:45 around however long the voice took.
  // Spend the slack on breathing first and on the card last, both inside their own ceilings,
  // so a film that comes in short never ends on fourteen seconds of a static card.
  const sections = SECTIONS.map((section) => ({
    ...section, lines: spoken.filter((line) => line.section === section.id),
  }));
  const spokenSeconds = spoken.reduce((sum, line) => sum + line.seconds, 0);
  const breathCount = spoken.length - sections.length;   // gaps inside sections
  const gapCount = sections.length - 1;                   // gaps between sections
  const slack = TOTAL_SECONDS - LEAD_IN - spokenSeconds;

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  let breath = clamp(
    (slack - END_HOLD_AIM - gapCount * GAP_LEAD) / (breathCount + gapCount),
    BREATH_MIN, BREATH_MAX);
  let gap = clamp(breath + GAP_LEAD, GAP_MIN, GAP_MAX);
  const left = () => slack - breath * breathCount - gap * gapCount;

  // Too much left over for the card: open the silences toward their ceilings, proportionally,
  // so nothing jumps to its limit while the rest stays tight.
  if (left() > END_HOLD_MAX) {
    const room = (BREATH_MAX - breath) * breathCount + (GAP_MAX - gap) * gapCount;
    const share = room > 0 ? clamp((left() - END_HOLD_MAX) / room, 0, 1) : 0;
    breath += (BREATH_MAX - breath) * share;
    gap += (GAP_MAX - gap) * share;
  }
  // Too little: close them toward their floors the same way.
  if (left() < END_HOLD_MIN) {
    const room = (breath - BREATH_MIN) * breathCount + (gap - GAP_MIN) * gapCount;
    const share = room > 0 ? clamp((END_HOLD_MIN - left()) / room, 0, 1) : 0;
    breath -= (breath - BREATH_MIN) * share;
    gap -= (gap - GAP_MIN) * share;
  }
  const endHold = left();

  const bySection = sections.map((section) => {
    const speech = section.lines.reduce((sum, line) => sum + line.seconds, 0);
    return { ...section, speech, duration: speech + breath * (section.lines.length - 1) };
  });
  const speechTotal = bySection.reduce((sum, section) => sum + section.duration, 0);

  const timeline = [];
  const captions = [];
  let cursor = LEAD_IN;
  for (const [index, section] of bySection.entries()) {
    const start = cursor;
    let at = cursor;
    for (const line of section.lines) {
      const groups = captionGroups(line.text);
      const chars = groups.reduce((sum, group) => sum + group.length, 0);
      let within = at;
      for (const group of groups) {
        const span = (group.length / chars) * line.seconds;
        captions.push({ text: group, start: round(within), end: round(within + span), section: section.id });
        within += span;
      }
      timeline.push({ id: line.id, section: section.id, start: round(at), seconds: round(line.seconds),
        file: `assets/vo/${line.id}.wav`, text: line.text });
      at += line.seconds + breath;
    }
    cursor = start + section.duration + (index < gapCount ? gap : 0);
    section.start = round(start);
    section.end = round(start + section.duration);
  }

  for (const line of spoken) {
    if (line.file !== `${VO}/${line.id}.wav`) await run('cp', [line.file, `${VO}/${line.id}.wav`]);
  }
  const narration = {
    builtAt: new Date().toISOString(), voice: VOICE, speed: SPEED, model: 'Kokoro-82M (local)',
    total: TOTAL_SECONDS, leadIn: LEAD_IN, breath: round(breath), gap: round(gap),
    endHold: round(endHold),
    speechTotal: round(speechTotal), lastWordAt: round(cursor),
    sections: bySection.map(({ id, kind, start, end, duration }) =>
      ({ id, kind, start, end: round(end), duration: round(duration) })),
    lines: timeline, captions,
  };
  await writeFile(resolve(VIDEO, 'narration.json'), `${JSON.stringify(narration, null, 2)}\n`);
  if (!relayout) await rm(WORK, { recursive: true, force: true });
  console.log(`\nvoice ${spokenSeconds.toFixed(2)}s · breath ${breath.toFixed(2)}s × ${breathCount} · ` +
    `section beat ${gap.toFixed(2)}s × ${gapCount} · end card ${endHold.toFixed(2)}s`);
  console.log(`speech block ${speechTotal.toFixed(2)}s · last word at ${cursor.toFixed(2)}s ` +
    `of ${TOTAL_SECONDS}s`);
  console.log(`${captions.length} caption groups · ${timeline.length} voice clips → apps/video/narration.json`);
  if (gap >= GAP_MAX - 0.01 && endHold > END_HOLD_MAX) {
    console.log(`note: every silence is at its ceiling and the end card still holds ` +
      `${endHold.toFixed(1)}s — slow the voice (--speed ${(SPEED - 0.06).toFixed(2)}).`);
  }
}

const round = (value) => Math.round(value * 1000) / 1000;
await main();
