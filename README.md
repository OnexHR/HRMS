# HRMS

Multi-tenant HRMS product monorepo. This repository currently contains the
project structure, workspace configuration, and build tooling. Business
features will be implemented in later steps.

## Architecture

```text
HRMS/
├── apps/
│   ├── frontend/   React + TypeScript + Vite + Tailwind CSS v4
│   └── backend/    Node.js + Express + MongoDB (Mongoose)
├── packages/
│   └── shared/     TypeScript types, constants, and schemas
├── docs/
├── .gitignore
├── .prettierrc
├── .prettierignore
├── package.json
├── package-lock.json
└── README.md
```

The monorepo is managed with **npm workspaces**. There is a single root
`package-lock.json`; `package-lock.backup.json` is kept as a backup and is not
used by npm.

## Technology stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS v4, React Router, Axios,
Lucide React, React Hook Form, Zod.

**Backend:** Node.js, Express, JavaScript ES Modules, MongoDB, Mongoose.

**Shared:** TypeScript types, constants, and validation schemas.

## Prerequisites

- Node.js 20.19+ (tested with Node.js 24)
- npm 10+
- MongoDB (only required once backend features connect to a database)

## Installation

From the repository root:

```cmd
npm install
```

This installs all workspace dependencies and builds `@hrms/shared` into
`packages/shared/dist` via the root `postinstall` script.

## Environment configuration

```cmd
copy apps\backend\.env.example apps\backend\.env
```

Set `MONGODB_URI`, `CORS_ORIGIN`, and other values in `apps/backend/.env`.
Never commit `.env` files; only `.env.example` files are tracked.

The frontend reads `VITE_API_URL` when it is added to
`apps/frontend/.env` (for example `http://localhost:4000/api/v1`).

## Running the applications

### Both applications from the root

```cmd
npm run dev
```

The shared package is built first, then the frontend and backend start
together with `concurrently`.

### Frontend only

```cmd
npm run dev:frontend
```

or independently:

```cmd
cd apps\frontend
npm run dev
```

### Backend only

```cmd
npm run dev:backend
```

or independently:

```cmd
cd apps\backend
npm run dev
```

The backend starts even when `MONGODB_URI` is not set; it logs a warning instead
of connecting. Set `MONGODB_URI` to enable the database connection.

## Build, lint, and test

```cmd
npm run build       # build shared package + frontend
npm run lint        # ESLint across the workspaces
npm run test        # run workspace tests when they exist
npm run typecheck   # type-check workspaces that expose typecheck
npm run format      # Prettier
npm run format:check
```

## Workspace layout conventions

- Application code lives only in `apps/frontend` and `apps/backend`.
- Shared definitions live in `packages/shared` and are imported as
  `@hrms/shared`.
- Frontend and backend never import each other's implementation files.
- Empty folders are preserved with `.gitkeep` until they receive code.

## Dependency security

The root `package.json` pins `minimatch` to `11.0.8` through npm `overrides`.
Run the audit at any time:

```cmd
npm ls minimatch
npm audit
```

See `docs/architecture.md` for more detail on workspace boundaries.
