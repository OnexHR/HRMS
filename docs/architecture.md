# Architecture

## Workspace boundaries

| Workspace        | Path              | Responsibility                               |
| ---------------- | ----------------- | -------------------------------------------- |
| `@hrms/frontend` | `frontend`        | HRMS website (React/Vite)                    |
| `@hrms/backend`  | `backend`         | HTTP API (Express/Mongoose)                  |
| `@hrms/shared`   | `packages/shared` | Framework-agnostic types, constants, schemas |

Dependency direction:

```text
frontend ──┐
           ├──> @hrms/shared
backend  ──┘
```

- `frontend` never imports from `backend`.
- `backend` never imports from `frontend`.
- `shared` does not depend on either workspace.
- No circular workspace dependencies.

## Frontend layout

- `src/app/providers` — application-wide providers.
- `src/app/routes` — route definitions and guards.
- `src/components/ui` — reusable presentation primitives.
- `src/components/layouts` — page shells.
- `src/components/navigation` — navigation-specific components.
- `src/components/common` — shared presentational helpers.
- `src/context` — React context definitions/providers.
- `src/hooks` — reusable hooks.
- `src/pages` — route-level screens grouped by audience.
- `src/features` — feature modules (components, hooks, services, types).
- `src/lib` — framework-agnostic client utilities (HTTP client, env, helpers).
- `src/types` — frontend-only type definitions that are not shared.
- `src/styles` — global styles and design tokens.

## Backend layout

- `src/config` — environment and database configuration.
- `src/middleware` — Express middleware.
- `src/modules/<module>` — feature modules. When implemented, each module may
  contain `controllers/`, `services/`, `models/`, `routes/`, and `validators/`,
  plus an `index.js` entry point.
- `src/shared/constants` — backend-specific constants.
- `src/shared/errors` — error types and helpers.
- `src/shared/helpers` — shared backend helpers.
- `src/utils` — small stateless utilities.
- `src/app.js` — Express application configuration only.
- `src/server.js` — process startup, database connection, graceful shutdown.

API routes will be versioned under `/api/v1`.

## Shared package layout

- `src/types` — shared domain and API types.
- `src/constants` — shared constant values.
- `src/schemas` — shared validation schemas.
- `src/index.ts` — public barrel export.

The package is compiled to `dist/` by TypeScript and consumed through the
`@hrms/shared` package name. The root `postinstall` script builds it so the
workspaces can import it immediately after `npm install`.

## Conventions

- Frontend: TypeScript, functional React components, Tailwind utility classes.
- Backend: JavaScript ES Modules, controllers → services → models.
- Keep authorization and validation rules centralized; do not duplicate them
  across workspaces.
- Prefer adding a module to `packages/shared` when both applications need the
  same definition.
