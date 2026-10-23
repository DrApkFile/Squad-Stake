import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
// Check project manifests, excluding third-party package-manager caches (.npmrc).
const ignored = new Set(['node_modules', '.git', '.next', '.cache', 'dist', 'coverage', '.pnpm-store', '.npm-cache', '.pnpm-cache', '.agents', '.codex', '.aws']);
const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const exactVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

async function findManifests(directory) {
  const manifests = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) manifests.push(...await findManifests(path));
    else if (entry.isFile() && entry.name === 'package.json') {
      manifests.push({ path, manifest: JSON.parse(await readFile(path, 'utf8')) });
    }
  }
  return manifests;
}

const manifests = await findManifests('.');
const localNames = new Set(manifests.map(({ manifest }) => manifest.name));
const packages = new Map();
function addPin(name, version, location) {
  if (typeof version !== 'string' || !exactVersion.test(version)) {
    throw new Error(`Non-exact dependency: ${name}=${String(version)} in ${location}`);
  }
  const key = `${name}@${version}`;
  const pin = packages.get(key) ?? { name, version, locations: [] };
  pin.locations.push(location);
  packages.set(key, pin);
}
for (const { path, manifest } of manifests) {
  for (const section of sections) {
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      // Local workspace packages have no npm publication date. Their code is
      // versioned with this repository; all their external dependencies are checked.
      if (typeof version === 'string' && version.startsWith('workspace:')) {
        if (!localNames.has(name)) throw new Error(`Unknown workspace dependency: ${name} in ${path}`);
        continue;
      }
      addPin(name, version, `${path}:${section}`);
    }
  }
  if (manifest.packageManager) {
    const match = /^(pnpm)@(.+)$/.exec(manifest.packageManager);
    if (!match) throw new Error(`Invalid packageManager in ${path}`);
    addPin(match[1], match[2], `${path}:packageManager`);
  }
}

const checkedAt = new Date();
const cutoff = new Date(checkedAt.getTime() - 14 * 86400_000);
const records = [];
for (const { name, version, locations } of packages.values()) {
  // npm's dotted selector splits version numbers into nested keys. Query the
  // requested field plus the literal-key form, in the same npm view invocation.
  const fields = [`time.${version}`, `time[${version}]`];
  const args = ['view', name, ...fields, '--json', '--fetch-retries=0', '--fetch-timeout=20000'];
  let stdout;
  try {
    ({ stdout } = await run('npm', args, { timeout: 25000, maxBuffer: 1024 * 1024 }));
  } catch (cause) {
    throw new Error(`npm view failed for ${name}@${version}; publication age is unverified.`, { cause });
  }
  const value = JSON.parse(stdout || 'null');
  const publishedAt = typeof value === 'string' ? value : value?.[fields[1]] ?? value?.[fields[0]];
  if (typeof publishedAt !== 'string' || !Number.isFinite(Date.parse(publishedAt))) {
    throw new Error(`npm returned no publication date for ${name}@${version}`);
  }
  if (new Date(publishedAt) > cutoff) {
    throw new Error(`${name}@${version} was published ${publishedAt}; it must be published by ${cutoff.toISOString()}`);
  }
  records.push({ name, version, publishedAt, locations, command: ['npm', ...args] });
  console.log(`Verified ${name}@${version}: ${publishedAt}`);
}
// Gate reports must not rewrite tracked files on every successful verification.
await mkdir('.cache', { recursive: true });
await writeFile('.cache/dependency-ages.json', JSON.stringify({ checkedAt, cutoff, records }, null, 2) + '\n');
console.log(`Verified ${records.length} exact pins across ${manifests.length} manifests, all at least fourteen days old.`);
