#!/usr/bin/env node
// Measures every fixture scene in a real browser: 390 × 844 and 375 × 844, light and dark.
// Fails on an element crossing the phone frame, on horizontal page scroll, or on an interactive
// target whose tap area is under 44 px (AGENTS.md "Design"). Zero dependencies: it drives the
// system Chromium over the DevTools protocol with Node's global WebSocket, so `pnpm gate` stays
// runnable on a machine with no browser — this is a separate check (`pnpm check:scenes`).
//
// Usage: pnpm dev (DEV_HARNESS=1) in one shell, then `pnpm check:scenes`.
//   SCENES_URL=http://localhost:3000  CHROMIUM=/usr/bin/chromium  SHOTS=id,id  pnpm check:scenes
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const BASE = (process.env.SCENES_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const BROWSER = process.env.CHROMIUM ?? ['/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome'].find((path) => existsSync(path));
const WIDTHS = [390, 375];
const THEMES = ['light', 'dark'];
const MIN_TAP = 44;
const SHOTS = (process.env.SHOTS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
/** SCENES=a,b limits the run to those ids, for looking at one frame again. */
const ONLY = (process.env.SCENES ?? '').split(',').map((id) => id.trim()).filter(Boolean);

const MEASURE = `(() => {
  const frame = document.querySelector('.scene-frame');
  if (!frame) return { error: 'no .scene-frame on the page' };
  const box = frame.getBoundingClientRect();
  // An element inside a clipping box (the goal ticker's masked window) cannot paint outside
  // the frame however wide it is, so only its clipper is measured.
  const clipped = (node) => {
    for (let parent = node.parentElement; parent && parent !== frame; parent = parent.parentElement) {
      if (getComputedStyle(parent).overflowX !== 'visible') return true;
    }
    return false;
  };
  const overflow = [];
  for (const node of frame.querySelectorAll('*')) {
    const style = getComputedStyle(node);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (clipped(node)) continue;
    if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5) {
      overflow.push({
        tag: node.tagName.toLowerCase(), className: String(node.className).slice(0, 60),
        left: Math.round(rect.left), right: Math.round(rect.right),
      });
    }
  }
  const small = [];
  const selector = 'a, button, input, select, textarea, [role="button"], [tabindex]';
  for (const node of frame.querySelectorAll(selector)) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    // A small control inside a big label (the mode radios) is tapped through the label.
    let area = Math.min(rect.width, rect.height);
    for (let parent = node.parentElement; parent && parent !== frame; parent = parent.parentElement) {
      const tag = parent.tagName.toLowerCase();
      if (tag !== 'label' && tag !== 'a' && tag !== 'button') continue;
      const outer = parent.getBoundingClientRect();
      area = Math.max(area, Math.min(outer.width, outer.height));
    }
    if (area < ${MIN_TAP} - 0.5) {
      small.push({ tag: node.tagName.toLowerCase(), className: String(node.className).slice(0, 60),
        width: Math.round(rect.width), height: Math.round(rect.height), tap: Math.round(area) });
    }
  }
  // Vertical scrolling is recorded, not failed: a form or a member list may legitimately be
  // longer than the phone. The welcome screen's fit is checked by eye against these numbers.
  const screen = frame.firstElementChild;
  // When the document itself scrolls sideways, name what sticks out, so the failure points
  // at an element rather than at the page.
  const html = document.documentElement;
  const widest = [];
  if (html.scrollWidth > html.clientWidth + 1) {
    for (const node of document.querySelectorAll('*')) {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > html.clientWidth + 1 || rect.left < -1) {
        widest.push({ tag: node.tagName.toLowerCase(), className: String(node.className).slice(0, 60),
          left: Math.round(rect.left), right: Math.round(rect.right) });
      }
    }
  }
  return {
    widest: widest.slice(0, 6),
    frameWidth: Math.round(box.width), frameHeight: Math.round(box.height),
    contentHeight: screen ? screen.scrollHeight : null,
    pageScrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    frameScrolls: frame.scrollWidth > frame.clientWidth + 1,
    overflow, small,
  };
})()`;

function cdp(socket) {
  let next = 1;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }
    for (const listener of listeners) listener(message);
  });
  return {
    send(method, params = {}, sessionId) {
      const id = next++;
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    once(method, sessionId) {
      return new Promise((resolve) => {
        const listener = (message) => {
          if (message.method !== method) return;
          if (sessionId && message.sessionId !== sessionId) return;
          listeners.delete(listener);
          resolve(message.params);
        };
        listeners.add(listener);
      });
    },
  };
}

// Only the gallery's own captions: a scene may contain its own <figcaption> (the orbit's goal).
const LIST_IDS = `[...document.querySelectorAll('.scene-gallery > figure > figcaption')]
  .map((node) => node.textContent.split(' · ')[0].trim())`;

