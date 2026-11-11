#!/usr/bin/env node
/**
 * Records the real Squad Stake app as screen footage for the demo video.
 *
 * Two kinds of shot, both of the same running app:
 *  - a **flow**: a real URL, real taps, real typing, real navigation, against the local
 *    database and live testnet reads. This is a genuine screen recording (CDP screencast).
 *  - a **scene**: one dev `/scenes` fixture frame. Those frames are static by design — the
 *    fixtures pass a fixed `t` — so they are captured as one crisp 3× still and the motion
 *    around them is authored in HyperFrames.
 *
 * Why screencast and not a 30 fps screenshot loop: measured on this machine,
 * `Page.captureScreenshot` at 3× costs 3.4 s a frame and at 2× 1.4 s, while the screencast
 * delivers ~15 fps. A 30 fps still loop is not available at any quality here, so the footage
 * is a real 15 fps capture resampled to 30, and the stills carry the resolution for zoom-ins.
 *
 * Every tap is logged with its position in the phone's own 390 × 844 CSS space and its time
 * from the clip's first frame, so the video draws its finger indicator where the finger was.
 *
 * Usage: pnpm dev (DEV_HARNESS=1) on CAPTURE_URL, then
 *   node apps/video/scripts/capture-app.mjs [--only id,id] [--list]
 */
