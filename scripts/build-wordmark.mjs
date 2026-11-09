#!/usr/bin/env node
// Converts the words "Squad Stake" into SVG path data, taken from the exact Mulish 700 file
// this repository self-hosts (packages/ui/fonts). The logo must not depend on a font at render
// time — an exported SVG, a PNG and a favicon have no stylesheet — so the outlines are baked
// into packages/ui/brand/wordmark.ts and checked in. Run it again only if the font file
// changes; `pnpm gate` never needs it.
//
// It shells out to `woff2_decompress` (Google's own woff2 tool, /usr/bin on this machine) to
// get a plain TrueType file, then reads head/maxp/hhea/hmtx/cmap/loca/glyf directly: no new
// npm dependency enters the project for a one-off conversion.
//
// Usage: node scripts/build-wordmark.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const TEXT = 'Squad Stake';
const FONT = 'packages/ui/fonts/mulish-latin-700-normal.woff2';
const OUT = 'packages/ui/brand/wordmark.ts';
/** Mulish's own sidebearings already space these letters; a touch of negative tracking keeps
 * the lockup tight beside the mark, the same instinct as the headings' -0.01em. */
const TRACKING_EM = -0.008;

function toTtf(woff2Path) {
  const dir = mkdtempSync(join(tmpdir(), 'squad-wordmark-'));
  const copy = join(dir, basename(woff2Path));
  copyFileSync(woff2Path, copy);
  execFileSync('woff2_decompress', [copy], { stdio: 'pipe' });
  return readFileSync(copy.replace(/\.woff2$/, '.ttf'));
}

function tables(dv) {
  const found = {};
  const count = dv.getUint16(4);
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(...[0, 1, 2, 3].map((n) => dv.getUint8(at + n)));
    found[tag] = { offset: dv.getUint32(at + 8), length: dv.getUint32(at + 12) };
  }
  return found;
}

