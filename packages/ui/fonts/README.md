# Fonts

Self-hosted so the web app and the Remotion video render identical glyphs, and so no font is
fetched from a network at runtime (AGENTS.md "UI purity" 3).

Nimiq Pay's own `DESIGN.md` names both typefaces ("The Mulish-or-Mono Rule. Type in this product
is Mulish or Fira Mono. There is no third typeface."):

- **Mulish** — display 300, body 400, headline/title 600, label 700.
- **Fira Mono** — 400/500, for every balance, amount, address, hash and short code.

## Provenance

Latin-subset `woff2` files copied out of the npm tarballs on 2026-11-07, unmodified:

| File | Source package | Version | Published | URL |
|---|---|---|---|---|
| `mulish-latin-{300,400,600,700}-normal.woff2` | `@fontsource/mulish` | 5.3.0 | 2026-07-19 | `https://registry.npmjs.org/@fontsource/mulish/-/mulish-5.3.0.tgz` |
| `fira-mono-latin-{400,500}-normal.woff2` | `@fontsource/fira-mono` | 5.3.0 | 2026-07-19 | `https://registry.npmjs.org/@fontsource/fira-mono/-/fira-mono-5.3.0.tgz` |

Neither package is a dependency of this workspace: the six files are vendored, so `pnpm install`
and `scripts/check-dep-age.mjs` are unaffected.

SHA-256 of the files as committed:

```
8d1e753569ea7964a3beacda126450f8469b70c14c161ae8062cf4c12835e947  fira-mono-latin-400-normal.woff2
291f90e3f0baf1f357ece7b82634b8bcd6c080def7648694894548af3d28af26  fira-mono-latin-500-normal.woff2
cb5aae66adec00b4c131a182d2dff5b028773f4f09318e91c6b3a826a7e9ec04  mulish-latin-300-normal.woff2
95efc771d19900052b360dce91f4043b488b0df7335f7cabf0e03cb69b690027  mulish-latin-400-normal.woff2
af6728e0670b9d04ab39ed6ac03870da8992e8fa871525f65f8053741e4748e1  mulish-latin-600-normal.woff2
f3bfe7eca43b99826926cefbd1663105ce79031fb69435e0f8d20ef05b95bf10  mulish-latin-700-normal.woff2
```

## Licences

Both families are SIL Open Font License 1.1: `LICENSE-Mulish.txt`, `LICENSE-FiraMono.txt`
(verbatim from the same tarballs). Neither has a Reserved Font Name clause that the vendored,
unmodified files breach, and the CSS `font-family` uses the upstream names.

## History

Until 2026-11-07 this directory held `SquadSans-{Regular,Bold}.ttf`, which were Liberation Sans
renamed at the CSS level only. They were removed when the app took on Nimiq's own typography.
