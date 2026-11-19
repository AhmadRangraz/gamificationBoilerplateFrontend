# Testing

Required tools are Node.js 24, pnpm 11.25.0, Docker Compose v2, and Chromium for browser checks. Start with `pnpm setup`. Build and browser tests can use the same local PostgreSQL volume.

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm contract:check
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright starts the built apps on ports 3000 and 4000 and an isolated API process on port 4001 for the database-failure check. Stop your own development servers before running it. If the environment already has a compatible Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its path instead of installing another browser. The test configuration expects the default app ports.

Vitest covers configuration validation, Iranian timezone handling, and both numeral systems. Playwright checks HTTP 200 against migrated PostgreSQL, HTTP 503 from the isolated API with a deliberately unreachable database, same-origin forwarding, and the Persian RTL dashboard at a mobile viewport.

The account integration specs use the real database and the web origin. They exercise registration, validated writes, member permissions, session rotation and revocation, login throttling, mock email delivery, code expiry and replay, session revocation after reset, avatar validation, and administrator suspension with audit records. Use a development or disposable database for these tests.

Allow egress to `binaries.prisma.sh` for Prisma CLI downloads on restricted networks. Keep artifact checksum verification enabled.

The M3 browser specs exercise the Persian signup and login forms, profile editing and avatar handling, verification and reset through the local outbox, administrator suspension, workspace CRUD and keyboard focus in the confirmation dialog. The accessibility spec runs axe against the mobile login screen in each theme.

M4's Vitest tests verify preset defaults, generator safety and exclusion of local secrets and artifacts. Playwright selects the Marketplace or feature-disabled test using the effective config and runs the workspace CRUD browser test when workspace management is enabled. A generated Marketplace checkout uses the same setup and test commands. See [templates](TEMPLATES.md) for local database isolation.

The PWA suite checks installability and icon dimensions, explicit cache contents after authenticated requests, offline read and write behavior, and a service worker update delivered by a local test proxy. See [PWA.md](PWA.md) for the optional headed native install check and the managed browser limitation.

The opt-in gamification Playwright checks exercise mixed-account access, rejected client XP, a verified email award, duplicate events, concurrent listing caps, replay on a later cap day, transaction rollback, and the Persian account progress screen. Enable the feature in a generated Marketplace checkout and use a disposable PostgreSQL database to run both event scenarios. The default SaaS suite checks that disabled routes return 404.

Run the opt-in gamification suite against a disposable PostgreSQL database with the feature enabled to verify administrator credit and deduction, retry and overdraw behavior, the audit trail, Jalali month and Saturday week boundaries, badge and streak progress, and ranking privacy.

