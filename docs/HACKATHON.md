# Hackathon workflow

1. Read `AGENTS.md`, `.ai/STATE.md`, and `.ai/NEXT.md`. Run `pnpm setup --dev` and confirm readiness.
2. Once the challenge is announced, write the core user journey and choose the nearest **implemented** preset from the template status table.
3. Complete one vertical slice first. Add the migration, authorized Nest API, generated client usage, and Persian RTL screen. Test that slice with realistic data before adding optional features.
4. Use published demo fixtures or explicitly labeled substitutes when external services are unavailable. Keep live and demo modes explicit.
5. Run the checks in `docs/TESTING.md`, rehearse the user journey, deploy, and update the handoff.

## Reusable prompt

> Read AGENTS.md, .ai/STATE.md, and .ai/NEXT.md. The challenge is [paste challenge]. Identify the nearest verified preset and implement the smallest end-to-end user journey that solves it. Add the schema migration and Nest DTOs, implement permission checks and business logic in Nest, regenerate the API client, and build a Persian RTL screen with realistic data. Use existing capabilities where possible. Run unit, API and browser checks for the new behavior and update the handoff with evidence and remaining work.
