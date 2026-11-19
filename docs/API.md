# API

NestJS owns the `/api/v1` contract. Browser requests to this prefix pass through the Next.js origin. Server Components can also use the configured upstream with `createForgeClient(origin)`.

| Method and path      | Response                                                                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/health` | HTTP 200 with `{"status":"ready","database":"ready"}` if Prisma can query the migrated schema. HTTP 503 with `{"status":"unavailable","database":"unavailable"}` when the query fails. Both use `Cache-Control: no-store`. |

During development, Swagger UI is on API port 4000 under `/docs` and the JSON document is under `/docs-json`. The checked-in machine-readable contract is [openapi.json](../packages/api-client/openapi.json).

After changing a controller or response DTO, run:

```bash
pnpm contract:generate
pnpm contract:check
```

Example in a Server Component or a server helper:

```ts
import { createForgeClient } from '@forge/api-client';

const api = createForgeClient('http://127.0.0.1:4000');
const { data, error, response } = await api.GET('/api/v1/health', {
  cache: 'no-store',
});
```

Use DTO validation for mutable payloads. Global Nest validation is configured in `apps/api/src/bootstrap.ts`. Nest enforces session, role and origin checks for the account endpoints.

## Accounts

Paths below are relative to `/api/v1/auth`.

| Method and path  | Result                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `POST /register` | Create a member with email, name and password. Return the profile and set a session cookie.   |
| `POST /login`    | Authenticate email and password. Return the profile and rotate the caller’s existing session. |
| `POST /logout`   | Revoke the current session, expire the cookie, and return 204.                                |
| `GET /me`        | Return the authenticated account profile.                                                     |
| `PATCH /me`      | Update the caller’s display name.                                                             |
| `GET /accounts`  | List the latest 50 accounts for an authenticated administrator.                               |

Use the web origin for browser calls. Mutations require a trusted `Origin` header. The browser sends it automatically on same-origin writes. The session expires after seven days. Only a hash of each opaque token is stored in PostgreSQL. Passwords are independently salted and derived with scrypt. An invalid or expired session returns 401, an insufficient role or invalid origin returns 403, and excessive login attempts return 429.

Email verification and password reset codes expire after 30 and 15 minutes respectively. Registration allows an unverified session and returns `emailVerified: false`. Verification changes that flag. The account list also provides `suspendedAt` for administrator workflows. Password reset responses use the same accepted status for unknown or eligible addresses. See [local integrations](MOCKS.md) for mock delivery and production behavior.

## Workspaces

`/api/v1/workspaces` is restricted to administrators. `GET /workspaces?page=1` returns up to 25 records and a `hasNext` flag. Page numbers run from 1 through 500. `POST /workspaces` creates a record with a name and a unique lowercase Latin slug. `PATCH /workspaces/:id` updates those fields. `DELETE /workspaces/:id` removes a record. Mutations require the same browser origin. Invalid input returns 400, a duplicate slug returns 409, and an unknown record returns 404.

## Marketplace

These endpoints are available when `features.marketplace` is enabled. Paths below are relative to `/api/v1/marketplace`. Lists return up to 20 records with a `hasNext` flag and accept page numbers 1–500.

| Method and path                                  | Result                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `GET /listings`                                  | Public catalog. Accepts optional `q` (title or description search) and `category`. |
| `GET /listings/:id`                              | Public listing details and the seller's display name.                              |
| `GET /mine`                                      | Listings belonging to the authenticated account.                                   |
| `POST /listings`                                 | Publish a listing for the caller.                                                  |
| `PATCH /listings/:id` and `DELETE /listings/:id` | Update or delete a listing belonging to the caller.                                |
| `GET /favorites` and `GET /favorites/:id`        | Return saved listings or the saved state for the caller.                           |
| `PUT /favorites/:id` and `DELETE /favorites/:id` | Idempotently save or remove a listing for the caller.                              |

Public reads exclude listings whose seller is suspended. Write requests require the same origin. An attempt to edit or delete another seller's listing returns 404. Listing price is an integer number of tomans. Accepted categories are `HANDMADE`, `BOOKS`, and `ELECTRONICS`.

## Gamification

When enabled, `GET /api/v1/gamification/me` returns the current session’s points, XP, level, starting threshold, next threshold and latest 20 ledger entries. The next threshold is null at the highest level. Capped events have zero points and XP. A missing session returns 401. Disabled installations return 404. See [GAMIFICATION.md](GAMIFICATION.md) for supported business events and rules.

| Method and path                                          | Result                                                                                                                                                                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/gamification/accounts/:id/adjustments`     | Administrator-only credit or deduction for an active member. Body contains a UUID v4 `requestId`, signed integer `points`, and `reason`. Exact retries return 204. An overdraft or mismatched replay returns 409. |
| `PATCH /api/v1/gamification/preferences`                 | Update the current account’s `leaderboardOptIn` boolean.                                                                                                                                                          |
| `GET /api/v1/gamification/leaderboard?period=all&page=1` | Authenticated, paginated XP rankings for opted-in participants. Periods are `daily`, `weekly`, `monthly`, and `all`.                                                                                              |