To verify quests, configure the [Marketplace example](GAMIFICATION.md#time-limited-quest) with a window that surrounds the current UTC time and a daily listing limit of at least three. Apply migrations, build, and run `pnpm test:e2e tests/gamification.spec.ts --grep 'configured quests'`. The check covers rolled-back progress, parallel publications, replay, one ledger reward and the mobile Persian widget. Move the test window into the past, rebuild, and rerun to verify that a valid publication still earns its normal award after the quest expires while quest progress remains at zero. Use an `EMAIL_VERIFIED` quest with target one to exercise the same path through the local email outbox.

To verify the daily occurrence, configure the Marketplace daily quest with target two and a listing cap of two. Run `pnpm db:migrate`, `pnpm build` and `pnpm test:e2e tests/gamification.spec.ts`. The rollover check records publications on an earlier local day, then verifies that the current day starts at zero, older awarded and capped events stay consumed, and each day keeps its own ledger reward. It controls the clock in the test worker. [Daily quest example](GAMIFICATION.md#daily-quest)

To verify the ordered mission, apply the Marketplace mission example and use a listing earning limit of at least five. Run `pnpm db:migrate`, `pnpm build`, and `pnpm test:e2e tests/gamification.spec.ts --grep 'ordered missions'`. The check uses the mock outbox, publishes early and replays that source, verifies each step transition, rolls back a completion, and publishes concurrently to verify a single final reward. [Ordered mission example](GAMIFICATION.md#ordered-mission)

To verify redemption, enable gamification and configure at least one mock catalog item. Run `pnpm db:migrate`, `pnpm build`, and `pnpm test:e2e tests/gamification.spec.ts --grep 'reward redemption'`. The check covers authorization, ownership, insufficient balance, transaction rollback, concurrent duplicates, competing spend requests, and a browser retry after a committed request loses its response. With an empty catalog the same test checks the authenticated empty state. [Reward catalog example](GAMIFICATION.md#reward-catalog-and-redemption)

## Generated presets and final checks

The CI workflow installs frozen dependencies, checks the contract, and generates a clean project for each preset. It applies fresh PostgreSQL migrations and demo seeds, builds production output, and runs the relevant Playwright suite. Source validation covers lint, formatting, type checks, unit tests and generated client freshness. [CI workflow](../.github/workflows/verify.yml)

After generating a fresh Marketplace project and installing its dependencies, run `node tooling/configure-verification.mjs "$PWD"` inside it to configure daily quests, a group challenge, a season, referrals and points redemption. Add `individual` as the second argument in a separate fresh checkout to exercise an individual challenge and weekly recurrence. Run `pnpm db:migrate`, `pnpm build` and `pnpm test:e2e --workers=1`. The engagement tests cover enrollment, one-time claims, verified referrals, seasonal moderation, administrator audit, streak recovery, badge prerequisites and reward discounts.

`pnpm test:e2e tests/presets.spec.ts` exercises the active vertical workflow, disabled-route behavior, security headers, and the mobile axe check. It records navigation response start, largest contentful paint, and cumulative layout shift on the status page as a Playwright attachment. Treat these as local browser measurements. Use production telemetry to evaluate real-user Core Web Vitals.

### Observed local verification

The following samples came from a 360 × 780 Chromium viewport on the generated checkouts with local PostgreSQL. Expected skips select workflows that belong to other presets.

| Preset                                 | Browser checks passed | Response start | Largest paint | Layout shift |
| -------------------------------------- | --------------------: | -------------: | ------------: | -----------: |
| SaaS                                   |                    19 |          29 ms |        276 ms |      0.00075 |
| Marketplace with advanced gamification |                    27 |          19 ms |        220 ms |      0.00075 |
| Booking                                |                     4 |          34 ms |        160 ms |            0 |
| Community with gamification            |                     4 |          59 ms |        640 ms |            0 |
| Learning with gamification             |                     4 |          22 ms |        236 ms |      0.00075 |
| AI                                     |                     4 |          28 ms |        248 ms |      0.00075 |

The generated Booking project also passed `pnpm setup` with a separate Compose database and all 13 migrations. A production-mode API process connected to migrated PostgreSQL, returned HTTP 200 for health and returned HTTP 404 for Swagger.

A separate Marketplace checkout with an individual challenge and weekly quest passed nine applicable gamification checks.

## Release verification

The Verify Forge workflow runs on a push, pull request, or manual dispatch. Its generated matrix retains HTML browser reports for 14 days, including test failures and the recorded lab measurements. The `native-pwa` job checks native install, launch, and uninstall on headed Chromium. The normal SaaS suite covers installability, offline behavior, cache isolation, and service-worker updates.

The first hosted run passed source checks, four preset jobs, and the individual variant. Both full browser suites stopped at the mobile password recovery confirmation. The account test now waits for the recovery route and confirms the submission response. Two local repetitions passed with the hosted version of Chrome Headless Shell. [Baseline run](https://github.com/AhmadRangraz/gamificationBoilerplateFrontend/actions/runs/44562213070)

All nine hosted jobs passed for M9 commit `ed71145`. The run includes all six presets, the individual challenge variant, source checks, and native PWA installation. Download the retained browser reports from the run page. [M9 run and reports](https://github.com/AhmadRangraz/gamificationBoilerplateFrontend/actions/runs/44595264192)

To reproduce the native check on Linux in a browser environment that permits installation, start PostgreSQL and build the app, then run:

```sh
pnpm exec playwright install --with-deps chromium
FORGE_E2E_HEADED_INSTALL=1 xvfb-run -a pnpm test:e2e tests/pwa.spec.ts --grep 'disposable profile'
```

Use the commit SHA and job result as evidence for a release. The managed cloud browser still requires a permitted browser profile for native installation. [CI workflow](../.github/workflows/verify.yml) · [PWA checks](PWA.md#verify-locally)

## Deployment and recovery checks

The foundation suite runs the smoke command against the built web and API, using the preset's PWA setting. The local PostgreSQL rehearsal verified a mode-0600 backup, a completed restore and schema check, refusal to replace an existing archive, and cleanup after a corrupt archive was rejected. [Deployment commands](DEPLOYMENT.md#deployment-smoke-check)
