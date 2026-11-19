# Templates and generator

All six presets share Nest account and session APIs, PostgreSQL, the Persian RTL shell, three themes, and local mock mail. Configure the built app using `forge.config.ts`.

| Preset        | First verified slice                                                                                   | Status      |
| ------------- | ------------------------------------------------------------------------------------------------------ | ----------- |
| `saas`        | Administrator account management and workspace CRUD                                                    | Implemented |
| `marketplace` | Catalog search and category filters, listing details, private favorites, and seller-owned listing CRUD | Implemented |
| `booking`     | Service creation, 30-minute availability, reservation and customer/provider appointment states         | Implemented |
| `community`   | Member feed, publishing, comments, reactions, and activity notifications                               | Implemented |
| `learning`    | Course catalog, reading view, lesson completion, and personal progress                                 | Implemented |
| `ai`          | Local streaming responses, structured topics, and private conversation history                         | Implemented |

## Generate a project

Run these commands from an installed Forge checkout. Use the directory name or `--name` for the project brand. The default preset is SaaS/Admin.

```bash
pnpm forge init ../bazaar --template marketplace --name 'بازار آبان'
cd ../bazaar
pnpm setup
pnpm forge seed
pnpm dev
```

Initialization accepts a new directory or an existing empty one. It copies the shared source, test suite, lockfile, docs and environment example. The target has its own Compose project and volume. The generator initializes a fresh Git repository with no commits or remotes. Source Git history, credentials, local mail and generated caches stay outside the new project.

If the source app is already running, choose unused ports for the generated project or stop the source's local services before using the default ports. Keep `POSTGRES_PORT` consistent with `DATABASE_URL` in the generated `.env`. If changing the API port, align the API, web upstream and test configuration.

## Commands

| Command                      | Effect                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm forge templates`       | Lists implemented and planned presets.                                                                                          |
| `pnpm forge features`        | Lists optional feature identifiers.                                                                                             |
| `pnpm forge validate`        | Loads and validates the current TypeScript config.                                                                              |
| `pnpm forge status`          | Shows the selected preset, effective feature settings and status references.                                                    |
| `pnpm forge doctor`          | Validates config, checks tool commands and Docker, and reports whether the local API and database are ready.                    |
| `pnpm forge add marketplace` | Enables an existing feature in a literal `defineForgeConfig` call and preserves other settings. Restart the apps after editing. |
| `pnpm forge seed`            | Builds the API and inserts explicit local fixtures for enabled features.                                                        |

`add` supports `apiDocs`, `workspaceAdmin`, `marketplace`, `gamification`, `booking`, `community`, `learning`, and `assistant`. It is idempotent. For config composed using variables, spreads, or computed keys, edit `features` directly. The generated TypeScript client covers all presets. Runtime Nest routes and the debug Swagger document expose the active modules.

## Demo data

After migration, `pnpm forge seed` adds three Persian workspaces when workspace management is enabled or three listings and a sample seller when Marketplace is enabled. Repeated runs skip existing demo keys and workspace slugs. The seller's password is random and undisclosed. Provision a SaaS administrator through the documented trusted database workflow, or register a Marketplace account to publish and manage your own listings.

Seeding is explicit, requires a loopback PostgreSQL address, and rejects production mode. The Marketplace catalog starts empty until someone publishes a listing or seeds demo data. Prices are informational whole tomans. Mock email and avatar storage work as described in [MOCKS.md](MOCKS.md).

Booking seeds a sample service with future availability. The account that creates a service manages its slots and appointments. Each slot has at most one reservation record. Cancellation retains that record. Community seeds two Persian posts. Learning seeds a two-lesson course. The AI preset displays a sample prompt, and its seed creates a private example conversation for the reserved demo actor. Sign up to use your own private history. [Local assistant](MOCKS.md#local-assistant)

## Add a preset

Add the identifier and default feature set in `packages/config/src/templates.ts`. Build the Nest module and matching web routes for its first real workflow. Gate both the API registration and presentation on the same effective flags. Update the generated contract and add a preset-specific browser test. Generate a fresh project, apply migrations, seed its explicit fixtures, and run the browser test before marking the preset implemented.