import { mkdir, writeFile, rm, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { launch, teardown } from './cdp.mjs';
import { SHOTS } from './shots.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO = resolve(HERE, '..');
const OUT = resolve(VIDEO, 'capture');
const BASE = (process.env.CAPTURE_URL ?? 'http://localhost:3210').replace(/\/$/, '');
const PHONE = { width: 390, height: 844 };
/** The screencast is capped at 2× the phone. 1.9× supersampling of the phone as the video
 *  draws it (about 416 × 900 inside 1920 × 1080), which is crisp without costing frame rate. */
const CAST = { maxWidth: PHONE.width * 2, maxHeight: PHONE.height * 2, quality: 88 };
const STILL_SCALE = 3;
const ONLY = (process.argv.includes('--only')
  ? (process.argv[process.argv.indexOf('--only') + 1] ?? '') : '')
  .split(',').map((id) => id.trim()).filter(Boolean);

/** Injected before every document: the dev harness' own eyebrow labels are debug text, and
 *  the video carries one designed "sample data" label of its own instead (AGENTS.md "Never
 *  fabricate" is satisfied by labelling the data, not by keeping this particular string). */
const DEV_CHROME_CSS = [
  // The dev harness' own eyebrow label is debug text ("DEV IDENTITY: alice — never fund this
  // wallet"). The video carries one designed "sample data" label of its own instead, so the
  // data is still labelled (AGENTS.md "Never fabricate") without a debug string on screen.
  '.demo-label{display:none !important}',
  // Next's dev-mode indicator badge, which is not part of the app.
  'nextjs-portal{display:none !important}',
  '#__next-build-watcher{display:none !important}',
  '*{scrollbar-width:none !important}',
  '::-webkit-scrollbar{display:none !important}',
].join('');
const INJECT_CSS = `(() => {
  const id = 'video-capture-style';
  if (document.getElementById(id)) return true;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = ${JSON.stringify(DEV_CHROME_CSS)};
  const host = document.head || document.documentElement;
  if (!host) return false;
  host.appendChild(style);
  return true;
})()`;
/** Runs at document start too, guarded, because a client-side route change keeps the node but
 *  a full navigation does not. Both paths are belt and braces: the injection is repeated after
 *  every load, which is what actually guarantees it. */
const HIDE_DEV_CHROME = `
  (function apply() {
    try {
      if (!document.documentElement) { setTimeout(apply, 4); return; }
      ${INJECT_CSS};
    } catch (error) { setTimeout(apply, 8); }
  })();
`;

const FIND = (text, tag) => `(() => {
  const want = ${JSON.stringify(text)};
  const nodes = [...document.querySelectorAll(${JSON.stringify(tag ?? 'button, a, label, summary, [role="button"]')})];
  const hit = nodes.find((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;
    return (node.textContent ?? '').replace(/\\s+/g, ' ').trim().includes(want);
  });
  if (!hit) return { found: false, saw: nodes.slice(0, 40).map((n) => (n.textContent ?? '').replace(/\\s+/g,' ').trim().slice(0, 48)) };
  hit.scrollIntoView({ block: 'center', behavior: 'instant' });
  const rect = hit.getBoundingClientRect();
  return { found: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2,
    w: rect.width, h: rect.height, tag: hit.tagName.toLowerCase() };
})()`;

const FIELD = (label) => `(() => {
  const want = ${JSON.stringify(label)};
  const field = [...document.querySelectorAll('label')]
    .filter((node) => (node.textContent ?? '').includes(want))
    .map((node) => node.querySelector('input, textarea') ??
      (node.htmlFor ? document.getElementById(node.htmlFor) : null))
    .find(Boolean);
  if (!field) return { found: false, saw: [...document.querySelectorAll('label')].map((n) => (n.textContent ?? '').trim().slice(0, 40)) };
  field.scrollIntoView({ block: 'center', behavior: 'instant' });
  field.focus();
  const rect = field.getBoundingClientRect();
  return { found: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
})()`;

const SCROLLER = `(() => {
  const inFrame = document.querySelector('.scene-frame');
  const root = inFrame ?? document.body;
  const pool = [root, ...root.querySelectorAll('*')];
  const found = pool.find((node) => node.scrollHeight > node.clientHeight + 8)
    ?? (document.scrollingElement && document.scrollingElement.scrollHeight > window.innerHeight + 8
      ? document.scrollingElement : null);
  return found ? { ok: true, max: found.scrollHeight - found.clientHeight } : { ok: false, max: 0 };
})()`;
const SCROLL_TO = (top, smooth) => `(() => {
  const inFrame = document.querySelector('.scene-frame');
  const root = inFrame ?? document.body;
  const pool = [root, ...root.querySelectorAll('*')];
  const node = pool.find((n) => n.scrollHeight > n.clientHeight + 8)
    ?? document.scrollingElement ?? root;
  node.scrollTo({ top: ${top}, behavior: ${smooth ? "'smooth'" : "'instant'"} });
  return node.scrollTop;
})()`;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function run() {
  await mkdir(OUT, { recursive: true });
  const profile = `${process.env.TMPDIR ?? '/tmp'}/squad-capture-${process.pid}`;
  let browser = null;
  // The log is merged, not replaced: a run that re-captures three shots must not erase the
  // record (and the tap positions) of the twenty it did not touch.
  const previous = existsSync(`${OUT}/capture-log.json`)
    ? JSON.parse(await readFile(`${OUT}/capture-log.json`, 'utf8')) : { shots: [] };
  const log = { capturedAt: new Date().toISOString(), base: BASE, phone: PHONE, shots: [] };
  try {
    browser = await launch({ profile });
    const { client, sessionId } = browser;
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: HIDE_DEV_CHROME }, sessionId);
    const shots = ONLY.length > 0 ? SHOTS.filter((shot) => ONLY.includes(shot.id)) : SHOTS;
    if (shots.length === 0) throw new Error(`No shots matched --only ${ONLY.join(',')}`);
    console.log(`${shots.length} shots → ${OUT}`);
    // Shots share a context: the create flow really does create a squad, so the shots after it
    // read its id and invite token out of the page rather than from a seeded guess.
    const ctx = existsSync(`${OUT}/context.json`)
      ? JSON.parse(await readFile(`${OUT}/context.json`, 'utf8')) : {};
    for (const shot of shots) {
      const record = await captureShot(client, sessionId, shot, ctx);
      log.shots.push(record);
      console.log(`  ${record.ok ? '✓' : '✗'} ${shot.id}  ${record.note}`);
      if (record.exported) {
        Object.assign(ctx, record.exported);
        await writeFile(`${OUT}/context.json`, `${JSON.stringify(ctx, null, 2)}\n`);
        console.log(`      context: ${JSON.stringify(record.exported).slice(0, 160)}`);
      }
    }
    log.context = ctx;
    const touched = new Set(log.shots.map((shot) => shot.id));
    const order = SHOTS.map((shot) => shot.id);
    const merged = [...(previous.shots ?? []).filter((shot) => !touched.has(shot.id)), ...log.shots]
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    await writeFile(`${OUT}/capture-log.json`,
      `${JSON.stringify({ ...log, shots: merged }, null, 2)}\n`);
    const bad = log.shots.filter((shot) => !shot.ok);
    if (bad.length > 0) {
      console.error(`\n${bad.length} shot(s) failed:`);
      for (const shot of bad) console.error(`  ${shot.id}: ${shot.note}`);
      process.exitCode = 1;
    }
  } finally {
    await teardown({ child: browser?.child, profile });
  }
}

