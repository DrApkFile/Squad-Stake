import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// .npmrc places downloaded third-party packages here, like node_modules/store.
const ignored = new Set(['.git', '.next', 'node_modules', '.pnpm-store', '.npm-cache', '.pnpm-cache', '.agents', '.codex', '.aws', 'coverage', 'dist']);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |ED25519 )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{50,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
  /(?:postgres(?:ql)?):\/\/[^\s:]+:[^\s@]+@(?!localhost\b|127\.0\.0\.1\b)[^\s]+/i,
  /(?:private[_-]?key|seed[_-]?phrase|api[_-]?key)\s*[:=]\s*["'][a-zA-Z0-9+/=_-]{24,}["']/i,
];
let failures = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.isFile() && !/\.(?:ttf|woff2?|png|jpg|mp4|tsbuildinfo)$/.test(path)) {
      if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
      const content = await readFile(path, 'utf8');
      if (patterns.some((pattern) => pattern.test(content))) {
        // Never print the matched secret itself.
        console.error(`Potential secret: ${path}`);
        failures++;
      }
    }
  }
}
await scan('.');
if (failures) process.exitCode = 1;
else console.log('Secret scan passed.');
