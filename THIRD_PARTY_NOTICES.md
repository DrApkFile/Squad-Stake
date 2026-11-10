# Third-party notices

Squad Stake is MIT licensed (`LICENSE`). This file lists everything in the repository that is
someone else's work, as the competition's eligibility gate A10 asks (`briefing/EVENT.md`).

## Runtime dependencies

Exact pins, no ranges. Every one is checked by `scripts/check-dep-age.mjs`
(`pnpm deps:check`), which also records the publication dates in `.cache/dependency-ages.json`.

| Package | Version | Licence | Used for |
|---|---|---|---|
| `next` | 15.5.27 | MIT | the web app and its route handlers |
| `react`, `react-dom` | 19.2.8 | MIT | the UI |
| `@nimiq/mini-app-sdk` | 0.2.4 | MIT | the Nimiq Pay provider (client only) |
| `@nimiq/core` | 2.22.0 | Apache-2.0 | signature verification and address derivation (server only) |
| `@nimiq/identicons` | 1.6.2 | ISC | member identicons, generated on the server |
| `postgres` | 3.4.7 | Unlicense | the Postgres client |
| `zod` | 4.1.11 | MIT | every external input is parsed with it |
| `server-only` | 0.0.1 | MIT | marks server-only modules |

Development only: `typescript` 5.9.2 (Apache-2.0), `eslint` 9.36.0 and `@eslint/js`
(MIT), `typescript-eslint` 8.44.1 (MIT), `@next/eslint-plugin-next` 15.5.27 (MIT),
`tsx` 4.20.5 (MIT), `@types/node`, `@types/react`, `@types/react-dom` (MIT, DefinitelyTyped).

Every licence name above was read out of that package's own `package.json` in the installed
tree on 2026-11-09, not taken from memory; the full texts ship inside each package under
`node_modules`. The resolved transitive tree is pinned by `pnpm-lock.yaml`.

## Fonts, vendored into this repository

Two typefaces are **self-hosted** (`packages/ui/fonts/`) so the app and the demo video render
identical glyphs and no font is fetched at runtime:

- **Mulish** — SIL Open Font License 1.1 — `packages/ui/fonts/LICENSE-Mulish.txt`
- **Fira Mono** — SIL Open Font License 1.1 — `packages/ui/fonts/LICENSE-FiraMono.txt`

The six `.woff2` files were copied unmodified out of the `@fontsource/mulish` and
`@fontsource/fira-mono` 5.3.0 npm tarballs; `packages/ui/fonts/README.md` records the exact
URLs, the dates and a SHA-256 for every file. Neither package is a dependency of the workspace.

`packages/ui/brand/wordmark.ts` contains the words "Squad Stake" as **outline paths generated
from the Mulish 700 file above** by `scripts/build-wordmark.mjs`. It is derived from an
OFL-licensed font; the OFL permits this, and the generated file carries the SHA-256 of the font
it was generated from so the derivation stays checkable.

## Data read at runtime, not bundled

- **Nimiq public RPC nodes** — `rpc.nimiqwatch.com` / `rpc.testnet.nimiqwatch.com`. Every chain
  read, including the one the public proof page prints so a reader can repeat it.
- **Nimiq Validators API** — `github.com/nimiq/validators-api`, Nimiq's own service, for a
  pool's name, fee and payout type (PRD §7.7). Quoted with file and line in
  `apps/web/src/server/lib/pool-directory.ts`.
- **CoinGecko** — keyless `simple/price` endpoint for the optional fiat estimate (PRD §9.11).
  Named on screen as the source, with the price's age, and nothing is shown if it fails.

Recorded responses from all three live in `tests/fixtures/`, unmodified, with the date each was
recorded (`tests/fixtures/rpc/README.md`, `tests/fixtures/http/README.md`).

## Not third-party

The logo, the app icon and every screen in `packages/ui` are original to this project. The logo
borrows **no shape** from Nimiq — the hexagon is Nimiq's — and only its colours, which are
Nimiq's published brand values, cited with their source and retrieval date in the header of
`packages/ui/tokens.css`. Nimiq Pay's own approval sheet is never recreated anywhere in this app.
