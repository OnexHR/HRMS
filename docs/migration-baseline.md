# HRMS migration baseline (LearnILmWorld → HRMS)

Status: working baseline, uncommitted. Prepared for the initial migration
checkpoint. Nothing has been staged or committed.

Source: `C:\Users\Ankit Das\Desktop\learnILM\LearnILmWorld` (read-only, untouched)
Target: `C:\Users\Ankit Das\Desktop\HRMS`

## What was migrated

### Backend — 36 files copied

| Area | Files |
| --- | --- |
| `backend/controllers/employee/` | 9 |
| `backend/controllers/uploadController.js` | 1 |
| `backend/services/employee/` | 8 |
| `backend/models/employee/` | 9 |
| `backend/validators/employee/` | 5 |
| `backend/routes/employeeRoutes.js`, `routes/uploadRoutes.js` | 2 |
| `backend/middleware/employeeAuth.js` | 1 |
| `backend/seed/seedEmployees.mjs` | 1 |

The migrated HRMS API is mounted under `/api/employee`; upload helpers stay
under `/api/upload`. Manager account creation (`POST /team`) is intentionally
not exposed so that only the seeded System Admin can provision employee or
manager accounts. Managers can still assign existing employees to their teams.

### Frontend — 61 files copied

| Area | Files |
| --- | --- |
| `frontend/src/pages/EmployeeDashboard/` | 23 |
| `frontend/src/pages/ManagerDashboard/` | 26 |
| `frontend/src/pages/admin/AdminEmployees.tsx` | 1 |
| `frontend/src/pages/StudentDashboard/components/PasswordSettingsControls.tsx` | 1 |
| `frontend/src/components/MeetingDialog.tsx`, `EmployeePrivateRoute.tsx` | 2 |
| `frontend/src/contexts/EmployeeAuthContext.tsx` | 1 |
| `frontend/src/hooks/useActiveMeeting.tsx`, `useChangePassword.tsx` | 2 |
| `frontend/src/lib/employeeApi.ts` | 1 |
| `frontend/src/types/Employee.ts` | 1 |
| `frontend/src/utils/getImageUrl.ts`, `getInitials.ts` | 2 |
| `frontend/src/assets/logo2.png` | 1 |

### Adapter files written for the baseline

- `frontend/src/pages/LoginPage.tsx` — minimal HRMS sign-in (employee/manager + admin tabs)
- `frontend/src/pages/AdminHome.tsx` — admin shell around `AdminEmployees`
- `frontend/src/components/AdminPrivateRoute.tsx` — admin session guard
- `frontend/src/contexts/AuthContext.tsx` — shim for `useAuth().logout()` used by the copied sidebars
- `backend/server.js` — HRMS-only Express entry point
- `backend/config/env.js` — donor-compatible env validation (`MONGO_URI` or `MONGODB_URI`)
- `frontend/.env.example`, updated `backend/.env.example`

## Features present

- Employee: dashboard, attendance (check-in/out, breaks, month view, live timer),
  leave balance/history/apply, tasks and attachments, queries, profile and image
  upload, password change, meeting dialog + active-meeting state.
- Manager: dashboard, team attendance and monthly reports, task assignment and
  review, team member management, leave approvals, queries/reviews, profile and
  password change, reports.
- Admin: employee list with filters/pagination, create/edit employee, activate/
  deactivate, stats, manager assignment.
- Shared: employee JWT realm, employee-admin JWT realm, R2 signed uploads.

## Minimal changes made to donor code

1. `backend/middleware/employeeAuth.js` — removed the website platform-token
   realm (`models/User.js` dependency). HRMS keeps only employee + employee-admin
   JWTs. Re-introduce platform SSO later if needed.
2. `backend/models/employee/Admin.js`, `Employee.js` — Mongoose 9 no longer
   supports `next` in async `pre("save")` hooks; hooks now return a promise.
3. `backend/seed/seedEmployees.mjs` — requires explicit System Admin
   credentials; demo staff are opt-in and use an explicit password.
4. `frontend/src/lib/employeeApi.ts` — `employeeAdminApi` reads
   `employee_admin_token` first, then the legacy platform `token`.
5. `frontend/src/hooks/useActiveMeeting.tsx` — only employee/manager sessions
   poll `/meetings/active`. An admin session would receive a 401 there and the
   axios interceptor would clear the admin token.
6. `frontend/src/App.tsx`, `index.css`, `index.html` — HRMS routes, Tailwind 4
   theme tokens, fonts.
7. `backend/package.json` — baseline `start`/`dev`/`seed` scripts plus
   `start:refactor`/`dev:refactor`/`seed:refactor`; added `bcryptjs`,
   `moment-timezone`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.
8. `frontend/package.json` — added `moment-timezone`.

