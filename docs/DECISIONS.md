# Decisions
| Date | Decision | Why | Evidence |
|---|---|---|---|
| 2026-10-22 | Switch from Jolt to Squad Stake | Jolt: niche demand + external dependencies + untestable core for this builder | conversation; Jolt briefing |
| 2026-10-22 | Both modes A and B | builder choice | — |
| 2026-10-22 | Phone spikes S5–S8 replaced by NimJar peer evidence + source | NimJar ran the full cycle via Nimiq Pay on testnet and mainnet | REALITY_SPIKES |
| 2026-10-22 | Use `getBlockAfterReportingWindow`, never `getBlockAfterCollateralLockup` | the latter is not allowed on public RPC | S1 v2 |
| 2026-10-22 | Category Save | Cycle 3 examples list group savings jars under Save | IDEA_CHECK |
| 2026-10-22 | Stack Vite/React/TS + Vercel + Neon | builder preference (not Cloudflare) | — |
| 2026-10-22 | **Frontend → Next.js (App Router)**; API as Next route handlers on Vercel | builder preference | — |
| 2026-10-22 | Pure `packages/ui` shared by app and a Remotion video project | demo video must show the UI 100% identical without screen recording | AGENTS.md "UI purity" |
| 2026-10-22 | Never recreate Nimiq Pay's approval sheet in the video | it is Nimiq Pay's UI, not ours | — |
| 2026-10-22 | First sign-in binds a nonce to the browser; the verified signature identifies its wallet | `sign()` reveals its public key only after approval; pre-binding a client-claimed wallet would not establish identity | PRD §7.1, §11; S5; reference accounts/signing semantics |
| 2026-10-22 | Atomic challenge consume + session insert; 256-bit session tokens hashed with SHA-256; sessions expire in seven days | replay protection must survive concurrent serverless requests and storage failure | Q01, Q02; FAILURE_MODES concurrent updates |
| 2026-10-22 | Sign-in fixture states are synthetic and labelled; video remains an empty placeholder | no mainnet evidence exists yet; the requested scope is sign-in only | current build instruction; AGENTS.md never fabricate |
| 2026-11-06 | Build tool switched from Codex to Claude Code (CLAUDE.md imports AGENTS.md) | builder choice | CLAUDE.md |
| 2026-11-06 | Demo video uses hand-written sample data — a how-to walkthrough, not proof of usage | judges need to see how it works; usage proof is the mainnet run and evidence, not the video | PRD §13b; AGENTS.md "UI purity" 5 |
