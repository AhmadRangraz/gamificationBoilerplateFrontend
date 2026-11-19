# Verification and maintenance

Read `AGENTS.md` and `.ai/STATE.md` for implemented scope and observed outcomes.

```bash
cd /workspace/gamificationBoilerplateFrontend
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm contract:check
pnpm build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm test:e2e --workers=1
```

Regenerate a preset in an empty checkout, install frozen dependencies, wire a disposable PostgreSQL database, and run `pnpm db:migrate`, `pnpm forge seed`, and `pnpm build`. The CI matrix covers SaaS, Marketplace, Booking, Community, Learning and AI, with a second Marketplace variant for individual challenges. The verification fixture script configures advanced gamification after dependencies are installed. [Generated preset checks](../docs/TESTING.md)

Native installation is a separate headed Chromium check. The managed browser policy still blocks it. [PWA verification](../docs/PWA.md)

## Exact continuation prompt

> Read AGENTS.md, .ai/STATE.md and .ai/NEXT.md. Start from the verified M7 and M8 implementations and the recorded test matrix. For any new task, keep integrations local or mocked until requested, verify the affected preset and PostgreSQL invariants, and update the roadmap and all four .ai files with the observed results. Preserve the native PWA blocker until a browser profile that permits installation verifies it.

## Release follow-up

Verify the hosted release run for the commit being reviewed. Record the native result and artifact links. Continue M10 with local deployment smoke and database recovery tooling. [Release checks](../docs/TESTING.md#release-verification)
