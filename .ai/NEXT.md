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

The hosted headed Chromium check verified native installation. The managed local browser policy still blocks it here. [PWA verification](../docs/PWA.md)

## Exact continuation prompt

> Read AGENTS.md, .ai/STATE.md and .ai/NEXT.md. Start from the verified milestones and the recorded test matrix. For any new task, keep integrations local or mocked until requested, verify the affected preset and PostgreSQL invariants, and update the roadmap and all four .ai files with the observed results.

## Release follow-up

Verify the hosted release run for the commit being reviewed and record the native result and artifact links. Run `pnpm ops:smoke` with the deployed web origin and rehearse PostgreSQL recovery on the local Compose database before release. [Release checks](../docs/TESTING.md#release-verification) · [Operations commands](../docs/DEPLOYMENT.md#deployment-smoke-check)