The donor working tree had pre-existing edits in
`services/employee/attendance.service.js` and
`pages/EmployeeDashboard/components/TodayAttendance.tsx`; those files were
copied as-is, and the donor repository was not modified.

## How to run

```cmd
npm install

rem configure backend\.env and frontend\.env from their examples; start MongoDB
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env

rem set MONGODB_URI, JWT_SECRET, EMPLOYEE_ADMIN_EMAIL and EMPLOYEE_ADMIN_PASSWORD
npm run seed
npm run dev
```

Set `SEED_DEMO=true` and `EMPLOYEE_DEMO_PASSWORD` to explicitly add demo staff.
`npm run dev` runs the migrated backend and frontend together.

The in-progress refactor under `backend/src` is preserved and still runnable
with `npm run dev:backend:refactor`, but it is **not** wired to the migrated
frontend. Do not mix `/api/v1` (refactor, wrapped responses) with
`/api/employee` (baseline, unwrapped responses) without a frontend contract
change.

## Verification performed

- `frontend`: `npm run typecheck` — passed.
- `frontend`: `npm run build` — passed (bundle-size warning only).
- `backend`: `npm test` — 4 migrated API tests and 42 shared tests passed,
  including System Admin login/creation, role and manager assignment, account
  activation, password hashing, and seed behavior against an in-memory MongoDB.
- `backend` and `frontend`: targeted ESLint on changed files passed. Repository
  lint still reports pre-existing errors in other migrated files.
- `root`: `npm run build` passed; the frontend bundle-size warning remains.

## Known issues / pending (do not block parallel work)

1. Legacy defects intentionally carried over: manager query relationship,
   half-day leave counting, cancelled-leave counter restoration, attendance/
   leave consistency, IDOR/auth gaps, file metadata exposure, MIME validation.
   Account creation is limited to the seeded System Admin; managers may assign
   existing team members but cannot create accounts.
2. `/api/upload/*` endpoints are unauthenticated in the donor and remain so.
   They also require R2 env vars; profile/task uploads fail until configured.
3. Donor `models/User.js` / platform admin realm is not migrated. Only employee
   and employee-admin accounts can sign in.
4. Website admin console, student/trainer/sales/payments/marketing screens were
   intentionally not migrated. Admin functionality in this baseline is
   `AdminEmployees` only.
5. The login screen is a minimal adapter: no Google/Facebook OAuth, signup,
   email verification or forgot-password flow.
6. Mongoose 9 emits `findOneAndUpdate({ new: true })` deprecation warnings.
7. `getImageUrl.ts` still expects a legacy ImageKit base URL; profile images use
   the R2 signed-URL endpoints instead.
8. Frontend bundle is a single ~1.4 MB chunk; code splitting is a later task.
9. Native install scripts are skipped by the workspace npm policy; the baseline
   uses `bcryptjs`, but `backend/src` (refactor) may need `bcrypt` approved
   before it can run.
10. Focused API tests now cover admin-only account creation, role and manager
    assignment, account status, password hashing, login, and seed behavior.

## Ownership boundaries (parallel work)

Avoid editing files outside your area without coordinating with the owner.

- **Developer A — Backend**
  - `backend/controllers/**`, `backend/services/**`, `backend/models/**`,
    `backend/validators/**`, `backend/routes/**`, `backend/middleware/**`,
    `backend/seed/**`, `backend/config/**`, `backend/server.js`
  - Owns API contracts under `/api/employee`.
  - Does not edit `backend/src/**` (refactor) without Developer D.

- **Developer B — Employee frontend**
  - `frontend/src/pages/EmployeeDashboard/**`
  - Uses shared hooks/types/lib owned by D; requests changes rather than editing them.

- **Developer C — Manager/Admin frontend**
  - `frontend/src/pages/ManagerDashboard/**`
  - `frontend/src/pages/admin/**`, `frontend/src/pages/AdminHome.tsx`

- **Developer D — Integration, shared contracts & QA**
  - `frontend/src/App.tsx`, `main.tsx`, `index.css`, `index.html`
  - `frontend/src/contexts/**`, `frontend/src/hooks/**`, `frontend/src/lib/**`,
    `frontend/src/types/**`, `frontend/src/utils/**`
  - `frontend/src/components/MeetingDialog.tsx`, `EmployeePrivateRoute.tsx`,
    `AdminPrivateRoute.tsx`
  - `frontend/src/pages/LoginPage.tsx`, `pages/StudentDashboard/components/**`
  - `backend/src/**` (future refactor), `packages/shared/**`, docs, CI/QA.
  - Owns route wiring, auth seams, shared API client and the frontend/backend
    contract.

Rule of thumb: A changes the server; B and C change their screens; D changes
shared plumbing and arbitrates contract changes. Cross-area changes go through D.
