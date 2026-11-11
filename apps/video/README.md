# apps/video — the demo video

HyperFrames (HTML + GSAP, seeked frame by frame) rather than Remotion; the reason is in
`docs/DECISIONS.md`, 2026-11-11. Nothing here is imported by the app, and the whole pipeline is
reproducible from this repository plus a local database.

```
pnpm video:render        # record -> narrate -> assets -> audio -> compose -> render
```

Or one stage at a time, from the repository root:

| Command | What it does |
|---|---|
| `pnpm --filter @squad-stake/video record` | empties the local database, then drives the **real app** in headless Chromium at 390 × 844: clips, 3× stills, a tap log, and `assets/` |
| `pnpm --filter @squad-stake/video narrate` | Kokoro-82M, one WAV per sentence, and the measured timing in `narration.json` |
| `pnpm --filter @squad-stake/video audio` | the narration bed, the music ducked under it, and a reference mix |
| `pnpm --filter @squad-stake/video compose` | writes `index.html`, `compositions/captions.html`, `compositions/screens.html` and `compositions/vertical.html` |
| `pnpm --filter @squad-stake/video check` | `hyperframes check` — the composition contract |
| `pnpm --filter @squad-stake/video render` | 1920 × 1080, 30 fps, H.264 + AAC → `out/squad-stake-demo.mp4`, the 1080 × 1920 first-minute cut, `out/poster.jpg` and a still every 5 s |

## The camera

The phone is one element held for the whole middle of the film, and the camera **dollies
the body** rather than scaling the picture inside it. That is not a style choice: the app's
screens run edge to edge inside a 16 px gutter, so a centred crop-zoom of `s` shows only
`390 / s` of width and anything above about 1.09 beheads the left-hand labels. The body
rests at 0.96 and pushes in to at most 1.3; the 1080 px frame crops the bezel, never the
screen, and the overflow is declared with `data-layout-allow-overflow` so the layout check
reads it as a camera move.

## What is recorded and what is a fixture

The create, commit, squad-page and proof screens are the **running app**: a local Postgres
cluster, live Nimiq testnet reads, the dev identities, and a squad seated with two addresses
that really are stakers on testnet — so "Saved", "Leaving" and the age of each read in the
video were derived from the chain, not written into a mock.

The states that need a wallet approval to reach — an approval in flight, confirmations, the
leaving countdown, a retired stake, a paid roster — are the app's own fixture scenes from
`packages/ui/scenes/demo/`, which are the same components the app renders. Every squad, name
and amount in them is **hand-written sample data**, labelled on screen.

Nimiq Pay's approval sheet is never recreated (AGENTS.md "UI purity" 8): each approval is a
neutral card of ours.

## Requirements

Node ≥ 22, FFmpeg, and a local database (see `docs/PROGRESS.md`, "To run it against a
database"). Kokoro runs locally from `.venv`; `HYPERFRAMES_PYTHON` must point at it.

Generated media is **not** in git (`.gitignore`); `out/poster.jpg` is the one exception.
