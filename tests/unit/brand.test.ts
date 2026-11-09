import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppIcon } from '../../packages/ui/brand/AppIcon';
import { BrandSheet } from '../../packages/ui/brand/BrandSheet';
import { Logo } from '../../packages/ui/brand/Logo';
import { LogoMark } from '../../packages/ui/brand/LogoMark';
import { ICON_INSET, ICON_SCALE, LOGO_WIDTH, MARK_BOX, orbitShapes }
  from '../../packages/ui/brand/shapes';
import { appIconSvg, logoSvg, markSvg } from '../../packages/ui/brand/svg';
import { toneColours, type BrandTone } from '../../packages/ui/brand/tone';
import { WORDMARK } from '../../packages/ui/brand/wordmark';
import { brandScenes } from '../../packages/ui/scenes/brand';

const render = (component: unknown, props: unknown) =>
  renderToStaticMarkup(createElement(component as never, props as never));
/** Every `d=` and `r=`/`cx=` in a drawing, whichever renderer produced it. */
const geometry = (svg: string) => [...svg.matchAll(/(?:\sd="([^"]+)"|\scx="([^"]+)")/g)]
  .map((match) => match[1] ?? match[2]);

test('brand: the component and the exported file are the same drawing', () => {
  for (const tone of ['colour-dark', 'colour-light', 'white', 'navy'] satisfies BrandTone[]) {
    assert.deepEqual(geometry(render(LogoMark, { tone, id: 'x' })), geometry(markSvg(tone)),
      `the mark differs between React and the exported file (${tone})`);
    assert.deepEqual(geometry(render(Logo, { tone, id: 'x' })), geometry(logoSvg(tone)),
      `the lockup differs between React and the exported file (${tone})`);
  }
  assert.deepEqual(geometry(render(AppIcon, { id: 'x' })), geometry(appIconSvg()));
  // The one place the two could drift silently: the icon's safe area.
  const transform = `translate(${ICON_INSET} ${ICON_INSET}) scale(${ICON_SCALE})`;
  assert.ok(appIconSvg().includes(transform), 'the exported icon lost its safe padding');
  assert.ok(render(AppIcon, { id: 'x' }).includes(transform), 'the icon component lost it');
});

test('brand: every variant paints with the colours its tone names, and nothing else', () => {
  const allowed = new Set(['#e9b213', '#fc7500', '#1f2348', '#ffffff', '#ec991c', 'currentColor']);
  for (const tone of ['colour-dark', 'colour-light', 'colour-current', 'white',
    'navy'] satisfies BrandTone[]) {
    const svg = render(Logo, { tone, id: 'x' });
    for (const [, colour] of svg.matchAll(/(?:fill|stroke|stop-color)="([^"]+)"/g)) {
      if (colour === 'none' || colour.startsWith('url(')) continue;
      assert.ok(allowed.has(colour), `${tone} paints with ${colour}, which is not a brand colour`);
    }
    const colours = toneColours(tone);
    // A one-colour variant must not reference a gradient: a stamp or a mask has none.
    if (!colours.gradient) assert.ok(!svg.includes('url(#'), `${tone} still uses a gradient`);
  }
  // `currentColor` is for the app only; an exported file has no colour to inherit.
  assert.ok(!markSvg('colour-dark').includes('currentColor'));
});

test('brand: the mark survives a 16 px favicon', () => {
  const shapes = orbitShapes();
  const strokes = shapes.flatMap((shape) => (shape.kind === 'path' && shape.stroke !== undefined
    ? [shape.stroke] : []));
  const discs = shapes.flatMap((shape) => (shape.kind === 'circle' ? [shape.r] : []));
  assert.ok(strokes.length > 0 && discs.length > 0);
  // At 16 px one unit is a quarter of a pixel, so nothing may be thinner than 6 units (1.5 px);
  // below that a hairline disappears into the background on a low-density screen.
  for (const stroke of strokes) assert.ok(stroke >= 6, `a ${stroke}-unit line is too thin`);
  // The members have to stand proud of the links, or the mark reads as a plain ring.
  for (const stroke of strokes) {
    for (const disc of discs) assert.ok(disc * 2 > stroke + 3, 'a member is lost in the ring');
  }
  // Nothing may touch the edge of the box, or the mark loses its own clear space.
  for (const shape of shapes) {
    if (shape.kind !== 'circle') continue;
    for (const edge of [shape.cx - shape.r, shape.cy - shape.r]) assert.ok(edge >= 0);
    for (const edge of [shape.cx + shape.r, shape.cy + shape.r]) assert.ok(edge <= MARK_BOX);
  }
});

test('brand: the words are outlines from the font this repo ships, not live text', () => {
  const font = 'packages/ui/fonts/mulish-latin-700-normal.woff2';
  const sha = createHash('sha256').update(readFileSync(font)).digest('hex');
  const generated = readFileSync('packages/ui/brand/wordmark.ts', 'utf8');
  assert.ok(generated.includes(sha),
    `${font} has changed; re-run scripts/build-wordmark.mjs so the logo matches the headings`);
  assert.equal(WORDMARK.text, 'Squad Stake');
  // No <text>, no font-family: an exported SVG and a PNG have no stylesheet to resolve.
  for (const svg of [logoSvg('navy'), render(Logo, { id: 'x' })]) {
    assert.ok(!/<text|font-family/.test(svg), 'the lockup still depends on a font at render time');
  }
  assert.ok(LOGO_WIDTH > MARK_BOX * 3 && LOGO_WIDTH < MARK_BOX * 8,
    `the lockup is ${LOGO_WIDTH}/${MARK_BOX} wide, which is not a horizontal logo`);
});

test('Q17 every brand scene renders twice to the same bytes from props alone', () => {
  assert.equal(brandScenes.length, 3);
  for (const scene of brandScenes) {
    const once = render(BrandSheet, scene.props);
    const twice = render(BrandSheet, scene.props);
    assert.equal(once, twice, `${scene.id} is not deterministic`);
    assert.ok(once.includes('<svg'), `${scene.id} drew nothing`);
  }
});

test('brand: the files in apps/web/public are the drawing this code makes today', () => {
  // A stale export is the one way the tab icon and the app can disagree, and nobody would see
  // it until it shipped. Re-run `pnpm brand:export` when this fails.
  const expected: Record<string, string> = {
    'logo.svg': logoSvg('colour-light'),
    'logo-on-dark.svg': logoSvg('colour-dark'),
    'logo-white.svg': logoSvg('white'),
    'logo-navy.svg': logoSvg('navy'),
    'logo-mark.svg': markSvg('colour-light'),
    'logo-mark-on-dark.svg': markSvg('colour-dark'),
    'logo-mark-white.svg': markSvg('white'),
    'logo-mark-navy.svg': markSvg('navy'),
    'app-icon.svg': appIconSvg(),
  };
  for (const [name, svg] of Object.entries(expected)) {
    assert.equal(readFileSync(`apps/web/public/brand/${name}`, 'utf8'), svg,
      `apps/web/public/brand/${name} is stale: run pnpm brand:export`);
  }
});
