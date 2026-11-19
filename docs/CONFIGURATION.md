# Configuration

Edit `forge.config.ts`, which calls `defineForgeConfig` from `packages/config/src/define.ts`. The type provides completion and Zod rejects unknown keys, invalid values, and unsupported combinations. Config and package builds read it from the workspace root. Restart `pnpm dev` after changing configuration or compiled shared packages.

| Key                                                      | Default                | Use                                                                                                 |
| -------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `project.name`, `description`, `symbol`                  | Persian FORGE branding | Web metadata and navigation. Name and description also feed OpenAPI.                                |
| `template`                                               | `saas`                 | Selects `saas`, `marketplace`, `booking`, `community`, `learning`, or `ai` and its module defaults. |
| `theme`                                                  | `professional`         | Default theme. Also accepts `dark` or `vibrant`. A user's theme cookie overrides the default.       |
| `pwa.enabled`                                            | `true`                 | Adds manifest metadata and registers the production service worker.                                 |
| `pwa.shortName`                                          | Project name           | Short launcher label.                                                                               |
| `pwa.themeColor`, `pwa.backgroundColor`                  | `#246146`, `#f5f7f3`   | Six-digit hex colors used for PWA branding.                                                         |
| `pwa.revision`                                           | `1`                    | Version token for service worker caches and update prompts.                                         |
| `locale`                                                 | `fa-IR`                | Root language and Intl formatting.                                                                  |
| `timezone`                                               | `Asia/Tehran`          | Date presentation. Timestamps remain canonical.                                                     |
| `digits`                                                 | `persian`              | Pass `latin` for Latin numeral display.                                                             |
| `navigation.showStatusShortcut`                          | `true`                 | Shows the dashboard flow shortcut.                                                                  |
| `features.apiDocs`                                       | `true`                 | Enables Swagger in development.                                                                     |
| `features.workspaceAdmin`                                | Based on preset        | Enables workspace CRUD routes and navigation.                                                       |
| `features.marketplace`                                   | Based on preset        | Enables catalog, seller and favorite routes and navigation.                                         |
| `features.booking`, `community`, `learning`, `assistant` | Based on preset        | Enables the corresponding composable route, navigation and API module.                              |
| `api.port`                                               | `4000`                 | Development API port and implied upstream origin.                                                   |

For example, add `digits: 'latin'` and `navigation: { showStatusShortcut: false }` at the top level of the `defineForgeConfig` object. Rebuild after changing configuration. Regenerate the client after changing the API metadata.

The gamification flag defaults to off. Both `gamification.quest` and `gamification.mission` default to `null`, and `gamification.rewards` defaults to an empty catalog. The feature supports per-event rewards, daily limits, level thresholds, one-time and daily quests, an ordered mission, and local points redemption. [Gamification configuration](GAMIFICATION.md)

## Environment

| Variable                                                             | Scope                | Use                                                                                                                                      |
| -------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                       | API and Prisma CLI   | PostgreSQL DSN. Required at runtime. The API and Prisma load the ignored root `.env` outside production.                                 |
| `FORGE_MAIL_MODE`                                                    | API                  | `mock` by default in development. Set `disabled` to turn off mock mail.                                                                  |
| `FORGE_MOCK_MAIL_DIR`                                                | API                  | Absolute path to the private mock outbox. Defaults to `.forge-local/mail` at the project root.                                           |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | Local Compose        | Development database settings. Keep the connection URL aligned.                                                                          |
| `WEB_ORIGIN`                                                         | API                  | Exact trusted browser origin, required with HTTPS in production. Defaults to the two loopback web origins on port 3000 in development.   |
| `API_HOST`, `API_PORT`                                               | API                  | Listen interface and port. Defaults to loopback and the configured port.                                                                 |
| `FORGE_API_ORIGIN`                                                   | Web build and server | Trusted upstream HTTP(S) origin. Set it at build and runtime if deploying separately. The build records the browser rewrite destination. |

The process environment takes precedence over local file values. Keep database credentials out of the shared config and web environment.

## Config milestones

M2 uses the deployment origin from the API environment and a fixed member/admin role policy. M3 adds three visual themes and role-aware responsive navigation. M4 resolves defaults from the shared template registry and accepts explicit overrides. M5 adds PWA metadata and M6 introduces configurable gamification rules. Each milestone should add validated keys alongside their actual consumers and tests.
