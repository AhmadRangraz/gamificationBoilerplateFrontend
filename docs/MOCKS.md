# Local integrations

Use a mock or local adapter for any feature that would otherwise require an external service. Keep the adapter at the integration boundary, exercise the real application workflow against it, and document what a developer can observe. Use fake recipients, accounts, and payloads in demos and tests. External services can be added in a later, explicit integration task.

| Integration        | Local implementation                                        | How to inspect it                                                                |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Account email      | A file-backed outbox records one JSON message per delivery. | Read `.forge-local/mail/` in the monorepo or the configured outbox directory.    |
| Avatar storage     | PostgreSQL stores sanitized PNG bytes locally.              | Use the signed-in `GET /api/v1/auth/me/avatar` endpoint.                         |
| Reward fulfillment | PostgreSQL records a local redemption receipt.              | Open **پاداش‌ها** from the progress screen or read the private rewards endpoint. |

## Email walkthrough

1. Run `pnpm setup --dev` and register a fake account at `/auth/register` or through the API. For write requests use the web origin, such as `Origin: http://localhost:3000`. Preserve the signup session cookie for the verification request.
2. From `/account`, request an email verification code, or open `/auth/recover` for password recovery. API clients can call `POST /api/v1/auth/email/request` with that session, or `POST /api/v1/auth/password/request` with the fake account’s email.
3. From the project root, list files with `ls -lt .forge-local/mail`. Open the latest JSON file for your recipient and action. Each entry includes the `to`, `kind`, `code`, `expiresAt`, and `transport` fields.
4. Paste the code into `/auth/verify` or `/auth/reset`. API clients submit `{"code":"…"}` to `POST /api/v1/auth/email/verify`, or submit `{"code":"…","password":"…"}` to `POST /api/v1/auth/password/reset`. Each code is single-use. A newer request replaces the previous code for that action.

Development defaults to `FORGE_MAIL_MODE=mock`. Set `FORGE_MAIL_MODE=disabled` to exercise an unavailable mail provider. `FORGE_MOCK_MAIL_DIR` accepts an absolute path to a private outbox directory. Production returns HTTP 503 for email workflows until a production transport is implemented, even when mock mode is selected.

Outbox files contain live local codes. Keep the directory outside any static asset directory, avoid sharing its contents, and periodically delete old files. Git ignores the default directory. The database stores code hashes and expirations. Playwright uses a separate temporary directory for mock messages and removes its messages afterward.

A one-time `EMAIL_VERIFIED` quest and the first step of an email-led mission use the same workflow. Verify a fake account and open **پیشرفت من** to see the quest reward or the newly unlocked mission step. [Quest configuration](GAMIFICATION.md#time-limited-quest) · [Mission configuration](GAMIFICATION.md#ordered-mission)

## Avatar storage

Send a base64-encoded PNG, JPEG, or WebP in the JSON `image` field. The input budget is 48 KiB decoded and the image must be a single frame. The API decodes the image, resizes it to at most 256 × 256 pixels, and writes PNG output without source metadata. Read or remove it through the same authenticated route. No object storage credentials are required.

## Reward fulfillment

Enable gamification, configure a mock catalog item and sign in with a fake account. Earn points through a configured event or use an administrator adjustment for the test account. Redeem the item from **پاداش‌ها** to see the private receipt and reduced balance. Fulfillment consists of that persisted receipt. The flow requires no provider credentials. [Catalog configuration](GAMIFICATION.md#reward-catalog-and-redemption)

## Local assistant

Generate the `ai` preset or enable `features.assistant`. Register a fake account, create a conversation, and send the sample planning prompt. The local provider emits Persian text fragments and a final structured topic. Reload the conversation to verify its private history. The provider runs inside Nest and requires no network access or API key. [Assistant API](API.md#presets)
