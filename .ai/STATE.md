# State

| Milestone | Status      | Evidence                                                                                                                                            |
| --------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0–M4     | VERIFIED    | Workspace, accounts, Persian UI, typed CLI, and the foundational presets.                                                                           |
| M5        | BLOCKED     | Shared PWA is implemented. Managed Chromium blocks the native installation check.                                                                   |
| M6        | VERIFIED    | Opt-in ledger, levels, audited adjustments, badges, streaks and consent-based rankings.                                                             |
| M7        | VERIFIED    | Advanced quests, missions, challenges, reward economy, seasons, referrals, engagement, administration and analytics passed PostgreSQL verification. |
| M8        | VERIFIED    | All six presets passed clean generation, migrations, seeding, production builds and relevant browser checks locally.                                |
| M9        | IN_PROGRESS | Release workflow and reporting added. Hosted native installation result is pending.                                                                 |

## Completed this session

- The engagement APIs and pages support individual and group challenges, seasonal rankings, verified referrals, personal goals, ranking moderation, cap and price controls, and audited analytics. Weekly recurrence, mission prerequisites, configurable badges, level discounts and streak protection share the existing account lock and ledger.
- Added Booking, Community, Learning and AI workflows to the typed registry and generator. They use the same authentication, OpenAPI client and Persian RTL shell as SaaS and Marketplace. Community posts and completed lessons can emit trusted gamification events.
- Added migrations for engagement, preset data and streak protection. The local assistant streams structured mock replies and keeps private conversation history. Email and reward fulfillment also remain local. [Mock integrations](../docs/MOCKS.md)
- Added clean-checkout CI, security headers, Playwright mobile axe checks and lab timings. Synchronized the service-worker update assertion with the reload. [Verification](../docs/TESTING.md)

## Verification

- Root formatting, lint, typecheck, production build, OpenAPI freshness and all 15 unit tests passed. Each generated project applied all 13 migrations with no schema drift.
- Browser checks passed in SaaS (19), advanced Marketplace (27), Booking (4), Community (4), Learning (4) and AI (4). An additional Marketplace build with an individual challenge and weekly quest passed all nine applicable tests.
- The four new presets passed their mobile axe checks. The generated Booking project passed `pnpm setup` with a separate Compose database. A production API process returned HTTP 200 for health and HTTP 404 for Swagger. Local status-page largest paint samples were 160–640 ms. [Observed local verification](../docs/TESTING.md#observed-local-verification)

## Follow-up

Native PWA installation requires a browser profile that permits it. The hosted release run includes this check. [Reproduction commands](NEXT.md)

## Release verification

- The first hosted Verify Forge run passed source checks and five matrix jobs. SaaS and Marketplace failed at the password recovery confirmation. The updated test waits for recovery navigation and verifies HTTP 204 from the form submission. The complete mobile account flow passed twice locally using the same Chrome Headless Shell version as CI.
- The release workflow now retains browser results and exercises native PWA installation in a generated checkout on a headed runner. [Release checks](../docs/TESTING.md#release-verification)