async function captureShot(client, sessionId, shot, ctx = {}) {
  const dir = `${OUT}/${shot.id}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const taps = [];
  const theme = shot.theme ?? 'light';
  let exported = null;
  try {
    if (shot.freshSession || shot.session) {
      await client.send('Network.clearBrowserCookies', {}, sessionId);
    }
    if (shot.session) {
      // A dev identity's session is established before the recording starts, so the clip
      // opens on the screen the narration is about rather than on a sign-in it already
      // showed. The route is dev-only and refuses in any production artifact (Q16).
      const loadedForSession = client.once('Page.loadEventFired', sessionId);
      await client.send('Page.navigate', { url: `${BASE}/scenes?scene=sign-in-idle` }, sessionId);
      await Promise.race([loadedForSession, sleep(20_000)]);
      const auth = await client.send('Runtime.evaluate', {
        expression: `fetch('/api/dev/sign-in', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identity: ${JSON.stringify(shot.session)} }) }).then((r) => r.status)`,
        returnByValue: true, awaitPromise: true,
      }, sessionId);
      if (auth.result.value !== 200) throw new Error(`dev sign-in as ${shot.session} answered ${auth.result.value}`);
    }
    await client.send('Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-color-scheme', value: theme }] }, sessionId);
    await client.send('Emulation.setDeviceMetricsOverride',
      { ...PHONE, deviceScaleFactor: shot.still ? STILL_SCALE : 2, mobile: true }, sessionId);
    const path = typeof shot.url === 'function' ? shot.url(ctx) : shot.url;
    if (typeof path !== 'string' || path.length === 0) {
      throw new Error(`this shot needs context that is not set yet (${JSON.stringify(ctx)})`);
    }
    const loaded = client.once('Page.loadEventFired', sessionId);
    await client.send('Page.navigate', { url: `${BASE}${path}` }, sessionId);
    await Promise.race([loaded, sleep(25_000)]);
    await client.send('Runtime.evaluate', { expression: INJECT_CSS, returnByValue: true }, sessionId);
    await sleep(shot.settle ?? 1400);

    if (shot.still) {
      // A still is one crisp 3× frame; `clip` is explicit because mobile emulation applies a
      // page scale of its own, and a plain captureScreenshot then returns a cropped image
      // (docs/AUDIT.md, 2026-11-09).
      const frames = [];
      for (const step of [{ noop: true }, ...(shot.steps ?? [])]) {
        if (step.noop) { frames.push(await still(client, sessionId, dir, frames.length)); continue; }
        await applyStep(client, sessionId, step, taps, null);
        if (step.shoot) frames.push(await still(client, sessionId, dir, frames.length));
      }
      exported = await readExports(client, sessionId, shot);
      return { id: shot.id, ok: true, kind: 'still', theme, stills: frames, taps, exported,
        note: `${frames.length} still(s) at ${STILL_SCALE}×` };
    }

    // --- a real screen recording -------------------------------------------------------
    const frames = [];
    let first = null;
    const stop = client.on('Page.screencastFrame', (params) => {
      if (first === null) first = params.metadata.timestamp;
      frames.push({ at: params.metadata.timestamp - first, data: params.data });
      client.send('Page.screencastFrameAck', { sessionId: params.sessionId }, sessionId).catch(() => {});
    }, sessionId);
    const started = Date.now();
    const clock = () => (first === null ? 0 : (Date.now() - started) / 1000);
    await client.send('Page.startScreencast', { format: 'jpeg', everyNthFrame: 1, ...CAST }, sessionId);
    await sleep(400);
    for (const step of shot.steps ?? []) await applyStep(client, sessionId, step, taps, clock);
    await sleep(shot.tail ?? 600);
    await client.send('Page.stopScreencast', {}, sessionId);
    stop();
    if (frames.length === 0) throw new Error('the screencast produced no frames');
    exported = await readExports(client, sessionId, shot);
    const seconds = await encode(dir, frames);
    return { id: shot.id, ok: true, kind: 'clip', theme, file: `capture/${shot.id}/clip.mp4`,
      seconds, frames: frames.length, taps, exported,
      note: `${frames.length} frames → ${seconds.toFixed(2)}s clip, ${taps.length} tap(s)` };
  } catch (error) {
    return { id: shot.id, ok: false, kind: shot.still ? 'still' : 'clip', theme, taps, exported,
      note: String(error.message ?? error).slice(0, 400) };
  }
}

/** A shot may hand the ones after it something only the running app knows. */
async function readExports(client, sessionId, shot) {
  if (!shot.exports) return null;
  const result = await client.send('Runtime.evaluate',
    { expression: shot.exports, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) throw new Error(`exports: ${result.exceptionDetails.text}`);
  return result.result.value ?? null;
}

async function still(client, sessionId, dir, index) {
  const shot = await client.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: false,
    clip: { x: 0, y: 0, ...PHONE, scale: STILL_SCALE },
  }, sessionId);
  const name = `still-${String(index).padStart(2, '0')}.png`;
  await writeFile(`${dir}/${name}`, Buffer.from(shot.data, 'base64'));
  return name;
}

async function applyStep(client, sessionId, step, taps, clock) {
  const evaluate = async (expression) => {
    const result = await client.send('Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'evaluate threw');
    return result.result.value;
  };
  if (step.wait) { await sleep(step.wait); return; }
  if (step.theme) {
    await client.send('Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-color-scheme', value: step.theme }] }, sessionId);
    return;
  }
  if (step.scroll !== undefined) {
    const info = await evaluate(SCROLLER);
    const top = step.scroll === 'bottom' ? info.max : step.scroll;
    await evaluate(SCROLL_TO(top, step.smooth !== false));
    await sleep(step.after ?? 900);
    return;
  }
  if (step.tap) {
    const found = await evaluate(FIND(step.tap, step.tagHint));
    if (!found.found) {
      throw new Error(`no tappable element containing "${step.tap}". Saw: ${(found.saw ?? []).filter(Boolean).slice(0, 14).join(' | ')}`);
    }
    await sleep(step.before ?? 420);
    if (clock) taps.push({ at: Number(clock().toFixed(3)), x: Math.round(found.x), y: Math.round(found.y), label: step.tap });
    for (const type of ['mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent',
        { type, x: found.x, y: found.y, button: 'left', clickCount: 1, buttons: type === 'mousePressed' ? 1 : 0 },
        sessionId);
      if (type === 'mousePressed') await sleep(90);
    }
    await sleep(step.after ?? 1200);
    await evaluate(INJECT_CSS);
    return;
  }
  if (step.type) {
    const { label, text, perChar = 95, clear = true } = step.type;
    const found = await evaluate(FIELD(label));
    if (!found.found) throw new Error(`no field labelled "${label}". Saw: ${(found.saw ?? []).slice(0, 12).join(' | ')}`);
    if (clock) taps.push({ at: Number(clock().toFixed(3)), x: Math.round(found.x), y: Math.round(found.y), label: `field: ${label}` });
    if (clear) {
      // React tracks an input's value with its own setter and *skips* the change event when the
      // DOM value is assigned directly, so a plain `el.value = ''` leaves React's state at the
      // old value and the next keystroke appends to it. That is exactly what put "300300" in
      // the commit field on 2026-11-11, once the field started arriving pre-filled with the
      // suggested share (PRD M-4). Go through the prototype's native setter instead.
      const cleared = await evaluate(`(() => {
        const el = document.activeElement;
        if (!el || !('value' in el)) return { ok: false, why: 'no focused field' };
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
        if (setter) setter.call(el, ''); else el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return { ok: el.value === '', value: el.value };
      })()`);
      if (!cleared.ok) throw new Error(`could not clear "${label}": ${cleared.why ?? `still "${cleared.value}"`}`);
    }
    // Real characters, one key event each, so the recording shows the text being typed.
    for (const char of text) {
      await client.send('Input.insertText', { text: char }, sessionId);
      await sleep(perChar);
    }
    await sleep(step.after ?? 500);
    return;
  }
  if (step.awaitText) {
    // A fixed wait is a guess about a machine's speed; this waits for the screen the step is
    // actually about. The capture ran on a loaded 4-core laptop, where "Creating…" outlived a
    // 4 s wait more than once.
    const deadline = Date.now() + (step.timeout ?? 30_000);
    const wanted = Array.isArray(step.awaitText) ? step.awaitText : [step.awaitText];
    const seen = `(() => { const body = document.body; if (!body) return false;
      const text = body.innerText || ''; return ${JSON.stringify(wanted)}.some((want) => text.includes(want)); })()`;
    for (;;) {
      if (await evaluate(seen)) break;
      if (Date.now() > deadline) {
        const saw = await evaluate('(() => (document.body && document.body.innerText || "").replace(/\\s+/g, " ").slice(0, 300))()');
        throw new Error(`waited ${((step.timeout ?? 30_000) / 1000).toFixed(0)}s for ${JSON.stringify(wanted)}; the screen said: ${saw}`);
      }
      await sleep(250);
    }
    await sleep(step.after ?? 600);
    return;
  }
  if (step.eval) { await evaluate(step.eval); await sleep(step.after ?? 400); return; }
  if (step.go) {
    const loaded = client.once('Page.loadEventFired', sessionId);
    await client.send('Page.navigate', { url: `${BASE}${step.go}` }, sessionId);
    await Promise.race([loaded, sleep(20_000)]);
    await sleep(step.after ?? 1600);
    return;
  }
  throw new Error(`unknown step ${JSON.stringify(step)}`);
}

/** Frames carry their own capture times, so the clip is assembled from those rather than from
 *  an assumed frame rate, then resampled to a constant 30 fps for the composition. */
async function encode(dir, frames) {
  const list = [];
  for (const [index, frame] of frames.entries()) {
    const name = `f-${String(index).padStart(5, '0')}.jpg`;
    await writeFile(`${dir}/${name}`, Buffer.from(frame.data, 'base64'));
    const next = frames[index + 1];
    const duration = next ? Math.max(0.02, next.at - frame.at) : 0.08;
    list.push(`file '${name}'`, `duration ${duration.toFixed(4)}`);
  }
  list.push(`file 'f-${String(frames.length - 1).padStart(5, '0')}.jpg'`);
  await writeFile(`${dir}/frames.txt`, `${list.join('\n')}\n`);
  const seconds = frames.at(-1).at + 0.08;
  await ffmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
    '-i', `${dir}/frames.txt`, '-fps_mode', 'cfr', '-r', '30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-vf', 'scale=780:-2:flags=lanczos', `${dir}/clip.mp4`]);
  // The jpegs are intermediate: the clip is what the composition uses.
  for (const name of await readdir(dir)) {
    if (name.endsWith('.jpg')) await rm(`${dir}/${name}`, { force: true });
  }
  return seconds;
}

function ffmpeg(args) {
  return new Promise((done, fail) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (chunk) => { err += String(chunk); });
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg ${code}: ${err.slice(-500)}`))));
  });
}

if (process.argv.includes('--list')) {
  for (const shot of SHOTS) console.log(`${shot.still ? 'still' : 'clip '}  ${shot.id.padEnd(30)} ${typeof shot.url === 'function' ? '(from context)' : shot.url}`);
} else {
  await run();
}
