# Handoff

Use the existing checkout at `/workspace/gamificationBoilerplateFrontend`. Keep new work scoped to the user's next request. [Repository rules](../AGENTS.md) · [Observed results](STATE.md) · [Verification commands](NEXT.md)

M7's advanced features share the existing trusted-event pipeline, account lock and ledger. The challenge and season are configured one at a time. Referral and challenge rewards use explicit claims. Spending, badge visibility, rankings and moderation have documented rules. [Gamification guide](../docs/GAMIFICATION.md)

M8 shares infrastructure across six generated presets. The generated OpenAPI contract is a superset, while runtime Nest modules and web routes follow the effective feature flags. [Template workflows](../docs/TEMPLATES.md)

Email, reward fulfillment and assistant responses remain local or mocked. Native PWA installation requires a browser profile that permits it. [Mock integrations](../docs/MOCKS.md) · [PWA verification](../docs/PWA.md)

M9 passed all nine hosted jobs, including native PWA installation, for commit `ed71145`. The run retains Playwright reports. [Release verification](../docs/TESTING.md#release-verification)

M10 adds the deployment smoke command and a local PostgreSQL backup and recovery rehearsal. Run the smoke command through the web origin after each deployment. [Operations commands](../docs/DEPLOYMENT.md#deployment-smoke-check)

## Running locally on Windows

The development stack was left running on 2026-11-20. Open [FORGE](http://localhost:3000) or [Swagger](http://127.0.0.1:4000/docs). PostgreSQL is healthy in the Compose service.

Local Swagger now shows the full catalog. The active preset determines which operations accept requests.

The local SaaS demo includes three Persian workspaces, a verified demo administrator, and an unverified demo member for the email flow.

The existing local demo accounts still work with the all-feature configuration. Open the home navigation to reach Marketplace, Booking, Community, Learning, the local assistant, and gamification.

Open /docs for the product catalog, /progress for gamification, and /status for service health.

The expanded dataset lives in the current local database. The built-in seed still provides the baseline fixtures on a fresh checkout.
