#!/usr/bin/env node
/**
 * Writes the two files that are pure data: the root composition and the caption track.
 *
 * Everything else — the motion-graphic scenes and the phone scene — is hand-written HTML in
 * compositions/, because that is the craft. This generator only decides *when* each scene
 * plays and what the beats inside it are, and both of those come from the measured narration,
 * so a re-spoken script re-times the film rather than asking anyone to re-count frames.
 *
 * Scenes read their own beats from `window.__SQUAD_BEATS[id]`, an array of sentence start
 * times in seconds **relative to the scene's own start**. That is a deterministic constant
 * declared in the document, not a fetch or a clock, so every frame is still a pure function of
 * timeline time (the HyperFrames contract, rule 4).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildScreens } from './screens.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIDEO = resolve(HERE, '..');

/** Which hand-written scene covers which narration sections. The screens are one scene for
 *  the whole middle of the film, so the phone is a single object that never cuts away from
 *  itself; the sections inside it are beats, not mounts. */
const SCENES = [
  { id: 'hook', file: 'compositions/hook.html', sections: ['hook'] },
  { id: 'problem', file: 'compositions/problem.html', sections: ['problem'] },
  { id: 'intro', file: 'compositions/intro.html', sections: ['intro'] },
  { id: 'screens', file: 'compositions/screens.html', sections: ['create', 'commit', 'progress', 'goalday'] },
  { id: 'nim', file: 'compositions/nim.html', sections: ['nim'] },
  { id: 'close', file: 'compositions/close.html', sections: ['close'] },
];

