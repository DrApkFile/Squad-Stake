/**
 * The phone scene: ninety-odd seconds of the real app inside one phone that never cuts away
 * from itself. Written out by compose.mjs because every time in it is derived — from the
 * measured narration, and from the tap log the capture wrote — rather than counted by hand.
 *
 * A cut names the beat it belongs to, not a clock reading, so re-speaking the script re-cuts
 * the film. `beat` is the index of a sentence within this scene (create 0–4, commit 5–8,
 * progress 9–12, goalday 13–15).
 *
 * `from` is where in the source clip the cut starts, in that clip's own seconds. Those numbers
 * come from the tap log printed by the capture, so they move with a re-record only if the app
 * itself changed; the generator checks every one against the clip's real length and fails loudly
 * rather than silently showing a black frame.
 */

/** The phone as the video draws it. 390 × 844 CSS pixels of app, at 1.041×. */
export const PHONE = { screenW: 406, screenH: 878, bezel: 13, x: 757, y: 26 };

/**
 * Where the camera looks, in the phone's own 390 x 844 space, so a push-in can be aimed at a
 * control by the coordinates the capture already logged.
 *
 * `scale` is a *dolly*, not a crop. Scaling the screen's own contents was tried first and is
 * wrong for this app: the screens run edge to edge inside a 16 px gutter, so a centred zoom of
 * `s` leaves only `390 / s` of width and every label on the left is beheaded -- "Total target
 * (NIM)" rendered as "tal target (NIM)" in the 2026-11-11 snapshot pass, and still clipped
 * after the cap was lowered to 1.22, because 390 / 1.22 = 320 px is narrower than the 358 px
 * the content occupies. No crop-zoom above 1.09 can show the whole row. So the camera moves
 * the *phone* instead: the body rests at 0.9 and dollies in to at most 1.26, the frame crops
 * the bezel top and bottom, and nothing inside the screen is ever cut off.
 *
 * `y` is the row the shot is about; the timeline brings it to the frame's reading centre and
 * clamps the result so the phone never slides under the caption band.
 */
const look = (scale, y) => ({ scale, y });

