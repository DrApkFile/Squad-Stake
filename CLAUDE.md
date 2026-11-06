@AGENTS.md
@docs/PROGRESS.md

## Claude Code
- Use plan mode for any change to the protected critical path listed in briefing/BUILD_CONTRACT.md.
- Workflow per slice: build → run `pnpm gate` → update docs/PROGRESS.md → stop. The human commits; never run git commit or push.
- Report only commands you actually ran and their real output. If something could not run, say so.
- Install packages only at exact versions published at least 14 days ago (scripts/check-dep-age.mjs).