const round = (value) => Math.round(value * 1000) / 1000;
const escapeHtml = (text) => text
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function main() {
  const narration = JSON.parse(await readFile(resolve(VIDEO, 'narration.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(resolve(VIDEO, 'assets/manifest.json'), 'utf8'));
  const section = (id) => {
    const found = narration.sections.find((entry) => entry.id === id);
    if (!found) throw new Error(`narration.json has no section "${id}"`);
    return found;
  };

  // Each scene's slot runs from the start of its first section to the start of the next
  // scene, so nothing ever goes blank between them (lint: subcomposition_blanks_before_host).
  const mounts = SCENES.map((scene, index) => {
    const start = section(scene.sections[0]).start;
    const next = SCENES[index + 1];
    const end = next ? section(next.sections[0]).start : narration.total;
    const beats = narration.lines
      .filter((line) => scene.sections.includes(line.section))
      .map((line) => round(line.start - start));
    const marks = Object.fromEntries(scene.sections
      .map((id) => [id, round(section(id).start - start)]));
    return { ...scene, start: round(start), duration: round(end - start), beats, marks };
  });
  // The film opens on the first scene, not on the lead-in's blank: pull scene one back to 0.
  mounts[0].duration = round(mounts[0].duration + mounts[0].start);
  mounts[0].start = 0;
  for (const mount of mounts) {
    if (mount.id !== mounts[0].id) continue;
    mount.beats = mount.beats.map((beat) => round(beat + narration.leadIn));
    mount.marks = Object.fromEntries(Object.entries(mount.marks)
      .map(([key, value]) => [key, round(value + narration.leadIn)]));
  }

  const beatsTable = Object.fromEntries(mounts.map((mount) =>
    [mount.id, { beats: mount.beats, marks: mount.marks, duration: mount.duration }]));

  const hosts = mounts.map((mount, index) => `      <div
        id="${mount.id}"
        data-composition-id="${mount.id}"
        data-composition-src="${mount.file}"
        data-track-kind="graphics"
        data-track-index="${index + 1}"
        data-start="${mount.start}"
        data-duration="${mount.duration}"
        data-width="1920"
        data-height="1080"
        style="z-index: ${index + 1}"
      ></div>`).join('\n');

  const root = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Squad Stake — demo</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      /* The app's own faces, self-hosted here as they are in packages/ui/fonts, so the video
         and the app draw identical glyphs (AGENTS.md "UI purity" 3). */
      @font-face { font-family: Mulish; src: url('assets/fonts/mulish-latin-300-normal.woff2') format('woff2'); font-weight: 300; font-style: normal; font-display: block; }
      @font-face { font-family: Mulish; src: url('assets/fonts/mulish-latin-400-normal.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: block; }
      @font-face { font-family: Mulish; src: url('assets/fonts/mulish-latin-600-normal.woff2') format('woff2'); font-weight: 600; font-style: normal; font-display: block; }
      @font-face { font-family: Mulish; src: url('assets/fonts/mulish-latin-700-normal.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: block; }
      @font-face { font-family: 'Fira Mono'; src: url('assets/fonts/fira-mono-latin-400-normal.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: block; }
      @font-face { font-family: 'Fira Mono'; src: url('assets/fonts/fira-mono-latin-500-normal.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: block; }

      :root {
        /* packages/ui/tokens.css: the app's ink and paper, and Nimiq's own hues where they
           carry meaning. The ground is warm paper rather than the app's flat white, because a
           1920-wide field of #fff behind a white phone loses the phone. */
        --ink: #0b0b0c;
        --paper: #ffffff;
        --ground: #f3efe8;
        --ground-deep: #e9e2d6;
        --muted: rgba(11, 11, 12, 0.62);
        --faint: rgba(11, 11, 12, 0.4);
        --hair: rgba(11, 11, 12, 0.12);
        --gold: #e9b213;
        --orange: #fc8702;
        --green: #21bca5;
        --blue: #0582ca;
        --red: #d94432;
        --font: Mulish, sans-serif;
        --mono: 'Fira Mono', monospace;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 1920px; height: 1080px; overflow: hidden;
        background: var(--ground);
        font-family: var(--font);
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      #root { width: 100%; height: 100%; position: relative; }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${narration.total}"
      data-width="1920"
      data-height="1080"
    >
${hosts}
      <div
        id="captions"
        data-composition-id="captions"
        data-composition-src="compositions/captions.html"
        data-track-kind="captions"
        data-track-index="20"
        data-start="0"
        data-duration="${narration.total}"
        data-width="1920"
        data-height="1080"
        style="z-index: 40"
      ></div>
      <audio
        id="narration"
        class="clip"
        src="assets/audio/narration.mp3"
        data-start="0"
        data-duration="${narration.total}"
        data-track-index="30"
        data-volume="1"
      ></audio>
      <audio
        id="music"
        class="clip"
        src="assets/audio/music.mp3"
        data-start="0"
        data-duration="${narration.total}"
        data-track-index="31"
        data-volume="1"
      ></audio>
    </div>
    <script>
      /* Sentence beats per scene, in seconds from that scene's own start, measured from the
         Kokoro narration (apps/video/narration.json). A constant, not a clock. */
      window.__SQUAD_BEATS = ${JSON.stringify(beatsTable, null, 2).replace(/\n/g, '\n      ')};
      window.__SQUAD_TAPS = ${JSON.stringify(manifest.taps, null, 2).replace(/\n/g, '\n      ')};
      const tl = gsap.timeline({ paused: true });
      /* The root holds only hosts and audio; every tween lives in the scene that owns it. */
      tl.to({}, { duration: ${narration.total} });
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  await writeFile(resolve(VIDEO, 'index.html'), root);

  // --- captions ----------------------------------------------------------------------------
  // One group on screen at a time. The lead-in and the hold are generous, but a group is
  // always off before the next one is on: an overlap of a fifth of a second puts two lines in
  // the same place, which `hyperframes check` reported as text hidden under an opaque element
  // and which on screen is simply two captions in a pile.
  const LEAD = 0.12;
  const HOLD = 0.1;
  const groups = narration.captions.map((caption, index, all) => {
    const start = round(Math.max(0, caption.start - LEAD));
    const next = all[index + 1];
    const ceiling = next ? next.start - LEAD - 0.04 : Infinity;
    const end = round(Math.max(start + 0.25, Math.min(caption.end + HOLD, ceiling)));
    return { ...caption, id: `cap-${index}`, start, end, duration: round(end - start) };
  });
  const captionMarkup = groups.map((group) => `    <div
      class="clip cap"
      id="${group.id}"
      data-start="${group.start}"
      data-duration="${group.duration}"
    ><span class="cap-text">${escapeHtml(group.text)}</span></div>`).join('\n');

  const captions = `<template>
  <style>
    /* Burned-in captions: judges often watch muted, so the words carry the film on their own.
       Inside the 80% title-safe box, one group visible at a time, each absolutely positioned
       so a hidden one cannot push the next one down (/hyperframes captions.md). */
    #root { position: absolute; inset: 0; pointer-events: none; }
    #root .cap {
      position: absolute;
      left: 0; right: 0; bottom: 74px;
      text-align: center;
      padding: 0 160px;
      opacity: 0;
      overflow: visible;
    }
    #root .cap-text {
      display: inline-block;
      font-family: Mulish, sans-serif;
      font-weight: 700;
      font-size: 42px;
      line-height: 1.24;
      letter-spacing: -0.012em;
      color: #0b0b0c;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 2px 28px rgba(11, 11, 12, 0.1);
      border-radius: 14px;
      padding: 10px 22px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
  </style>
  <div id="root" data-composition-id="captions" data-width="1920" data-height="1080">
${captionMarkup}
  </div>
  <script>
    (() => {
      const tl = gsap.timeline({ paused: true });
      const groups = ${JSON.stringify(groups.map(({ id, start, end }) => ({ id, start, end })))};
      for (const group of groups) {
        const node = "#" + group.id;
        tl.fromTo(node, { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.14, ease: "power3.out" }, group.start);
        tl.to(node, { opacity: 0, duration: 0.1, ease: "power2.in" }, group.end - 0.1);
        /* A hard kill, so a group can never be left on screen by a seek. */
        tl.set(node, { opacity: 0, visibility: "hidden" }, group.end);
        tl.set(node, { visibility: "visible" }, group.start - 0.001);
      }
      window.__timelines["captions"] = tl;
    })();
  </script>
</template>
`;
  await mkdir(resolve(VIDEO, 'compositions'), { recursive: true });
  await writeFile(resolve(VIDEO, 'compositions/captions.html'), captions);

  // --- the phone scene ---------------------------------------------------------------------
  // Generated, unlike its five hand-written neighbours, because every time in it is derived:
  // the beats from the measured narration, the cut points and the tap rings from the log the
  // capture wrote. scripts/screens.mjs holds the edit itself.
  const screensMount = mounts.find((mount) => mount.id === 'screens');
  const screens = buildScreens(screensMount, manifest);
  await writeFile(resolve(VIDEO, 'compositions/screens.html'), screens.html);

  // --- the vertical cut --------------------------------------------------------------------
  // The first minute, for X. Not a crop of the master: a 1080 x 1920 card that holds the
  // landscape film at full width with the caption band cropped off it, and re-sets the same
  // caption groups at a size that reads on a phone. The film itself is the rendered master,
  // played as one media clip, so the two cuts can never disagree about what happened.
  const VERT = { seconds: 60, filmTop: 700, filmW: 1080, filmH: 520 };
  const vertCaptions = groups.filter((group) => group.start < VERT.seconds);
  const vertMarkup = vertCaptions.map((group) => `      <div
        class="clip vcap"
        id="v-${group.id}"
        data-start="${group.start}"
        data-duration="${round(Math.min(group.duration, VERT.seconds - group.start))}"
      ><span>${escapeHtml(group.text)}</span></div>`).join('\n');

  const vertical = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Squad Stake — first minute, vertical</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: Mulish; src: url('assets/fonts/mulish-latin-600-normal.woff2') format('woff2'); font-weight: 600; font-style: normal; font-display: block; }
      @font-face { font-family: Mulish; src: url('assets/fonts/mulish-latin-700-normal.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: block; }
      @font-face { font-family: 'Fira Mono'; src: url('assets/fonts/fira-mono-latin-500-normal.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: block; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 1080px; height: 1920px; overflow: hidden;
        background: #f3efe8;
        -webkit-font-smoothing: antialiased;
      }
      #root { position: relative; width: 1080px; height: 1920px; }
      /* The master, at full width, with its own burned caption band cropped off the bottom:
         the film is 1080 x 607.5 scaled, and this window shows the top 520 of it. */
      #v-window {
        position: absolute; left: 0; top: ${VERT.filmTop}px;
        width: ${VERT.filmW}px; height: ${VERT.filmH}px;
        overflow: hidden;
        background: #f3efe8;
      }
      #v-film {
        position: absolute; left: 0; top: 0;
        width: ${VERT.filmW}px; height: 608px;
        object-fit: cover;
      }
      #v-lockup { position: absolute; left: 90px; top: 300px; width: 900px; }
      #v-lockup img { width: 900px; display: block; }
      #v-url {
        position: absolute; left: 0; right: 0; top: 1700px;
        text-align: center;
        font-family: 'Fira Mono', monospace; font-weight: 500; font-size: 40px;
        color: rgba(11, 11, 12, 0.62);
      }
      .vcap {
        position: absolute; left: 0; right: 0; top: ${VERT.filmTop + VERT.filmH + 90}px;
        padding: 0 70px;
        text-align: center;
        opacity: 0;
      }
      .vcap span {
        display: inline-block;
        font-family: Mulish, sans-serif; font-weight: 700; font-size: 58px;
        line-height: 1.22; letter-spacing: -0.014em; color: #0b0b0c;
        background: rgba(255, 255, 255, 0.94);
        border-radius: 18px;
        padding: 14px 26px;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="vertical"
      data-start="0"
      data-duration="${VERT.seconds}"
      data-width="1080"
      data-height="1920"
    >
      <div id="v-lockup"><img src="assets/brand/logo.svg" alt="Squad Stake" /></div>
      <div id="v-window">
        <video
          id="v-film"
          class="clip"
          src="assets/master.mp4"
          data-start="0"
          data-duration="${VERT.seconds}"
          data-media-start="0"
          data-has-audio="true"
          data-volume="1"
          data-track-index="1"
          playsinline
        ></video>
      </div>
${vertMarkup}
      <div id="v-url">squad-stake.vercel.app</div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const groups = ${JSON.stringify(vertCaptions.map(({ id, start, end }) => ({ id: `v-${id}`, start, end })))};
      for (const group of groups) {
        const node = "#" + group.id;
        tl.fromTo(node, { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.14, ease: "power3.out" }, group.start);
        tl.to(node, { opacity: 0, duration: 0.1, ease: "power2.in" },
          Math.max(group.start + 0.15, group.end - 0.1));
        tl.set(node, { opacity: 0, visibility: "hidden" }, group.end);
        tl.set(node, { visibility: "visible" }, Math.max(0, group.start - 0.001));
      }
      tl.to({}, { duration: ${VERT.seconds} }, 0);
      window.__timelines["vertical"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  await writeFile(resolve(VIDEO, 'compositions/vertical.html'), vertical);

  console.log(`index.html: ${mounts.length} scenes over ${narration.total}s`);
  for (const mount of mounts) {
    console.log(`  ${mount.id.padEnd(9)} ${String(mount.start).padStart(7)} → ` +
      `${String(round(mount.start + mount.duration)).padStart(7)}  ${mount.beats.length} beats`);
  }
  console.log(`compositions/captions.html: ${groups.length} groups`);
  console.log(`compositions/screens.html: ${screens.shots.length} cuts, ` +
    `${screens.taps.length} tap indicators`);
  console.log(`compositions/vertical.html: first ${VERT.seconds}s, ` +
    `${vertCaptions.length} caption groups`);
}

await main();