The progress response includes configured badge progress, daily and weekly streak counts, 14 days of calendar activity, and the ranking preference. Mutations require the same browser origin. Ranking responses include display name, XP, shared rank and a flag for the viewer’s row.

The same progress response has a nullable `quest` object with the title, source event, cadence, current count, target, points and XP reward, and status (`UPCOMING`, `ACTIVE`, `COMPLETED` or `EXPIRED`). With `cadence: 'once'`, `startsAt` and `endsAt` carry the UTC timestamps and `day` is null. With `cadence: 'daily'`, `day` is the current local calendar date in ISO format, both UTC timestamps are null, and status is `ACTIVE` or `COMPLETED`. Eligible business actions advance the occurrence and award completion automatically. The completion ledger event is `QUEST_COMPLETED`.

The nullable `mission` object contains the title, completion flag, points and XP reward, and ordered steps. Each step has its event, current count, target, and one of `ACTIVE`, `LOCKED`, or `COMPLETED`. Newly awarded business actions advance the active step automatically. The final step issues a single `MISSION_COMPLETED` ledger entry. [Mission behavior](GAMIFICATION.md#ordered-mission)

`GET /api/v1/gamification/rewards` returns `balance`, catalog `rewards`, and the signed-in account’s latest 20 `redemptions`, newest first. The balance and receipts come from one database snapshot. Both reward endpoints require a session and return `Cache-Control: no-store` for successful responses.

`POST /api/v1/gamification/rewards/redemptions` accepts only a catalog `rewardKey` and UUID v4 `requestId`. It requires the trusted web origin. First success and exact retries return HTTP 200 with the same receipt `id`, `rewardKey`, `title`, `cost`, and UTC `createdAt`. A new request for an unknown key returns 404. An insufficient balance or a request ID already used with another key on the same account returns 409. [Catalog and redemption](GAMIFICATION.md#reward-catalog-and-redemption)

The authenticated `/api/v1/gamification/engagement` route returns the active challenge, referral data, and personal goal. Its `challenge/join`, `challenge/claim`, `referral`, `referral/:id/claim`, `goal`, and `streak` mutations use the session and trusted same-origin guard. The leaderboard accepts `period=season`. Administrator-only routes under `/api/v1/gamification/admin` expose the report, cap and price controls, and ranking moderation. [Advanced gamification](GAMIFICATION.md#advanced-gamification)

## Presets

| Module    | Signed-in routes                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Booking   | `GET /api/v1/booking` lists services, availability and private appointments. Mutations create services and slots, reserve a slot and change an appointment state.              |
| Community | `GET /api/v1/community?page=1` loads the feed, latest comments and private notifications. Same-origin mutations publish, comment, react and delete owned posts.                |
| Learning  | `GET /api/v1/learning` lists courses and personal progress. Read an individual lesson by ID and POST to its `complete` route. Duplicate completions reuse the existing record. |
| Assistant | `/api/v1/assistant/conversations` creates and lists owned conversations. Read or delete by ID. POST to `/:id/turns` with `prompt` and UUID v4 `requestId` to receive a stream. |

Assistant responses use `application/x-ndjson`. Each line is either `{"type":"delta","delta":"..."}` or the final `{"type":"complete","turn":{"id":"...","prompt":"...","reply":"...","topic":"planning"}}`. Topics are `planning`, `learning`, or `general`. The persisted turn is reused for an exact request retry. [Local assistant](MOCKS.md#local-assistant)
