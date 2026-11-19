# Deployment

Run PostgreSQL and the two Node processes separately. Use a TLS reverse proxy for the browser-facing web service. Keep NestJS and PostgreSQL on a private network. Set the public HTTPS origin in the API process as `WEB_ORIGIN` so browser mutations can pass the origin check. Production uses a Secure, HttpOnly session cookie.

1. Install from the lockfile with `pnpm install --frozen-lockfile`.
2. Supply a production PostgreSQL `DATABASE_URL` through the deployment secret store and set `WEB_ORIGIN` to the exact public HTTPS origin without a trailing slash. Configure TLS and access appropriate to the host.
3. With production environment values available, apply `pnpm db:migrate` from the monorepo root.
4. Set `FORGE_API_ORIGIN` on the web build and web process to the same private API origin, then run `pnpm build`.
5. Run `pnpm --filter @forge/api start` and `pnpm --filter @forge/web start` under the service manager with `NODE_ENV=production`. If the two apps run on separate hosts, set `API_HOST` to the API’s private listening interface.
6. Check `GET /api/v1/health` through the web origin. A 503 means the API cannot query the migrated schema.

The Compose file and example credentials are for local development. On production, the API requires the database URL in its process environment and disables Swagger UI.

The web process sends frame, MIME-sniffing and referrer headers and a CSP for frame ancestors, form targets, base URLs and object embeds. Keep these headers at the proxy. Terminate TLS at the edge and set transport security on the deployed HTTPS origin. Limit request body sizes at the edge as appropriate. For the assistant stream, allow `application/x-ndjson` and disable reverse-proxy buffering. Keep the Nest and PostgreSQL ports off the public network. [Assistant API](API.md#presets)

## PWA deployment

Serve via HTTPS and preserve the uncached `/sw.js` response. Set `pwa.revision` when deploying a new release and follow the install and offline checks in [PWA.md](PWA.md).

## Account operations

Registration creates a member. Provision administrators through your trusted database administration process after verifying the account owner's identity. Keep the API private. The built-in rate limiter uses the actual connection peer and normalized email, so if all requests arrive from one reverse proxy they share that peer budget. Apply client-specific limits at the trusted edge. Schedule removal of expired rows from `Session` and `AuthAttempt` by their indexed `expiresAt` columns.

Email workflows return 503 in production while FORGE uses the local mock. The audit table records registration, login, logout, verification, reset, suspension and restoration with timestamps and account IDs. Set an appropriate audit retention policy. Include expired `AccountAction` rows in the database cleanup schedule. See [local integrations](MOCKS.md) for development instructions.