/** cmap format 4, the Unicode BMP subtable every Latin web font carries. */
function charToGlyph(dv, cmap) {
  const count = dv.getUint16(cmap + 2);
  let subtable = null;
  for (let i = 0; i < count; i += 1) {
    const at = cmap + 4 + i * 8;
    const platform = dv.getUint16(at);
    const encoding = dv.getUint16(at + 2);
    const offset = cmap + dv.getUint32(at + 4);
    const preferred = platform === 3 && encoding === 1;
    if (preferred || (subtable === null && (platform === 0 || platform === 3))) {
      if (dv.getUint16(offset) === 4) subtable = offset;
      if (preferred && subtable !== null) break;
    }
  }
  if (subtable === null) throw new Error('no cmap format 4 subtable');
  const segX2 = dv.getUint16(subtable + 6);
  const ends = subtable + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  return (code) => {
    for (let s = 0; s < segX2 / 2; s += 1) {
      if (dv.getUint16(ends + s * 2) < code) continue;
      if (dv.getUint16(starts + s * 2) > code) return 0;
      const rangeOffset = dv.getUint16(ranges + s * 2);
      const delta = dv.getInt16(deltas + s * 2);
      if (rangeOffset === 0) return (code + delta) & 0xffff;
      const at = ranges + s * 2 + rangeOffset + (code - dv.getUint16(starts + s * 2)) * 2;
      const glyph = dv.getUint16(at);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

/** A simple TrueType glyph: contours of on- and off-curve points, quadratic throughout. */
function glyphContours(dv, start, end) {
  if (end <= start) return [];
  const contours = dv.getInt16(start);
  if (contours < 0) throw new Error('composite glyph: not expected in "Squad Stake"');
  let at = start + 10;
  const endPts = [];
  for (let i = 0; i < contours; i += 1) { endPts.push(dv.getUint16(at)); at += 2; }
  const points = (endPts.at(-1) ?? -1) + 1;
  at += 2 + dv.getUint16(at); // instructions, skipped: hinting has no meaning in an outline
  const flags = [];
  while (flags.length < points) {
    const flag = dv.getUint8(at); at += 1;
    flags.push(flag);
    if (flag & 8) { let repeat = dv.getUint8(at); at += 1; while (repeat-- > 0) flags.push(flag); }
  }
  const read = (shortBit, sameBit) => {
    const out = [];
    let value = 0;
    for (const flag of flags) {
      if (flag & shortBit) {
        const delta = dv.getUint8(at); at += 1;
        value += (flag & sameBit) ? delta : -delta;
      } else if (!(flag & sameBit)) { value += dv.getInt16(at); at += 2; }
      out.push(value);
    }
    return out;
  };
  const xs = read(2, 16);
  const ys = read(4, 32);
  const out = [];
  let first = 0;
  for (const last of endPts) {
    out.push(Array.from({ length: last - first + 1 }, (_, i) => ({
      x: xs[first + i], y: ys[first + i], on: (flags[first + i] & 1) === 1,
    })));
    first = last + 1;
  }
  return out;
}

/** TrueType quadratics → SVG path, with the implied on-curve midpoints made explicit.
 * `y` is negated here: font space is y-up, SVG is y-down. */
function contourPath(points, dx) {
  if (points.length === 0) return '';
  const at = (i) => points[((i % points.length) + points.length) % points.length];
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true });
  const put = (p) => `${(p.x + dx).toFixed(0)} ${(-p.y).toFixed(0)}`;
  let startIndex = points.findIndex((p) => p.on);
  let start;
  if (startIndex === -1) { start = mid(at(0), at(1)); startIndex = 0; } else start = at(startIndex);
  let d = `M${put(start)}`;
  let i = startIndex + 1;
  const stop = startIndex + points.length;
  while (i <= stop) {
    const point = at(i);
    if (point.on) { d += `L${put(point)}`; i += 1; continue; }
    const next = at(i + 1);
    const to = next.on ? next : mid(point, next);
    d += `Q${put(point)} ${put(to)}`;
    i += next.on ? 2 : 1;
  }
  return `${d}Z`;
}

const ttf = toTtf(FONT);
const dv = new DataView(ttf.buffer, ttf.byteOffset, ttf.byteLength);
const table = tables(dv);
for (const name of ['head', 'maxp', 'hhea', 'hmtx', 'cmap', 'loca', 'glyf']) {
  if (!table[name]) throw new Error(`the font has no ${name} table`);
}
const unitsPerEm = dv.getUint16(table.head.offset + 18);
const longLoca = dv.getInt16(table.head.offset + 50) === 1;
const metrics = dv.getUint16(table.hhea.offset + 34);
const loca = (gid) => (longLoca
  ? dv.getUint32(table.loca.offset + gid * 4)
  : dv.getUint16(table.loca.offset + gid * 2) * 2);
const advance = (gid) => dv.getUint16(table.hmtx.offset + Math.min(gid, metrics - 1) * 4);
const glyphFor = charToGlyph(dv, table.cmap.offset);

const tracking = Math.round(TRACKING_EM * unitsPerEm);
let pen = 0;
let path = '';
const used = [];
for (const character of TEXT) {
  const gid = glyphFor(character.codePointAt(0));
  if (gid === 0) throw new Error(`the font has no glyph for ${JSON.stringify(character)}`);
  for (const contour of glyphContours(dv, table.glyf.offset + loca(gid), table.glyf.offset + loca(gid + 1))) {
    path += contourPath(contour, pen);
  }
  used.push({ character, gid, advance: advance(gid) });
  pen += advance(gid) + tracking;
}
const width = pen - tracking;

// The drawn box, read back out of the path that was just generated, so it cannot drift.
const numbers = [...path.matchAll(/(-?\d+) (-?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const xs = numbers.map(([x]) => x);
const ys = numbers.map(([, y]) => y);
const box = {
  x: Math.min(...xs), y: Math.min(...ys),
  width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys),
};

const sha = createHash('sha256').update(readFileSync(FONT)).digest('hex');
writeFileSync(OUT, `// Generated by scripts/build-wordmark.mjs — do not edit by hand.
// "${TEXT}" in Mulish 700, the heading face this app self-hosts, converted to outlines so the
// logo needs no font at render time (an exported SVG, a PNG and a favicon have no stylesheet).
// Source: ${FONT}
//   SHA-256 ${sha}
//   unitsPerEm ${unitsPerEm}, tracking ${TRACKING_EM}em (${tracking} units), ${used.length} glyphs
// Licence: SIL Open Font Licence 1.1 (packages/ui/fonts/LICENSE-Mulish.txt).
// Coordinates are font units with the baseline at y = 0 and y growing downward (SVG's
// direction, not the font's), so the path drops straight into a viewBox.

export const WORDMARK = {
  text: ${JSON.stringify(TEXT)},
  unitsPerEm: ${unitsPerEm},
  /** Pen advance for the whole string, tracking included: the lockup's optical width. */
  advance: ${width},
  /** The inked box, measured from the path below. */
  box: { x: ${box.x}, y: ${box.y}, width: ${box.width}, height: ${box.height} },
  path: '${path}',
} as const;
`);
console.log(`${OUT}: ${used.length} glyphs, advance ${width}/${unitsPerEm} em, `
  + `box ${box.width}×${box.height}, ${path.length} path characters`);