async function main() {
  if (!BROWSER) throw new Error('No Chromium found. Set CHROMIUM=/path/to/chromium.');
  const child = spawn(BROWSER, ['--headless=new', '--remote-debugging-port=0', '--no-sandbox',
    '--disable-gpu', '--force-device-scale-factor=1', '--no-first-run', '--disable-extensions',
    // Headless Chromium throttles a page it treats as backgrounded, which turned a 1.5 s frame
    // into 15 s on this machine (measured 2026-11-08). These three keep every frame at speed.
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    `--user-data-dir=${process.env.TMPDIR ?? '/tmp'}/squad-scenes-${process.pid}`, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Chromium did not report a DevTools URL')), 20_000);
    child.stderr.on('data', (chunk) => {
      buffer += String(chunk);
      const match = buffer.match(/ws:\/\/\S+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const client = cdp(socket);
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  await client.send('Page.enable', {}, sessionId);

  // The gallery itself is the list of scenes, read from the rendered page rather than a second
  // copy of the registry, so a scene can never be measured-but-unlisted or the other way round.
  const listed = client.once('Page.loadEventFired', sessionId);
  await client.send('Page.navigate', { url: `${BASE}/scenes` }, sessionId);
  await listed;
  const listing = await client.send('Runtime.evaluate',
    { expression: LIST_IDS, returnByValue: true }, sessionId);
  const all = [...new Set(listing.result.value ?? [])];
  const ids = ONLY.length > 0 ? all.filter((id) => ONLY.includes(id)) : all;
  if (ids.length === 0) {
    throw new Error(`No scenes at ${BASE}/scenes — is the dev server running with DEV_HARNESS=1?`);
  }
  console.log(`${ids.length} scenes × ${THEMES.length} themes × ${WIDTHS.length} widths = ${ids.length * 4} frames`);

  const results = [];
  const failures = [];
  // One navigation per scene, then the four frames are measured by changing the viewport and
  // the theme attribute in place. A dev-server navigation costs a full React hydration; a
  // relayout does not, and the CSS under test is the same either way.
  const SET_THEME = (theme, width) => `(() => {
    for (const node of document.querySelectorAll('[data-theme]')) node.dataset.theme = '${theme}';
    const frame = document.querySelector('.scene-frame');
    if (frame) frame.dataset.width = '${width}';
    return true;
  })()`;
  // The viewport is set before the first navigation too, so no scene is ever laid out at the
  // browser's default size and measured at a phone size.
  await client.send('Emulation.setDeviceMetricsOverride',
    { width: WIDTHS[0], height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  for (const id of ids) {
    const url = `${BASE}/scenes?scene=${encodeURIComponent(id)}&theme=light&w=390`;
    const loaded = client.once('Page.loadEventFired', sessionId);
    await client.send('Page.navigate', { url }, sessionId);
    await loaded;
    for (const width of WIDTHS) {
      await client.send('Emulation.setDeviceMetricsOverride',
        { width, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
      for (const theme of THEMES) {
        await client.send('Runtime.evaluate',
          { expression: SET_THEME(theme, width), returnByValue: true }, sessionId);
        // Two animation frames after a viewport or theme change, so the numbers are the ones
        // the browser has settled on: measuring straight after a resize reported a stale
        // scrollWidth here (a false "scrolls horizontally" on the first scene, 2026-11-08).
        await client.send('Runtime.evaluate', {
          expression: 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))',
          awaitPromise: true,
        }, sessionId);
        const { result } = await client.send('Runtime.evaluate',
          { expression: MEASURE, returnByValue: true, awaitPromise: false }, sessionId);
        const measurement = { id, theme, width, ...result.value };
        results.push(measurement);
        const problems = [];
        if (measurement.error) problems.push(measurement.error);
        if (measurement.frameWidth !== width) problems.push(`frame is ${measurement.frameWidth}px`);
        if (measurement.pageScrolls) {
          const names = (measurement.widest ?? [])
            .map((node) => `${node.tag}.${node.className} (${node.left}…${node.right})`).join(', ');
          problems.push(`the page scrolls horizontally${names ? `: ${names}` : ''}`);
        }
        if (measurement.frameScrolls) problems.push('the frame scrolls horizontally');
        for (const node of measurement.overflow ?? []) {
          problems.push(`${node.tag}.${node.className} crosses the frame (${node.left}…${node.right})`);
        }
        for (const node of measurement.small ?? []) {
          problems.push(`${node.tag}.${node.className} taps at ${node.tap}px`);
        }
        if (problems.length > 0) failures.push({ id, theme, width, problems });
        if (SHOTS.includes(id) && width === 390) {
          const shot = await client.send('Page.captureScreenshot', { format: 'png' }, sessionId);
          await mkdir('.cache/scenes', { recursive: true });
          await writeFile(`.cache/scenes/${id}-${theme}-${width}.png`, Buffer.from(shot.data, 'base64'));
        }
      }
    }
  }
  console.log(`  ${results.length} frames measured`);

  await mkdir('.cache', { recursive: true });
  await writeFile('.cache/scene-measurements.json', `${JSON.stringify(
    { measuredAt: new Date().toISOString(), base: BASE, minTap: MIN_TAP, frames: results.length,
      failures, results }, null, 1)}\n`);
  socket.close();
  child.kill();

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`✖ ${failure.id} · ${failure.theme} · ${failure.width}px`);
      for (const problem of failure.problems) console.error(`    ${problem}`);
    }
    console.error(`\n${failures.length} of ${results.length} frames failed. See .cache/scene-measurements.json`);
    process.exit(1);
  }
  console.log(`\n${results.length} frames: no overflow, no horizontal scroll, every tap target ≥ ${MIN_TAP}px.`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
