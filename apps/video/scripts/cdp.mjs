// Minimal DevTools-protocol client, zero dependencies. Same approach as
// scripts/measure-scenes.mjs: Node's global WebSocket against the system Chromium, so the
// video pipeline adds no browser dependency to the workspace.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';

export const CHROMIUM = process.env.CHROMIUM ?? [
  '/home/kingghidorah/.cache/hyperframes/chrome/chrome-headless-shell/linux-152.0.7977.30/chrome-headless-shell-linux64/chrome-headless-shell',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
].find((path) => existsSync(path));

export function protocol(socket) {
  let next = 1;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message ?? ''} ${JSON.stringify(message.error)}`));
      else resolve(message.result);
      return;
    }
    for (const listener of [...listeners]) listener(message);
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
    on(method, handler, sessionId) {
      const listener = (message) => {
        if (message.method !== method) return;
        if (sessionId && message.sessionId !== sessionId) return;
        handler(message.params);
      };
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Launch Chromium and attach. The profile is removed in the caller's `finally` and checked
 * afterwards, for the reason recorded in scripts/measure-scenes.mjs: Chromium recreates
 * `Default/` while it is still exiting, so a cleanup that is not verified is not a cleanup.
 */
export async function launch({ profile }) {
  if (!CHROMIUM) throw new Error('No Chromium found. Set CHROMIUM=/path/to/chromium.');
  const child = spawn(CHROMIUM, ['--headless=new', '--remote-debugging-port=0', '--no-sandbox',
    '--disable-gpu', '--no-first-run', '--disable-extensions', '--hide-scrollbars',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--force-color-profile=srgb',
    `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buffer = '';
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
  const client = protocol(socket);
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  await client.send('Page.enable', {}, sessionId);
  await client.send('Runtime.enable', {}, sessionId);
  await client.send('Network.enable', {}, sessionId);
  return { child, socket, client, sessionId };
}

export async function teardown({ child, profile }) {
  if (child && child.exitCode === null) child.kill();
  if (child) await new Promise((resolve) => { child.on('exit', resolve); setTimeout(resolve, 5_000); });
  if (!profile) return;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await rm(profile, { recursive: true, force: true, maxRetries: 30, retryDelay: 100 });
    if (!existsSync(profile)) break;
    await new Promise((resolve) => { setTimeout(resolve, 300); });
  }
}
