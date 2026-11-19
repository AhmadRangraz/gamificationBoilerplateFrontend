# FORGE · فورج

A Persian-first hackathon boilerplate. The foundation includes a Next.js status dashboard, an independent NestJS API, PostgreSQL with Prisma, and a generated TypeScript API client.

## Start locally

Use Node.js 24, pnpm 11.25.0, and Docker with Compose v2. Install the pinned pnpm version for your Node installation if needed.

```bash
pnpm setup --dev
```

Setup creates an ignored `.env` from `.env.example` if needed, installs locked dependencies, starts PostgreSQL, applies migrations, and starts both development processes. It preserves an existing `.env` and PostgreSQL volume. In a managed workspace with a restricted home directory, set `pnpm_config_store_dir` to a writable cache directory before running setup. Allow `binaries.prisma.sh` on restricted networks so Prisma can download and verify its native engine.

The web app runs on port 3000. The API listens on loopback port 4000 and serves Swagger at `/docs` in local development. `GET /api/v1/health` checks PostgreSQL through Prisma and is available through the web origin.

See [testing](docs/TESTING.md), [configuration](docs/CONFIGURATION.md), [deployment](docs/DEPLOYMENT.md), and [the roadmap](docs/ROADMAP.md). Agents start with [AGENTS.md](AGENTS.md) and [the session state](.ai/STATE.md).

Email verification and password recovery use the local mock outbox. See [local integrations](docs/MOCKS.md) for the walkthrough and configuration.

Open `/auth/register` or `/auth/login` to exercise the Persian account UI. The appearance selector offers professional, dark, and vibrant themes. An administrator can open `/admin` for account status and `/admin/workspaces` for workspace management. See [deployment](docs/DEPLOYMENT.md) for administrator provisioning.

Use `pnpm forge init ../my-app --template saas` to generate a fresh project. Choose `marketplace`, `booking`, `community`, `learning`, or `ai` for the other presets. Run `pnpm forge seed` for local demo data. [Templates and generator](docs/TEMPLATES.md)

The production web build includes installable PWA metadata and a Persian offline screen. See [PWA setup and verification](docs/PWA.md).

Enable the optional points ledger and Persian progress screen with `pnpm forge add gamification`. See [reward rules and local verification](docs/GAMIFICATION.md).