export const CUTS = [
  // --- create ---------------------------------------------------------------------------
  // b0 0.00–4.61  signing in is one signature
  { beat: 0, lead: 0, clip: 'app-welcome', from: 4.3,
    note: 'the entry screen: what Squad Stake is, and one control' },
  { beat: 0, lead: 2.8, clip: 'app-welcome', from: 7.1, camera: look(1.4, 760),
    note: 'the approval is away and the screen waits for it' },

  // b1 5.19–10.52  pick a quick start, set a goal day
  { beat: 1, lead: -0.29, clip: 'app-my-squads', from: 0.5,
    note: 'signed in, no squads yet — and Create squad is tapped' },
  { beat: 1, lead: 2.11, clip: 'app-create', from: 2.9, camera: look(1.5, 320),
    note: 'into the quick starts; Trip fills the name' },

  // b2 11.10–14.33 together goals · b3 14.91–18.96 shared goal, recipient fixed up front
  // One continuous take across both: the `from` of each cut carries on from the one before,
  // so the form is filled in in real time and only the camera cuts.
  { beat: 2, lead: -0.4, clip: 'app-create', from: 6.1, camera: look(1.38, 430),
    note: 'both modes, side by side' },
  { beat: 2, lead: 2.2, clip: 'app-create', from: 8.9, camera: look(1.46, 430),
    note: 'shared goal chosen, and the total typed' },
  { beat: 3, lead: 1.29, clip: 'app-create', from: 12.0, camera: look(1.42, 470),
    note: 'the recipient, pasted unspaced, and the form finished' },

  // b4 19.54–21.25 share one invite link
  { beat: 4, lead: -0.04, clip: 'app-create', from: 15.5,
    note: 'created; the link goes out through the phone\'s own share sheet' },

  // --- commit ---------------------------------------------------------------------------
  // b5 22.83–25.97 friends open the link, sign in, commit
  { beat: 5, lead: -0.53, clip: 'app-invite', from: 0.5,
    note: 'the invite as a friend first meets it' },
  { beat: 5, lead: 2.47, approval: 'Signed in',
    note: 'the first approval moment — never a recreation of Nimiq Pay\'s sheet' },

  // b6 26.56–36.78 not staking yet → the pool, its name and fee, before Nimiq Pay asks
  { beat: 6, lead: 0.74, clip: 'app-commit', from: 0.6,
    note: 'the commit sheet, with the share it suggests' },
  { beat: 6, lead: 4.44, clip: 'app-commit', from: 4.6, camera: look(1.48, 640),
    note: 'into the pool: its name, its fee, and why this one' },
  // Held on the real card rather than on the `pool-restake` fixture, which was here first:
  // back to back they showed two different pools ("Not-A-Pool, 11% fee" from the live
  // Validators API, then "Sample Restake Pool, 5% fee"), which reads as a continuity error.
  // The sheet is motionless from 3 s on, so this window is a still of the running app.
  { beat: 6, lead: 8.44, clip: 'app-commit', from: 7.55, camera: look(1.42, 600),
    note: 'the same card, held still — the real one' },

  // b7 37.36–39.33 the stake never leaves their wallet
  { beat: 7, lead: -0.4, still: 'scene-commit-waiting',
    note: 'waiting for an approval this app cannot give itself' },
  { beat: 7, lead: 1.2, approval: 'Approved in Nimiq Pay' },

  // b8 39.91–45.46 a commitment only counts once executed and final
  { beat: 8, lead: 0.69, still: 'scene-tx-status-pending', camera: look(1.38, 400),
    note: 'a hash is not success: confirmations' },
  { beat: 8, lead: 3.09, still: 'scene-tx-status-done', camera: look(1.38, 400),
    note: 'executed and final' },
  { beat: 8, lead: 5.39, still: 'scene-commit-committed',
    note: 'only now is it committed' },

  // --- progress --------------------------------------------------------------------------
  // b9 47.04–49.23 honest progress
  { beat: 9, lead: -0.5, clip: 'app-squad', from: 0.3,
    note: 'the squad page, every figure of it read from the chain' },

  // b10 49.81–57.50 every status comes from a chain read, with its age beside it
  { beat: 10, lead: -0.4, clip: 'app-squad', from: 3.1, camera: look(1.42, 560),
    note: 'into the member list: Saved, Leaving, and how old each read is' },
  { beat: 10, lead: 2.6, clip: 'app-squad', from: 6.3, camera: look(1.28, 620),
    // Not "and the ages reset": the read is 60 s cached, so Refresh often hands back the
    // same read with its real age. Showing that is the point — the page never invents a
    // fresher number than it has.
    note: 'Refresh, and the age it reports is the age it has' },
  { beat: 10, lead: 5.2, still: 'scene-squad-page-every-stage', camera: look(1.34, 430),
    note: 'every stage a share can be in, on one page' },

  // b11 58.08–60.22 nobody sees anyone else's balance
  { beat: 11, lead: -0.3, still: 'scene-squad-page-every-stage', camera: look(1.5, 640),
    note: 'statuses and committed amounts — never a balance' },

  // b12 60.81–64.69 the public proof page
  { beat: 12, lead: -0.5, clip: 'app-proof', from: 0.3,
    note: 'the public proof page, signed out' },
  { beat: 12, lead: 2.19, clip: 'app-proof', from: 3.3, camera: look(1.36, 520),
    note: 'the addresses and the reads anyone can repeat' },

  // --- goal day ---------------------------------------------------------------------------
  // b13 66.27–73.75 unstaking takes 12–24 h, so the app names the day
  { beat: 13, lead: -0.6, still: 'scene-squad-page-leave-by', camera: look(1.42, 420),
    note: 'start leaving by …' },
  { beat: 13, lead: 2.8, still: 'scene-leaving-countdown', camera: look(1.34, 430),
    note: 'the countdown the chain decides, not a guess' },

  // b14 74.33–76.18 three approvals bring the NIM back
  { beat: 14, lead: -0.5, still: 'scene-leaving-start', note: 'step one' },
  { beat: 14, lead: 0.5, approval: 'Approved in Nimiq Pay' },
  { beat: 14, lead: 2.25, still: 'scene-leaving-retired', note: 'step three, once the chain releases it' },
  { beat: 14, lead: 3.2, still: 'scene-leaving-withdrawn-shared-goal',
    note: 'back in the wallet it never left' },

  // b15 76.77–81.74 each share is paid to the recipient, and verified
  { beat: 15, lead: 2.16, still: 'scene-pay-ready', note: 'pay my share' },
  { beat: 15, lead: 3.66, still: 'scene-pay-paid-squad-complete',
    note: 'the recipient paid, every share verified, the squad complete' },
];

