# Decisions

- Keep the canonical monorepo in the frontend-named checkout. Next and Nest are independently deployable apps inside that workspace.
- Use Node 24 and pin pnpm 11.25.0, Next 16.4.6, Nest 12.5.1, Prisma 7.10.1, and TypeScript 5.9.3. TypeScript 5.9 meets the API generator peer range. Prisma 7.10.1 is the stable line used during this session. Nest 12 uses ESM.
- Preserve pnpm's supply-chain checks. Pin package versions that meet the release-age policy, restrict approved install hooks, and deny optional Scarf telemetry.
- PostgreSQL 17 runs under Compose. Keep its development port bound to loopback and production secrets in the API process environment.
- Nest OpenAPI is authoritative. Check in generated JSON and client types and verify freshness with the contract tool.
- Use a Next rewrite for same-origin browser API requests and a direct typed client for server rendering. Pin the private upstream origin at web build and runtime.
- Deliver real infrastructure status in M1. Auth, full design, template generation, PWA and gamification follow their own milestones.
- Use official npm-distributed Prisma generator and matching WASM engine for temporary cloud verification. Keep the repository setup on the supported Prisma CLI path.

Compatibility references reviewed before installing dependencies included the official [Next.js installation guide](https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/01-installation.mdx), [NestJS prerequisites](https://github.com/nestjs/docs.nestjs.com/blob/master/content/first-steps.md), [Prisma PG adapter guide](https://github.com/prisma/prisma/blob/7.10.1/packages/adapter-pg/README.md), [Turborepo installation guide](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/getting-started/installation.mdx), [pnpm installation guide](https://github.com/pnpm/pnpm.io/blob/main/docs/installation.md), and [Playwright system requirements](https://github.com/microsoft/playwright/blob/main/docs/src/intro-js.md).

## Account foundation

- Require the exact trusted browser origin on cookie-authenticated mutations and credential entry points. Keep Nest private and do not trust client-supplied forwarding headers for the peer limiter.
- Use opaque random sessions with SHA-256 digests at rest, seven-day absolute expiration, and Secure host-only cookies in production. Rotate the caller’s existing credential in the same transaction as login or registration.
- Use asynchronous scrypt with an independent salt per password and a bounded database-backed attempt window per peer and normalized login email.
- Public registration always creates a member. Resolve account status and role on every guarded request so stored permissions and suspension take effect on the next check.
- The standard Prisma CLI now verifies its engine download in this environment. The prior WASM verification was temporary.

## Local service adapters

- Use local mocks for external services at the user's request. Record each integration and its test steps in `docs/MOCKS.md`.
- Verification and recovery issue one short-lived digest per account and action. The private development outbox holds the plaintext code for local testing. Production rejects the mock transport.
- Store checked and re-encoded PNG avatars in PostgreSQL. A remote object-store adapter can be added when requested.
- Serialize session issue, password reset and account suspension on the account row. Sensitive changes and their audit events commit together.

## Persian application UI

- Use React Hook Form and Zod in browser forms and maintain Nest validation and enforcement on the API.
- Copy only the current session cookie to the configured upstream on server reads. Browser mutations use the web origin. Protected Server Components complement the Nest guards.
- Use semantic CSS tokens for the three theme variants, a preference cookie for persistence, and the shadcn/ui Radix pattern for keyboard-safe destructive confirmations.
- Reuse the existing workspace model for M3's administrator CRUD slice. Pagination uses URL state with a 25-record page size.

## Template composition and generation

- Use the typed registry for SaaS/Admin and Marketplace defaults. API registration, web routing, navigation and Playwright selection consume the same effective settings.
- Generate from the installed local monorepo through an allowlist, stage changes beside the destination, and publish them only to a new or empty directory. Initialize a fresh Git repository for Turbo and generate a separate Compose project name.
- Keep a shared Prisma migration history and a superset TypeScript API contract. Runtime Swagger reflects active API modules. Rebasing the generated contract's project metadata keeps custom branding and contract checks consistent.
- Demo data is an explicit CLI action for loopback PostgreSQL and is disabled in production. Seed keys keep repeated runs idempotent. Marketplace uses local storage and the existing mock account integrations.
- Marketplace ownership is scoped in database writes. Public results hide suspended sellers and omit their private account data.

## PWA

- Use a first-party service worker with a fixed public precache allowlist. Keep app documents and data requests network-only, with a separate static Persian document for failed navigation.
- Derive the worker cache identity from the revision, worker source and offline markup. Change the revision when shipping a release or replacing local icon bytes.
- Require an explicit click to activate a waiting worker and reload the requesting tab. Remove stale Forge caches while preserving cache namespaces owned by other code.
- Verify eligibility in a disposable Chromium profile and use a simulated browser event to verify the in-app install control. The optional headed probe remains subject to the managed browser's native installation policy.

## Points and XP

- Default gamification to off in both presets. Keep its route module and award writes gated by the same feature flag.
- Emit rewards from persisted business actions inside Read Committed transactions. Take the common account lock before a qualifying source insert and cap evaluation.
- Key the ledger by event kind and immutable source ID. Persist capped outcomes at zero so replay on a later day cannot earn a skipped grant.
- Store earned values in the ledger. Calculate private totals and XP levels from ledger history, with thresholds supplied by the current config.
- Store administrator point credits and deductions in the same ledger with an administrator ID, audit reason, and request UUID. The account lock protects the balance, and PostgreSQL uniqueness prevents reuse across accounts. The member-facing history summarizes each adjustment as a point change.
- Derive badge progress and streaks from qualifying business awards. Use Forge's configured timezone, Saturday-based weeks, and Jalali months for calendar periods.
- Require explicit member opt-in before exposing display names and scores to authenticated ranking viewers. Filter suspended accounts at query time. Shared XP ranks use a stable internal sort for pagination.

## Quests

- Configure one optional campaign via an explicit key. One-time campaigns use a half-open UTC window. Daily campaigns share the earning rule's local date and use a target within its daily cap. Use a new key for a new campaign.
- Identify progress by account, quest key and occurrence. Existing one-time rows use `once` and keep their original IDs. Daily rows use the ISO local date. Reads select the current occurrence, and past progress and rewards persist.
- Count newly awarded business sources after ledger deduplication and cap checks. Commit the qualifying event, quest update and reward inside the existing account lock. The completion ledger source key is the quest progress UUID.
- Include quest rewards in balance, XP, levels and rankings. Activity badges and streak calendars count qualifying business entries.

## Ordered mission

- Configure one optional mission independently of the quest. Store the number of completed steps and the count on the active step per account and mission key. Future steps stay locked until their predecessors finish.
- Process each new awarded source once in the existing account transaction. A source advances at most the active mission step. Early and capped events stay consumed. The same award can also advance an eligible quest.
- Use the mission progress ID as the completion ledger source, and store completion in the reward transaction. Select private mission and quest progress from the same snapshot. Use a new mission key when changing the steps or reward.

## Reward redemption

- Keep a small opt-in catalog in `forge.config.ts`. Resolve the signed-in account from the session and the price from the server config. Preserve the original title and point cost in the receipt.
- Serialize redemption and administrator adjustments under the same account lock. Reuse the ledger balance check, write one negative entry with zero XP, and commit the receipt in the same transaction.
- Scope the UUID v4 request ID to the account. Check for an existing receipt before reading catalog prices or checking the balance. Use the receipt ID as the debit source.
- Read the balance and latest 20 private receipts in one snapshot. Fulfillment is the local persisted receipt.

## Advanced engagement and templates

- Treat the challenge and season as separately configured windows. Challenges require enrollment, consume only newly awarded business events and use completion claims. Group progress stops at its shared target and persists independently of later account deletion.
- Use verified invite codes and one inviter per unverified account. Keep referral qualification in the verification transaction, and credit the inviter under its account lock on claim.
- Use local date keys for recurring quests and streak protection, UTC timestamps for windows, and stable user consent for ranking visibility. Audit cap, price and moderator changes.
- Keep each preset as its own feature gate within the monorepo. Booking uses a unique slot reservation, Community stores reactions by member and post, Learning stores one completion per learner and lesson, and AI persists structured local replies before streaming.
- Generate and test clean template checkouts with a fresh database and a frozen install. Treat measured browser timings as lab data and keep native PWA installation as a separate browser-policy check.

## Release checks

- Use a generated project on the hosted runner for the native PWA test. Preserve the managed browser policy and record installation results separately from headless eligibility and offline checks.
- Keep HTML browser reports on the workflow run for 14 days for release review.
