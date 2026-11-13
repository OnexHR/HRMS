# HRMS

Runnable HRMS monorepo with a React/Vite frontend, an Express/Mongoose API,
and shared TypeScript schemas.

## Requirements

- Node.js 20.19+ and npm 10+
- A reachable MongoDB instance (local MongoDB or MongoDB Atlas)

## Configure

From the repository root, install the workspaces and copy the environment
template if you do not already have the backend config:

```cmd
npm install
if not exist backend\.env copy backend\.env.example backend\.env
if not exist frontend\.env echo VITE_API_BASE_URL=http://localhost:4000>frontend\.env
```

Edit `backend\.env` and set:

- `MONGODB_URI` to the actual MongoDB connection string (or use `MONGO_URI`)
- `JWT_SECRET` to a private random secret of at least 32 characters
- `EMPLOYEE_ADMIN_EMAIL` and `EMPLOYEE_ADMIN_PASSWORD` for the initial System
  Admin; the password must have at least 8 characters, uppercase, lowercase,
  a number, and a special character

The backend requires MongoDB and a JWT secret; it exits rather than starting
without them or when the database connection fails. `frontend\.env` defaults
the API origin to `http://localhost:4000`.

## Seed the System Admin

After setting the backend environment values and starting MongoDB, run this
from the repository root:

```cmd
npm run seed
```

The seed creates or updates the configured System Admin and stores passwords
as bcrypt hashes. It does not create staff accounts by default. There is no
public registration or admin-provisioning API; only the seeded System Admin
can create employee and manager accounts through the admin console.

Optional demo staff can be seeded only when explicitly enabled in
`backend\.env` with `SEED_DEMO=true` and a policy-compliant
`EMPLOYEE_DEMO_PASSWORD`. Demo manager and employee emails can be set with
`EMPLOYEE_DEMO_MANAGER_EMAIL` and `EMPLOYEE_DEMO_EMPLOYEE_EMAIL`.

## Start the application

From the repository root:

```cmd
npm run dev
```

This builds `@hrms/shared`, starts the migrated API at
`http://localhost:4000`, and starts the frontend at `http://localhost:5173`.
Open the frontend URL to sign in.

To run either workspace separately:

```cmd
npm run dev:backend
npm run dev:frontend
```

## API contract

The migrated frontend talks to the baseline backend started by
`backend\server.js`. Its employee API is rooted at `/api/employee` and returns
the legacy top-level response shapes (not the `{ success, data }` envelope).
The frontend constructs this contract using
`VITE_API_BASE_URL` + `/api/employee`; file upload helpers use `/api/upload`.

The separate, in-progress implementation in `backend\src` uses `/api/v1` and a
different response envelope. It is not served by `npm run dev` and is not the
contract used by the migrated frontend. Do not mix the two implementations.

## Verify

```cmd
npm run test
npm run typecheck
npm run build
```

`npm run test` runs the backend API tests and shared-package tests.