const round = (value) => Math.round(value * 1000) / 1000;

/**
 * @param {{ beats: number[], duration: number }} scene
 * @param {{ clips: Record<string, {src: string, seconds: number}>, stills: Record<string, string>,
 *           taps: Record<string, {at: number, x: number, y: number, label: string}[]> }} manifest
 */
export function buildScreens(scene, manifest) {
  const problems = [];
  const shots = CUTS.map((cut, index) => {
    const beat = scene.beats[cut.beat];
    if (beat === undefined) problems.push(`cut ${index}: this scene has no beat ${cut.beat}`);
    return { ...cut, index, start: round((beat ?? 0) + cut.lead) };
  }).sort((a, b) => a.start - b.start);

  for (const [index, shot] of shots.entries()) {
    const next = shots[index + 1];
    // A shot runs until the next one takes over, plus a sliver so the crossfade has something
    // to cross from. The last one runs to the end of the scene.
    shot.end = round(next ? next.start + 0.24 : scene.duration);
    shot.duration = round(shot.end - shot.start);
    if (shot.duration <= 0.2) problems.push(`cut ${shot.index} (${shot.note ?? shot.approval}) is ${shot.duration}s long`);
    if (shot.approval) {
      // A card nobody can finish reading is worse than no card: HyperFrames' own floor is
      // half a second plus three tenths a word (/hyperframes look.md, `line_unread`).
      const floor = 0.5 + 0.3 * shot.approval.trim().split(/\s+/).length;
      if (shot.duration < floor) {
        problems.push(`cut ${shot.index}: "${shot.approval}" holds ${shot.duration}s, ` +
          `under its ${round(floor)}s reading floor`);
      }
    }
    if (shot.clip) {
      const clip = manifest.clips[shot.clip];
      if (!clip) { problems.push(`cut ${shot.index}: no clip "${shot.clip}" was captured`); continue; }
      const room = clip.seconds - shot.from;
      if (room < shot.duration - 0.05) {
        problems.push(`cut ${shot.index}: ${shot.clip} has ${round(room)}s left from ${shot.from}s, ` +
          `but the cut needs ${shot.duration}s`);
      }
      shot.src = clip.src;
    }
    if (shot.still && !manifest.stills[shot.still]) {
      problems.push(`cut ${shot.index}: no still "${shot.still}" was captured`);
    }
    if (shot.still) shot.src = manifest.stills[shot.still];
  }
  /* An approval used to show a *blank* phone: no media shot is lit during that cut, so the
     scrim dimmed an empty screen and the card floated over grey (seen at 90 s in the
     2026-11-11 render). The screen a member approved from is what should be behind the card,
     so each approval carries the previous shot forward as a backdrop under the scrim. A still
     simply holds; a clip continues from where the shot before it finished, pulled back if the
     footage would run out. No tap is drawn on a backdrop — the finger has left the screen. */
  for (const [index, shot] of shots.entries()) {
    if (!shot.approval) continue;
    const before = shots[index - 1];
    if (!before?.src) continue;
    let from = 0;
    if (before.clip) {
      const seconds = manifest.clips[before.clip]?.seconds ?? 0;
      from = Math.max(0, Math.min(before.from + before.duration - 0.24, seconds - shot.duration));
    }
    shot.backdrop = { src: before.src, clip: Boolean(before.clip), from: round(from) };
  }

  if (problems.length > 0) {
    throw new Error(`the screen edit does not fit its footage:\n  - ${problems.join('\n  - ')}`);
  }

  // --- taps ---------------------------------------------------------------------------------
  // A tap is drawn where the finger was, at the moment it happened: the capture logged both in
  // the phone's own 390 × 844 space, so the ring lands on the control and not near it.
  const taps = [];
  for (const shot of shots) {
    if (!shot.clip) continue;
    for (const tap of manifest.taps[shot.clip] ?? []) {
      const within = tap.at - shot.from;
      if (within < 0.05 || within > shot.duration - 0.1) continue;
      taps.push({
        id: `screens-tap-${taps.length}`,
        at: round(shot.start + within),
        x: round(tap.x * (PHONE.screenW / 390)),
        y: round(tap.y * (PHONE.screenH / 844)),
        label: tap.label,
      });
    }
  }

  const backdrops = shots.filter((shot) => shot.backdrop).map((shot) => {
    const { src, clip, from } = shot.backdrop;
    const common = `id="screens-under-${shot.index}" class="clip shot" ` +
      `data-start="${shot.start}" data-duration="${shot.duration}" data-track-index="2" ` +
      `style="z-index: ${shot.index + 1}"`;
    return clip
      ? `      <video ${common} src="${src}" data-media-start="${from}" muted playsinline></video>`
      : `      <img ${common} src="${src}" alt="" />`;
  }).join('\n');

  const media = shots.filter((shot) => shot.src).map((shot) => {
    const id = `screens-shot-${shot.index}`;
    const common = `id="${id}" class="clip shot" data-start="${shot.start}" ` +
      `data-duration="${shot.duration}" data-track-index="2" style="z-index: ${shot.index + 2}"`;
    const comment = `      <!-- ${shot.note ?? ''} -->`;
    return shot.clip
      ? `${comment}\n      <video ${common} src="${shot.src}" data-media-start="${shot.from}" muted playsinline></video>`
      : `${comment}\n      <img ${common} src="${shot.src}" alt="" />`;
  }).join('\n');

  const approvals = shots.filter((shot) => shot.approval).map((shot) => `      <div
        id="screens-approval-${shot.index}" class="clip approval"
        data-start="${shot.start}" data-duration="${shot.duration}" data-track-index="4"
        style="z-index: 70"
      ><span class="approval-tick"></span><span class="approval-text">${shot.approval}</span></div>`).join('\n');

  const tapMarkup = taps.map((tap) => `      <span id="${tap.id}" class="tap"
        style="left: ${tap.x}px; top: ${tap.y}px"><i></i></span>`).join('\n');

  const timeline = JSON.stringify(shots.map((shot) => ({
    index: shot.index, start: shot.start, end: shot.end, duration: shot.duration,
    kind: shot.approval ? 'approval' : 'media',
    under: Boolean(shot.backdrop),
    camera: shot.camera ?? null,
  })));

  return { html: template({ media, backdrops, approvals, tapMarkup, timeline, taps }), shots, taps };
}

