# Progress handoff — 2026-10-23

## Done and verified
- Workspace and signature-based sign-in slice are implemented; complete P0 is not.
- Next.js web app, pure shared UI, self-hosted fonts and five sign-in fixture scenes.
- `apps/video` is a placeholder; no Remotion implementation or live deployment yet.
- Sign-in: one wallet approval, official Nimiq digest, browser-bound five-minute
  single-use challenge, address derived from verified public key, hashed sessions.
- Q01: replay, expiry, wrong key, tampering, browser binding and origin guards pass.
- Q02: derived identity, strict client boundary and secure session cookie tests pass.
- Q16: dev identities, mock switches and `/scenes` refused in production artifacts.
  No mock chain provider is implemented yet.
- Q17: purity lint and deterministic rendering of all five sign-in scenes pass.
- Full `npx pnpm@10.18.3 gate` exited 0: typecheck, lint, 11 unit tests,
  5 adversarial tests, Next build, production artifact guards, secret scan,
  dependency-age check and tracked-file diff check. No skipped tests.
- All 18 external pins across 5 manifests are exact and at least 14 days old.
  Evidence: `.cache/dependency-ages.json`; workspace links have no registry age.
- Build leaves `apps/web/tsconfig.json` byte-for-byte unchanged (compared before/after).

## Environment and commands
- Codex needs network access enabled for installs and registry age verification.
- `.npmrc` puts caches inside this project: `.npm-cache`, `.pnpm-cache`, `.pnpm-store`.
  Paths are absolute; update them if the checkout moves.
- Pinned pnpm is 10.18.3; if installed pnpm differs, use `npx pnpm@10.18.3`
  for every pnpm command, including install and gate. Observed installed pnpm: 12.15.0.
- Noninteractive install used `CI=true npx pnpm@10.18.3 install --no-frozen-lockfile`;
  installed `@next/eslint-plugin-next@15.5.27` and refreshed `pnpm-lock.yaml`.
- Gate order: typecheck → lint → test → test:adversarial → build → test:production
  → secrets → deps:check → check:tracked.
- `check:tracked` runs `git diff --exit-code && git diff --cached --exit-code`.
  It requires clean tracked files and does not detect untracked files. At verification,
  only `.gitignore` and `.npmrc` were tracked; project files remain untracked.

## Gotchas resolved
- Read-only home caches blocked tools; project-local caches avoid those writes.
- pnpm refused node_modules recreation without a TTY; `CI=true` resolved it.
- Next plugin detection needed global registration; rules remain scoped to web files.
  Absolute ESLint rootDir now works from both repository root and `apps/web`.
- Downloaded npm cache content triggered secret scanning and added foreign manifests
  to age checks; both scanners now exclude npm/pnpm caches, like node_modules/store.
  Source secret rejection was separately verified; UI purity rules were not weakened.
- README's final scaffolding/network limitation paragraph is stale: install, lockfile
  and full gate are now verified. DB migration and real-phone verification remain open.

## Next slice
- Chain reader and member status: PRD §7.3–7.4; tests Q04–Q07 first.
- Server-only RPC adapter: positional params with explicit nulls, strict parsing,
  bounded calls, 60 s cache, read timestamps; never accept client balances/statuses.
- Q04 BACKED/SHORT from staker records; Q05 staker RPC "Internal error" → NOT_STAKING.
- Q06 release = getBlockAfterReportingWindow(getElectionBlockAfter(b));
  Q07 jailed validator uses max(window release, getBlockAfterJail(jailedFrom)).
