# Architecture

FORGE uses a Turborepo-managed pnpm monorepo. Web and API deploy as separate Node processes. The browser uses the web origin, and Next.js proxies API paths to NestJS. Server Components can call NestJS directly. NestJS connects to PostgreSQL through Prisma. PostgreSQL runs under Docker Compose for local development.

The initial vertical slice is the application readiness dashboard. The API checks its migrated database schema and publishes a typed health contract. The web renders the observed outcome in Persian, including when the dependency is unavailable.

Shared config owns platform defaults and enabled capabilities. Domain modules will live under `apps/api/src`. The first domain milestone is accounts and sessions. Template composition, PWA and gamification arrive in their roadmap order.

## Adding a page and a module

A page starts at `apps/web/app/example/page.tsx` with a default component. Use shared formatting in `@forge/shared` and render product copy from one locale dictionary.

Add a Nest module with a controller, DTOs and service in `apps/api/src/example`, then import it in `AppModule`. Decorate its routes and response DTOs for Swagger. Regenerate the TypeScript client when route contracts change.

Domain tables belong in the Prisma schema. Create a migration against the local development database, review the SQL, and commit it alongside the schema change. Keep transaction boundaries in the owning Nest service.

## Account and administration UI

The root layout resolves the current account from the Nest session and renders the matching navigation. Protected routes check the role during rendering. Nest independently checks authorization on each protected API request. Browser forms call the generated client at the web origin and use React Hook Form with Zod. Server Components forward the session cookie only to the configured API origin and skip caching private records.

Shared web primitives live in `@forge/ui`, including a confirmation dialog adapted from the shadcn/ui Radix pattern. Tailwind and semantic CSS tokens render the three visual themes. A preference cookie preserves the selected theme across reloads. Keep translated copy in the web locale dictionaries and use logical CSS properties for both the desktop sidebar and mobile bottom navigation.

## Preset composition

The typed registry in `@forge/config` resolves preset defaults and explicit overrides. Nest registers only the active domain modules. Next uses the same flags to choose navigation and reject inactive route groups. A generated project contains the shared source and OpenAPI contract, so optional modules can be enabled locally without installing a remote template. Prisma migration history is shared between presets.