function template({ media, backdrops, approvals, tapMarkup, timeline, taps }) {
  const screenW = PHONE.screenW;
  const screenH = PHONE.screenH;
  const bodyW = screenW + PHONE.bezel * 2;
  const bodyH = screenH + PHONE.bezel * 2;
  return `<template>
  <style>
    /* GENERATED by scripts/compose.mjs from the measured narration and the capture's tap log.
       Edit scripts/screens.mjs — the cut list — rather than this file, or re-running the
       pipeline will overwrite the change.

       One phone, held for the whole middle of the film, with the real app playing inside it.
       Everything that moves is a tween on a wrapper: the media themselves are never
       transformed (/hyperframes motion.md, "The right mechanism"). */
    #root { position: absolute; inset: 0; overflow: hidden; }

    #root .stage { position: absolute; inset: 0; }
    #root .phone {
      position: absolute;
      left: ${PHONE.x - PHONE.bezel}px; top: ${PHONE.y - PHONE.bezel}px;
      width: ${bodyW}px; height: ${bodyH}px;
      border-radius: ${PHONE.bezel + 42}px;
      background: #0b0b0c;
      box-shadow: 0 44px 90px rgba(11, 11, 12, 0.22), 0 6px 18px rgba(11, 11, 12, 0.1);
    }
    #root .screen {
      position: absolute;
      left: ${PHONE.bezel}px; top: ${PHONE.bezel}px;
      width: ${screenW}px; height: ${screenH}px;
      border-radius: 42px;
      overflow: hidden;
      background: #ffffff;
    }
    /* The camera moves the phone, not the picture inside it (see the look helper above):
       cropping the screen's own contents beheads the left-hand labels of an app that runs
       edge to edge in a 16 px gutter. The origin is the phone body's own centre. */
    #root .dolly {
      position: absolute; inset: 0;
      transform-origin: ${PHONE.x + PHONE.screenW / 2}px ${PHONE.y + PHONE.screenH / 2}px;
    }
    #root .camera { position: absolute; inset: 0; }
    #root .shot {
      position: absolute; left: 0; top: 0;
      width: ${screenW}px; height: ${screenH}px;
      object-fit: cover;
      opacity: 0;
    }

    /* A finger, drawn where the capture logged one: a soft disc with a ring leaving it. */
    #root .tap {
      position: absolute;
      width: 0; height: 0;
      opacity: 0;
      pointer-events: none;
      z-index: 25;
    }
    #root .tap::before {
      content: "";
      position: absolute; left: -27px; top: -27px;
      width: 54px; height: 54px;
      border-radius: 50%;
      background: rgba(11, 11, 12, 0.18);
      box-shadow: 0 0 0 1px rgba(11, 11, 12, 0.1);
    }
    #root .tap i {
      position: absolute; left: -27px; top: -27px;
      width: 54px; height: 54px;
      border-radius: 50%;
      border: 3px solid rgba(11, 11, 12, 0.45);
      display: block;
    }

    /* The approval moment. Nimiq Pay's own sheet is never recreated (AGENTS.md "UI purity" 8):
       this is a neutral card of ours, over a dimmed screen. */
    #root .approval {
      position: absolute;
      left: ${PHONE.x - 40}px; top: ${PHONE.y + 300}px;
      width: ${screenW + 80}px;
      padding: 34px 0;
      border-radius: 30px;
      background: rgba(255, 255, 255, 0.97);
      box-shadow: 0 30px 70px rgba(11, 11, 12, 0.22);
      text-align: center;
      opacity: 0;
      z-index: 70;
    }
    #root .approval-tick {
      display: block;
      width: 72px; height: 72px; margin: 0 auto 18px;
      border-radius: 50%;
      background: var(--green);
      position: relative;
    }
    #root .approval-tick::after {
      content: "";
      position: absolute; left: 24px; top: 18px;
      width: 20px; height: 34px;
      border: solid #ffffff; border-width: 0 5px 5px 0;
      transform: rotate(45deg);
      transform-origin: 50% 50%;
    }
    #root .approval-text {
      font-family: Mulish, sans-serif; font-weight: 700; font-size: 38px;
      letter-spacing: -0.018em; color: var(--ink);
    }
    #root .scrim {
      position: absolute;
      left: ${PHONE.x}px; top: ${PHONE.y}px;
      width: ${screenW}px; height: ${screenH}px;
      border-radius: 42px;
      background: rgba(11, 11, 12, 0.34);
      opacity: 0;
      /* Above every shot: the shots are numbered from 2 upwards, so a late cut's z-index would
         otherwise climb over the dim that is supposed to cover it. */
      z-index: 60;
    }

    /* Sample data, labelled for the whole time the app is on screen (AGENTS.md "Never
       fabricate"). It sits in the empty column beside the phone rather than under it: the
       bottom of the frame belongs to the captions, and a label there overlapped them. */
    #root .sample {
      position: absolute; left: 120px; top: 120px;
      width: 420px;
      text-align: left;
      opacity: 0;
    }
    #root .sample span {
      display: inline-block;
      padding: 9px 20px;
      border-radius: 999px;
      background: rgba(11, 11, 12, 0.07);
      font-family: Mulish, sans-serif; font-weight: 700; font-size: 29px;
      letter-spacing: 0.08em; text-transform: uppercase;
      /* --faint measured 2.6:1 here, under the 3:1 floor. A label that says the data is a
         sample has to be legible, or it is not a label. */
      color: var(--muted);
    }
  </style>

  <div id="root" data-composition-id="screens" data-width="1920" data-height="1080">
    <div class="stage" id="screens-stage">
      <div class="dolly" id="screens-dolly">
        <!-- The body is cropped by the frame on purpose when the camera dollies in: that is
             what lets the screen itself never be cropped. Declared, so the layout check
             reads it as a camera move rather than a panel that escaped its canvas. -->
        <div class="phone" id="screens-phone" data-layout-allow-overflow>
          <div class="screen">
            <div class="camera" id="screens-camera">
${media}
${backdrops}
${tapMarkup}
            </div>
          </div>
        </div>
        <div class="scrim" id="screens-scrim"></div>
      </div>
${approvals}
      <div class="sample" id="screens-sample">
        <span>Sample squad &middot; demo data</span>
      </div>
    </div>
  </div>

  <script>
    (() => {
      const scene = window.__SQUAD_BEATS.screens;
      const shots = ${timeline};
      const taps = ${JSON.stringify(taps)};
      const tl = gsap.timeline({ paused: true });

      /* The phone rests a little back so a push-in has somewhere to go. 1.3 x 904 px of body
         is 1175 px in a 1080 px frame, so the bezel is cropped and the screen never is.

         The body stands on a baseline just above the caption band and stays there: a 904 px
         phone in a 1080 px frame has 176 px of slack, so a dolly that also panned to the row
         would leave a visible gap under the phone (it did, at 112 s in the 2026-11-11 pass).
         The camera's y therefore aims the shot only as far as that slack allows; what actually
         puts the right rows on screen is the capture, which is already scrolled to them. */
      const REST = 0.96;
      const MAX_DOLLY = 1.3;
      const PHONE_CY = ${PHONE.y + PHONE.screenH / 2};
      const PHONE_HALF = ${PHONE.screenH / 2 + PHONE.bezel};
      const AIM_Y = 470;        // the frame's reading centre, above the caption band
      const BOTTOM_MAX = 918;   // the body may not come below this: the captions live there
      const BOTTOM_MIN = 898;   // nor rise off its baseline and leave a gap under itself
      tl.set("#screens-dolly",
        { scale: REST, y: BOTTOM_MAX - PHONE_CY - PHONE_HALF * REST }, 0);

      /* The phone rises into the frame as the intro's graphics lift out of it. */
      tl.fromTo("#screens-phone", { y: 150, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.72, ease: "power3.out" }, 0);
      tl.fromTo("#screens-sample", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.6);

      /* Each shot blurs in over the one before it on the same stage: the ground never cuts,
         which is what keeps ninety seconds of screens from reading as a slideshow. */
      for (const shot of shots) {
        if (shot.kind === "approval") {
          const card = "#screens-approval-" + shot.index;
          if (shot.under) {
            /* The screen it was approved from, held under the scrim rather than a blank phone. */
            const under = "#screens-under-" + shot.index;
            tl.fromTo(under, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" },
              shot.start);
            tl.set(under, { opacity: 0, visibility: "hidden" }, shot.end);
            tl.set(under, { visibility: "visible" }, shot.start - 0.001);
          }
          tl.fromTo(card, { opacity: 0, y: 44, scale: 0.94 },
            { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(1.5)" }, shot.start);
          tl.to("#screens-scrim", { opacity: 1, duration: 0.22, ease: "power2.out" }, shot.start);
          tl.to(card, { opacity: 0, y: -18, duration: 0.2, ease: "power2.in" }, shot.end - 0.26);
          tl.to("#screens-scrim", { opacity: 0, duration: 0.2, ease: "power2.in" }, shot.end - 0.26);
          continue;
        }
        const node = "#screens-shot-" + shot.index;
        tl.fromTo(node, { opacity: 0, filter: "blur(7px)" },
          { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "power2.out" }, shot.start);
        tl.set(node, { opacity: 0, visibility: "hidden" }, shot.end);
        tl.set(node, { visibility: "visible" }, shot.start - 0.001);

        /* The camera: fast in, slow to settle, then dead still until the next shot wants it.
           It dollies the phone body; nothing inside the screen is ever cropped. */
        const camera = shot.camera || { scale: 1, y: 422 };
        const scale = Math.min(MAX_DOLLY, Math.max(REST, REST * camera.scale));
        const rowY = ${PHONE.y} + camera.y * (${screenH} / 844);
        /* Bring the row the shot is about to the frame's reading centre, then refuse to let
           the body slide under the caption band or lift off the top of the frame. */
        const wanted = AIM_Y - (PHONE_CY + (rowY - PHONE_CY) * scale);
        const highest = BOTTOM_MAX - PHONE_CY - PHONE_HALF * scale;
        const lowest = BOTTOM_MIN - PHONE_CY - PHONE_HALF * scale;
        const y = Math.max(lowest, Math.min(highest, wanted));
        tl.to("#screens-dolly",
          { scale, y, duration: 0.62, ease: "power3.out" }, shot.start);
      }

      /* Taps: the disc lands, the ring leaves. One arrival, one exit, nothing repeating. */
      for (const tap of taps) {
        const node = "#" + tap.id;
        tl.fromTo(node, { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: 0.12, ease: "power3.out" }, tap.at - 0.08);
        tl.fromTo(node + " i", { scale: 1, opacity: 0.9 },
          { scale: 2.5, opacity: 0, duration: 0.5, ease: "power2.out" }, tap.at);
        tl.to(node, { opacity: 0, duration: 0.14, ease: "power2.in" }, tap.at + 0.26);
      }

      /* Out, into the closing graphics. */
      const out = scene.duration - 0.5;
      tl.to("#screens-stage", { opacity: 0, y: -60, duration: 0.4, ease: "power3.in" }, out);

      window.__timelines["screens"] = tl;
    })();
  </script>
</template>
`;
}
