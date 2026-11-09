#!/usr/bin/env node
// Writes every brand asset the app and the stores need, from the one drawing in
// packages/ui/brand. Vector files are serialised straight out of the shared shapes; the
// rasters are screenshots of those same files taken with the system Chromium this repo
// already drives for scene measurement, so no image library enters the project.
//
// Usage: pnpm brand:export        (CHROMIUM=/path/to/chromium to point at another build)
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { appIconSvg, logoSvg, markSvg } from '../packages/ui/brand/svg.ts';
import { LOGO_WIDTH, MARK_BOX } from '../packages/ui/brand/shapes.ts';

const OUT = 'apps/web/public/brand';
const BROWSER = process.env.CHROMIUM ?? ['/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome'].find((path) => existsSync(path));

/** The four variants, each a file of its own so a designer can grab the right one. */
const TONES = [
  { tone: 'colour-dark', suffix: '-on-dark', note: 'full colour, for a dark background' },
  { tone: 'colour-light', suffix: '', note: 'full colour, for a light background (the default)' },
  { tone: 'white', suffix: '-white', note: 'one colour white' },
  { tone: 'navy', suffix: '-navy', note: 'one colour navy' },
];
/** 16/32 favicon · 180 apple-touch-icon · 192/512 web app manifest · 1024 store listing. */
const ICON_SIZES = [16, 32, 180, 192, 512, 1024];

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

/** A page that is exactly the drawing: no margin, no scrollbar, nothing else to capture. */
function page(svg, width, height) {
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(
    '<!doctype html><meta charset="utf-8">'
    + `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${width}px;height:${height}px}</style>`
    + svg);
}

/**
 * An .ico is a tiny container: a header, one 16-byte directory entry per image, then the
 * images themselves. PNG payloads are allowed and are what every browser since IE11 reads,
 * so the two PNGs above are embedded unchanged.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const directory = [];
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    directory.push(entry);
    offset += image.data.length;
  }
  return Buffer.concat([header, ...directory, ...images.map((image) => image.data)]);
}

async function main() {
  if (!BROWSER) throw new Error('No Chromium found. Set CHROMIUM=/path/to/chromium.');
  await mkdir(OUT, { recursive: true });
  const written = [];
  const put = async (name, data) => {
    await writeFile(`${OUT}/${name}`, data);
    written.push(`${OUT}/${name}  (${data.length.toLocaleString('en-GB')} bytes)`);
  };

  for (const { tone, suffix } of TONES) {
    await put(`logo${suffix}.svg`, logoSvg(tone));
    await put(`logo-mark${suffix}.svg`, markSvg(tone));
  }
  await put('app-icon.svg', appIconSvg());

  // Chromium writes ~165 MB of profile per run. Earlier versions of this script left
  // one behind on every killed run and filled /tmp (2026-11-09); it is removed below,
  // on the way out and on the way in.
  const profile = `${process.env.TMPDIR ?? '/tmp'}/squad-brand-${process.pid}`;
  const child = spawn(BROWSER, ['--headless=new', '--remote-debugging-port=0', '--no-sandbox',
    '--disable-gpu', '--force-device-scale-factor=1', '--no-first-run', '--disable-extensions',
    `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buffer = '';
    // 60 s, not 20: on a loaded machine Chromium's first start is slow, and a tool timing out
    // on its own browser says nothing about the thing being measured.
    const timer = setTimeout(() => reject(new Error('Chromium did not report a DevTools URL')), 60_000);
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

  const shoot = async (svg, width, height) => {
    await client.send('Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
    // Transparent, so a logo with no tile behind it keeps its own edges.
    await client.send('Emulation.setDefaultBackgroundColorOverride',
      { color: { r: 0, g: 0, b: 0, a: 0 } }, sessionId);
    const loaded = client.once('Page.loadEventFired', sessionId);
    await client.send('Page.navigate', { url: page(svg, width, height) }, sessionId);
    await loaded;
    const shot = await client.send('Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: false }, sessionId);
    return Buffer.from(shot.data, 'base64');
  };

  const icons = [];
  for (const size of ICON_SIZES) {
    const data = await shoot(appIconSvg(size), size, size);
    icons.push({ size, data });
    await put(`icon-${size}.png`, data);
  }
  // The lockup as a raster too, for a README or a slide that cannot place an SVG. The canvas
  // is the drawing's own aspect ratio, so there is no dead margin around it.
  const logoHeight = 256;
  const logoPixels = Math.round((logoHeight * LOGO_WIDTH) / MARK_BOX);
  await put('logo-on-dark.png',
    await shoot(logoSvg('colour-dark', logoHeight), logoPixels, logoHeight));
  await put('logo.png', await shoot(logoSvg('colour-light', logoHeight), logoPixels, logoHeight));

  await put('favicon.ico', ico(icons.filter((icon) => icon.size === 16 || icon.size === 32)));

  socket.close();
  child.kill();
  // Chromium is still flushing its profile when kill() returns, so the directory has to be
  // waited for and then retried: removing it mid-write fails with ENOTEMPTY (seen 2026-11-09).
  await new Promise((resolve) => { child.on('exit', resolve); setTimeout(resolve, 5_000); });
  await rm(profile, { recursive: true, force: true, maxRetries: 30, retryDelay: 100 });
  console.log(written.join('\n'));
}

main().catch((error) => { console.error(error.message); process.exit(1); });
