# HRMS Migration Plan — Stage 1 Foundation Migration, Stage 2 Enterprise Target

**Status:** proposal, awaiting approval. No `frontend/`, `backend/`, `packages/shared/` file has been modified.
**Source (STRICTLY READ-ONLY):** `C:\Users\Ankit Das\Desktop\learnILM\LearnILmWorld`
**Target:** `C:\Users\Ankit Das\Desktop\HRMS`
**Path legend:** every target path is relative to `C:\Users\Ankit Das\Desktop\HRMS\`.

| Stage | Goal | Output |
| --- | --- | --- |
| **Stage 1 — Foundation migration** | Move the complete existing HRMS into this repository, adapt it to the target stack, fix essential bugs and security holes, and make it run end to end. | A working HRMS, complete against the donor feature set, ready for the initial Git commit. |
| **Stage 2 — Enterprise transformation** | Evolve the Stage 1 foundation into a multi-tenant, five-role enterprise HRMS. | The approved enterprise architecture, delivered incrementally by the four-person team. |

This document is the execution contract for **Stage 1** and the roadmap for **Stage 2**. Stage 2 decisions are recorded so Stage 1 does not close doors.

---

## 0. Executive summary

The donor contains a complete, self-contained HRMS subsystem: **63 endpoints**, **9 models**, **9 controllers**, **8 services + 1 storage helper**, **5 validators**, **1 auth middleware**, **1 seed**, **55 domain tests**, a full employee dashboard (25 files), a manager dashboard (26 files), and one admin employee console (705 lines). It has **zero dependency on the website's `User` model** except inside `middleware/employeeAuth.js`.

The donor was designed as a **two-role (`employee`, `manager`), single-tenant, single-shift** system with a separate `EmployeeAdmin` model and a second JWT realm. Stage 1 keeps that shape (with `admin` added as a third role and a single identity) and adds only **non-breaking seams** for Stage 2.

### 0.1 Stage 1 principles

1. **Feature parity first.** Every donor endpoint and every donor screen must exist and work. Nothing is dropped because it is unused by the donor UI.
2. **Adapt, do not copy.** Express 5, Mongoose 9, bcrypt 6, React 19, RRD 7, Tailwind 4, TypeScript 6. Donor code that depends on Express 4 / RRD 6 / Tailwind 3 behaviour is rewritten.
3. **Fix, do not reproduce.** The known donor bugs and IDOR holes are fixed during the port, with tests.
4. **No fake features.** No placeholder pages, no dead buttons, no generated meeting links. A screen ships only when its API works.
5. **Seams, not architecture.** Stage 1 does **not** build org management, five-role RBAC, configurable policy, or a leave ledger. It does keep module boundaries, centralized authorization, and a single tenant field so Stage 2 is an extension, not a rewrite.
6. **The shared package serves the migration.** It is trimmed to what both sides genuinely use. Speculative enterprise contracts are deferred.

### 0.2 Stage 1 boundary (explicit non-goals)

| Not in Stage 1 | Why | Where it lands |
| --- | --- | --- |
| Organization CRUD/UI, invitations, memberships | Enterprise feature | Stage 2, Wave 1 |
| Five-role RBAC (`system_admin`, `org_admin`, `hr_manager`, `manager`, `employee`) | Enterprise feature | Stage 2, Wave 2 |
| Tenant onboarding / tenant switching | Enterprise feature | Stage 2, Wave 1–3 |
| Configurable attendance policy UI | Donor has fixed Asia/Kolkata rules | Stage 2, Wave 4 |
| Append-only leave ledger | Donor uses counters | Stage 2, Wave 5 |
| Multi-level approval workflows | Donor is single-manager approval | Stage 2, Wave 5 |
| `StorageProvider` abstraction, object storage | Donor uses R2 presigned URLs | Stage 1 uses GridFS directly; Stage 2 wraps it |
| Org-scoped analytics, audit console, rate limiting | Enterprise hardening | Stage 2, Wave 7–8 |
| Website admin (`Users`, `Courses`, `Careers`, `Sessions`, `Reviews`, `Hero Tutors`, `Students`, `Trainers`) | Not HRMS | **Dropped permanently** |
| Anonymous R2 upload endpoints | Security hole | **Replaced** by authenticated GridFS endpoints |

### 0.3 Decisions requiring approval

| ID | Decision | Recommendation | Alternative |
| --- | --- | --- | --- |
| **D1** | Tenant seam in Stage 1 | Add `organizationId` to every domain model, a singleton `Organization` document, and `req.auth.organizationId` from day one. No org UI, no membership, no switching. | Pure donor schema; Stage 2 backfills. Cheaper now, but every query must be swept later. |
| **D2** | Stage 1 roles | `admin \| manager \| employee`, additive (admin ⊇ manager ⊇ employee), one permission matrix. | Donor's two roles + separate admin model (rejected: dual realm). |
| **D3** | Admin identity | Fold `EmployeeAdmin` into `Employee.role = "admin"`. One login, one token, one `/auth/me`. | Keep a second model/realm (rejected: duplicate auth and UI). |
| **D4** | Files | GridFS through `multer` memory upload; authenticated `/api/v1/files` endpoints; no signed URLs. | Local disk (rejected: multi-instance unsafe) / R2 (rejected: anonymous URLs). |
| **D5** | Leave | Donor counters (`leaveBalances`) with fixed side effects; fix cancel/approval races. | Ledger now (deferred to Stage 2). |
| **D6** | Attendance policy | Donor constants (Asia/Kolkata, 09:30, 18:00 OT), overridable by env only. | Org-configurable policy (Stage 2). |
| **D7** | API contract | `/api/v1`, `{ success, data, error }` envelope, paginated `{ items, meta }`. | Donor bare payloads (rejected: inconsistent with target app). |
| **D8** | Validation | Shared Zod schemas for request shape; donor JS validators retained for domain rules. | Zod only (loses donor-specific rules) / JS only (duplicate). |
| **D9** | Shared package | Keep and correct 19 modules; defer 6; drop 4. See §5. | Keep all 28 (rejected: unused enterprise surface). |
| **D10** | Stage 1 tests | Port 55 donor tests; add auth/IDOR/file/leave/query tests; API tests against a test Mongo via `fetch`. | Playwright E2E (optional, not required for commit). |

**D1 is the only decision that adds Stage 1 scope.** It costs roughly two days and removes a security-critical Stage 2 sweep. If rejected, every model and query is migrated donor-pure and Stage 2 performs the backfill.

### 0.4 Phase 1 review findings and disposition

The Phase 1 shared package is uncommitted. Stage 1 Phase A1 corrects it before any consumer depends on it.

| Finding | Disposition in Stage 1 |
| --- | --- |
| **C1** `updateEmployeeSchema` default leakage | **Fix (blocking).** Derive create/update from a defaults-free field object. Regression test. |
| **H1** no role-assignment ceiling | **Fix (blocking).** `canAssignRole(actor, target)` for 3 roles; self-role change forbidden; managers may only create `employee`. |
| **H2** unscoped `employee:read` | **Fix (blocking).** Split into `employee:read:self`, `employee:read:team`, `employee:read:all`. `resolveReadScope(role)`. |
| **H3** policy defaults missing `workingWeekdays` | **Resolved by scope change.** Drop `ATTENDANCE_POLICY_DEFAULTS`; keep individual constants + `WORKING_WEEKDAYS`. Stage 2 reintroduces a typed policy. |
| **H4** `FileMetadata.key` exposed | **Fix (blocking).** `FileMetadata` becomes server-only; all DTOs use `FileResource`. |
| **H5** no tests | **Fix (blocking).** Shared `node --test` suite against `dist`. |
| **M1** half-day on weekend = 0.5 | **Fix.** Return `0` for non-working days. |
| **M5** MIME allowlist not enforced | **Fix.** Schema normalizes; file service enforces allowlist + size. |
| **M7** `on_break`/`on_call` as persisted status | **Preserve donor behaviour** (donor stores them). Split in Stage 2. |
| **M8** free-form error code | **Fix.** `API_ERROR_CODES` + `ApiErrorCode`. |
| **M14** org settings schema / auth principal | **Defer** org settings. Add minimal `AuthPrincipal`. |
| **M17** unknown keys stripped silently | **Fix.** `.strict()` on auth/employee/role-bearing schemas; strip elsewhere. |
| Remaining Medium/Low | Fix opportunistically in A1; otherwise defer with the consumer. |

---

## 1. Stage 2 target architecture (preserved, not implemented in Stage 1)

These are the approved enterprise decisions. Stage 1 must not contradict them.

| Area | Stage 2 target |
| --- | --- |
| Tenancy | `Organization` is the tenant root. Every domain record carries `organizationId`. Strict query scoping; no cross-tenant reads, ever. |
| Identity | One identity (`Employee`/membership) across the platform. System administrators are platform-level, not org members. |
| Roles | `system_admin`, `org_admin`, `hr_manager`, `manager`, `employee`. Additive permission matrix; assignment ceiling; no self-escalation. |
| Attendance | Organization-configurable policy (timezone, shift, grace, half-day, overtime, breaks, working weekdays) with department overrides and a holiday calendar. |
| Leave | Append-only ledger (`allocation`, `accrual`, `carry_forward`, `usage`, `reversal`, `adjustment`, `expiry`), derived balances, idempotent entries. |
| Approvals | Configurable, multi-level (manager → HR), delegation, audit trail. |
| Storage | `StorageProvider` interface; GridFS adapter first; optional object storage later. No signed URL in shared DTOs. |
| Reporting | Org-scoped dashboards, team reports, export, scheduled summaries. |
| Security | Audit log, rate limiting, session/refresh tokens, password policy, tenant isolation tests, observability. |

### 1.1 Stage 1 seams that protect Stage 2

| Seam | Stage 1 implementation | Stage 2 change |
| --- | --- | --- |
| Tenant field | `organizationId` on models; singleton `Organization`; `req.auth.organizationId`; all service filters include it. | Add org CRUD, memberships, invitations. No data backfill. |
| RBAC | `permissions.js` with one matrix; every route uses `authorize(permission)`. | Replace matrix and expand roles; route code unchanged. |
| Identity | Single `Employee` collection, `role` enum `admin\|manager\|employee`. | Expand enum; add `Membership`; map `admin → org_admin`. |
| Domain modules | `modules/<domain>/{routes,controllers,services,models}`. | Add modules; existing boundaries hold. |
| Attendance policy | Constants in `@hrms/shared` + env overrides; one `resolvePolicy()` helper. | `resolvePolicy(orgId)` reads settings; callers unchanged. |
| Leave | Counters behind `leaveService`. | Swap service internals to ledger; API shape stays. |
| Storage | `filesService` with private `key`; public `FileResource`. | Introduce `StorageProvider`; GridFS adapter wraps `filesService`. |
| Error envelope | `ok()` / `fail()` + `ApiError`. | Add codes; clients unchanged. |

---

## 2. Stage 1 complete migration inventory

### 2.1 Backend inventory

All donor paths below are under `backend/`.

| Subsystem | Donor files | Lines | Stage 1 action |
| --- | --- | --- | --- |
| Config | `config/env.js` | 11 | Extend (`JWT_SECRET`, seed, upload, timezone) |
| Errors | `errors/ApiError.js` | 9 | Move + extend |
| Auth middleware | `middleware/employeeAuth.js` | 126 | **Rewrite** as one realm, 3 roles |
| Auth controller/service | `controllers/employee/authController.js`, `services/employee/auth.service.js` | 146 | Adapt; drop `Admin` |
| Employee/Admin controller | `controllers/employee/adminController.js` | 371 | Split into employees / team / tasks |
| Profile controller | `controllers/employee/profileController.js` | 88 | Adapt |
| Attendance | controller 137, service 968, constants 38, validator 92, model 58 | 1,293 | Port + fix |
| Leave | controller 93, service 146, validator 63, model 49 | 351 | Port + fix |
| Tasks | controller 197, service 116, model 37 | 350 | Port |
| Queries | controller 79, service 48, model 37 | 164 | Port + fix team filter |
| Meetings | controller 309, model 31 | 340 | Port; remove URL generator |
| Activity | service 27, model 40 | 67 | Port |
| Dashboards | controller 67, service 304 | 371 | Port |
| Employee model | `models/employee/Employee.js` | 87 | Adapt (role + tenant + avatar/file ids) |
| Counter | `models/employee/Counter.js` | 16 | Move to shared models |
| Admin model | `models/employee/Admin.js` | 33 | **Drop** (fold into Employee) |
| Storage helper | `services/employee/s3.service.js` | 27 | **Drop** (replaced by GridFS) |
| Validators | `util.validator.js` | 53 | Rewrite as error/validation helpers |
| Routes | `routes/employeeRoutes.js` | 165 | Re-home under `/api/v1` |
| Seed | `seed/seedEmployees.mjs` | 94 | **Rewrite** (no hardcoded creds) |
| Tests | `test/employee/employee.test.js` | 707 | Port + extend (55 tests) |
| Uploads | `controllers/uploadController.js`, `routes/uploadRoutes.js` | 68 | **Drop**; replace with authenticated files module |
| Website admin/users/courses/etc. | `models/User.js`, `routes/adminRoutes.js`, `routes/userRoutes.js`, `controllers/userController.js`, … | ~15k | **Drop permanently** |

**Backend total to migrate:** ~4,900 lines (including tests), plus a new files module and seed.

### 2.2 Frontend inventory

All donor paths below are under `frontend/src/`.

| Group | Files | Lines | Stage 1 action |
| --- | --- | --- | --- |
| API client | `lib/employeeApi.ts` | 80 | Rewrite as `lib/api.ts` (single token, envelope unwrap) |
| Auth context | `contexts/EmployeeAuthContext.tsx` | 125 | Rewrite as `features/auth/AuthContext.tsx` |
| Route guard | `components/EmployeePrivateRoute.tsx` | 36 | Rewrite as `app/routes/ProtectedRoute.tsx` |
| Domain types | `types/Employee.ts` | 321 | Split: shared DTOs + local view models |
| Password hook | `hooks/useChangePassword.tsx` | 39 | Adapt (single realm) |
| Active meeting | `hooks/useActiveMeeting.tsx` | 230 | Port |
| Meeting dialog | `components/MeetingDialog.tsx` | 543 | Port; no generated link |
| Shared utils | `utils/getInitials.ts`, `utils/getImageUrl.ts` | ~70 | Port / replace file URL resolver |
| Attendance rules | `pages/EmployeeDashboard/components/attendanceRules.ts` | 328 | **Move to shared**; frontend re-export |
| Attendance live | `pages/EmployeeDashboard/components/attendanceLive.ts` | 33 | Port to feature module |
| Employee dashboard | 25 files (`EmployeeDashboard.tsx`, 19 components, `Calendar.tsx`, 4 sections) | ~4,770 | Port; Calendar placeholder replaced with real calendar |
| Manager dashboard | 26 files (`ManagerDashboard.tsx`, 19 components, 6 sections) | ~5,130 | Port |
| Admin employee console | `pages/admin/AdminEmployees.tsx` | 705 | Adapt into new admin console |
| Admin shell | `pages/admin/AdminDashboard.tsx` | 136 | Replace with HRMS admin layout |
| Login | `pages/Login.tsx` (only the employee/admin branches) | ~777 total | New HRMS `/login` page |
| Website admin/pages | `AdminUsers`, `AdminCourses`, `AdminCareers`, `AdminSessions`, `AdminReviews`, `AdminHeroTutors`, `AdminStudents`, `AdminTrainers`, `AdminHome`, all marketing/student/trainer/sales pages | ~40k | **Drop permanently** |
| Platform auth | `contexts/AuthContext.tsx`, `LoginModalContext`, `CurrencyContext`, `PrivateRoute`, `GoogleOAuthProvider` | ~500 | **Drop** (not HRMS) |
| Brand assets | `assets/logo2.png` | — | Do not copy; use neutral HRMS mark |

**Frontend total to migrate:** ~11,800 lines across ~61 files.

### 2.3 Donor frontend routes

| Route | Screen | Stage 1 route |
| --- | --- | --- |
| `/employee` | Dashboard (attendance, summary, activity, meetings) | `/employee` |
| `/employee/my-tasks` | Tasks + queries | `/employee/tasks` |
| `/employee/apply-leave` | Leave balance, form, history | `/employee/leave` |
| `/employee/profile` | Profile + avatar | `/employee/profile` |
| `/employee/settings` | Change password | `/employee/settings` |
| `/manager` | Manager dashboard | `/manager` |
| `/manager/assigned-tasks` | All assigned tasks | `/manager/tasks` |
| `/manager/team-members` | Team directory + detail | `/manager/team` |
| `/manager/reports` | Monthly team reports | `/manager/reports` |
| `/manager/queries` | Query review + calendar | `/manager/queries` |
| `/manager/profile` | Profile | `/manager/profile` |
| `/manager/settings` | Change password | `/manager/settings` |
| `/admin/employees` | Staff directory + CRUD | `/admin/employees` |
| `/admin` | Website admin home | **Replaced** by HRMS admin overview |
| — | No HRMS login page (global modal) | `/login` (new) |

`EmployeeDashboard/Calendar.tsx` is a **placeholder** in the donor and is not routed. Stage 1 must not ship a placeholder: implement a real month view backed by `GET /api/v1/calendar/events`, reusing the manager `SimpleCalendar` component.

### 2.4 All 63 donor endpoints (the parity checklist)

Access column = Stage 1 access. `all` means every authenticated employee.

#### Auth and profile (7)

| # | Method | Path (donor) | Access | Consumer | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | POST | `/auth/admin-login` | public | login | **Replaced** by unified `/auth/login` |
| 2 | POST | `/auth/login` | public | login | Keep; returns `{token, employee}` |
| 3 | GET | `/auth/me` | admin (bug) | — | **Fixed** as unified `GET /auth/me` |
| 4 | PUT | `/auth/admin/change-password` | admin | settings | **Replaced** by unified change-password |
| 5 | PUT | `/auth/change-password` | employee | settings | Keep |
| 6 | GET | `/me` | employee | profile | Keep |
| 7 | PUT | `/me` | employee | profile | Keep |

#### Admin / employee management (9)

| # | Method | Path | Access | Consumer | Notes |
| --- | --- | --- | --- | --- | --- |
| 8 | GET | `/admin/stats` | admin | admin overview | Keep |
| 9 | GET | `/admin/managers` | admin | employee form | Keep |
| 10 | POST | `/admin/employees` | admin | admin employees | Keep; role ceiling |
| 11 | GET | `/admin/employees` | admin | admin employees | Keep; paginated |
| 12 | GET | `/admin/employees/:id` | admin | admin edit | Keep |
| 13 | PUT | `/admin/employees/:id` | admin | admin edit | Keep; C1 fix |
| 14 | DELETE | `/admin/employees/:id` | admin | deactivate | Keep (soft delete) |
| 15 | PATCH | `/admin/employees/:id/status` | admin | reactivate | Keep |
| 16 | POST | `/admin/tasks` | admin | admin assign | Keep (no UI in donor; keep API + add action) |

#### Attendance — self (7)

| # | Method | Path | Access | Consumer |
| --- | --- | --- | --- | --- |
| 17 | POST | `/attendance/check-in` | self | TodayAttendance |
| 18 | POST | `/attendance/check-out` | self | TodayAttendance |
| 19 | POST | `/attendance/break/start` | self | TodayAttendance |
| 20 | POST | `/attendance/break/end` | self | TodayAttendance |
| 21 | GET | `/attendance/today` | self | TodayAttendance |
| 22 | GET | `/attendance/month` | self | AttendanceDetails |
| 23 | GET | `/attendance/summary` | self | work summary |

#### Leave — self (6)

| # | Method | Path | Access | Consumer |
| --- | --- | --- | --- | --- |
| 24 | GET | `/leave/balance` | self | LeaveBalance |
| 25 | POST | `/leave` | self | NewLeaveRequestForm |
| 26 | POST | `/leave/draft` | self | form (draft) |
| 27 | PUT | `/leave/:id/draft` | self, owner | history |
| 28 | POST | `/leave/:id/cancel` | self, owner | history |
| 29 | GET | `/leave/history` | self | LeaveHistoryTable |

#### Tasks (7)

| # | Method | Path | Access | Consumer |
| --- | --- | --- | --- | --- |
| 30 | GET | `/tasks` | self | TasksDetails |
| 31 | POST | `/tasks` | manager+ | AssignTaskForm |
| 32 | GET | `/tasks/team` | manager+ | AllTasksTable |
| 33 | GET | `/tasks/team/summary` | manager+ | TaskSummary |
| 34 | GET | `/tasks/:id` | assignee / assigner | TasksDetails |
| 35 | GET | `/tasks/:taskId/attachments/:index/url` | task participants | attachment link |
| 36 | PATCH | `/tasks/:id/status` | assignee / assigner | TasksDetails |

#### Queries (5)

| # | Method | Path | Access | Consumer |
| --- | --- | --- | --- | --- |
| 37 | GET | `/queries/team` | manager+ | ManagerQueries |
| 38 | POST | `/queries/:id/review` | manager+ (team) / admin | WriteReview |
| 39 | POST | `/queries` | self | EmployeeQuery |
| 40 | GET | `/queries` | self | AllQueries |
| 41 | GET | `/queries/stats` | self / manager | Querystats |

#### Meetings and calendar (6)

| # | Method | Path | Access | Consumer |
| --- | --- | --- | --- | --- |
| 42 | GET | `/meetings` | participant | MeetingSummary |
| 43 | GET | `/meetings/active` | organizer | useActiveMeeting |
| 44 | POST | `/meetings` | self | MeetingDialog |
| 45 | POST | `/meetings/:id/start` | organizer | MeetingDialog |
| 46 | POST | `/meetings/:id/end` | organizer | MeetingDialog |
| 47 | GET | `/calendar/events` | self | SimpleCalendar |

#### Dashboards and directory (2)

| # | Method | Path | Access | Consumer |
| --- | --- | --- | --- | --- |
| 48 | GET | `/dashboard` | self | EmployeeDashboard |
| 49 | GET | `/colleagues` | self | MeetingDialog |

#### Manager / team (14)

| # | Method | Path | Access | Consumer |
| --- | --- | --- | --- | --- |
| 50 | GET | `/team` | manager+ | My-employee |
| 51 | POST | `/team` | manager+ | team member create |
| 52 | GET | `/team/attendance` | manager+ | TeamAttendanceTable |
| 53 | GET | `/team/available` | manager+ | AvailableEmployees |
| 54 | POST | `/team/assign` | manager+ | add report |
| 55 | DELETE | `/team/assign/:id` | manager+ | remove report |
| 56 | GET | `/team/attendance/stats` | manager+ | CurrentActivity |
| 57 | GET | `/team/attendance/rows` | manager+ | TeamAttendanceTable |
| 58 | GET | `/team/attendance/month` | manager+ | attendance month |
| 59 | GET | `/team/reports` | manager+ | ManagerReports |
| 60 | GET | `/team/member/:id` | manager+, team | team detail |
| 61 | GET | `/team/leave/pending` | manager+ | PendingLeaveRequests |
| 62 | PATCH | `/team/leave/:id/status` | manager+, team | approve/reject |
| 63 | GET | `/managers-dashboard` | manager+ | ManagerDashboard |

**Total: 63/63.** Stage 1 also adds 3 file endpoints (`POST /files`, `GET /files/:id`, `DELETE /files/:id`), for 66 routes.

### 2.5 Models and relationships

| Donor model | Collection | Key fields | Stage 1 changes |
| --- | --- | --- | --- |
| `Employee` | `employees` | email, password, role, firstName, lastName, phone, department (string), designation, employeeCode, manager, job{joinDate,endDate,status,isActive}, personal{...}, profile{bio,imageUrl,dob,address,skills}, leaveBalances{casual,sick,earned,unpaid}{total,used} | Add `organizationId`; role enum `admin\|manager\|employee`; `profile.avatarFileId`; keep string department; keep counters |
| `Attendance` | `employeeattendances` | employee, date, status, checkIn/checkOut, sessions[], breakStart/End, breaks[], breakMinutes, workingMinutes, overtimeMinutes, tasksCompleted, markedBy, note | Add `organizationId`; unique `(employee,date)` retained; fix `markedBy` ref |
| `LeaveRequest` | `employeeleaverequests` | employee, manager, leaveType, dayType, fromDate, toDate, days, reason, contact, attachments[], status, reviewer, note, reviewedAt | Add `organizationId`; attachments become `FileResource` ids |
| `Task` | `employeetasks` | taskId, title, description, assignedTo, assignedBy, dueDate, priority, status, completedAt, attachments[] | Add `organizationId`; attachments become file ids |
| `EmployeeQuery` | `employeequeries` | employee, task, message, status, reviewedBy, review, reviewedAt, attachments[] | Add `organizationId`; fix manager filter |
| `Meeting` | `employeemeetings` | organizer, title, meetingLink, participants[], startTime, endTime, durationMin, status, actualStartedAt/EndedAt, expectedDuration/EndAt, actualDuration | Add `organizationId`; link optional; no generator |
| `ActivityLog` | `employeeactivitylogs` | employee, type, at, meta | Add `organizationId`; align type enum |
| `Counter` | `employeecounters` | key, seq | Add `organizationId` to key (Stage 2 multi-tenant safe) |
| `EmployeeAdmin` | `employeeadmins` | name, email, password, isSuperAdmin, isActive | **Dropped** |
| `Organization` | — | — | **New** (singleton in Stage 1: name, slug, status) |

### 2.6 Tests to preserve

`backend/test/employee/employee.test.js` — 55 `node:test` cases covering:

- leave day counting (including inverted ranges)
- attendance minutes, break cap, late grace
- overtime windows (18:00–24:00, 00:00–09:00), persisted vs live
- check-in/check-out plans, legacy record repair, duplicate checks
- employee validation, manager payload forcing, profile-date rules
- leave validation, balance view, history filters
- task normalization, `canManageTask`
- admin identity resolution (will be replaced by unified auth tests)
- live meeting filters, meeting partner aggregation
- monthly report classification, activity derivation
- meeting URL generation (test **removed** with the generator)
- `normalizeMeetingLink`, `initialQueryStatus`

Stage 1 keeps all cases except the removed URL generator, and adds the security/regression cases in §10.

### 2.7 Dependencies

| Side | Donor | Target | Action |
| --- | --- | --- | --- |
| Backend | Express 4.22 | Express 5.3 | Adapt async error handling, wildcard routes |
| Backend | Mongoose 8.23 | Mongoose 9.12 | Check middleware/aggregation changes |
| Backend | bcryptjs 2.4 | bcrypt 6 | Native module; 72-byte limit enforced |
| Backend | moment-timezone | — | Not needed on backend (numeric minutes) |
| Backend | AWS SDK (R2) | — | **Drop** |
| Backend | — | `multer` (new) | Required for multipart uploads |
| Backend | — | `zod` (declare) | Shared schemas at runtime |
| Frontend | React 18.3 | React 19.3 | Fix legacy patterns, StrictMode double effects |
| Frontend | RRD 6.20 | RRD 7.18 | API compatible; verify splat routes |
| Frontend | Tailwind 3.4 | Tailwind 4.3 | `@import "tailwindcss"`; no config file needed |
| Frontend | moment-timezone | — | Replace with `Intl` helpers |
| Frontend | axios 1.6 | axios 1.21 | Keep |
| Frontend | lucide-react 0.344 | 1.72 | Verify icon names |
| Frontend | recharts, xlsx, bootstrap, react-bootstrap, framer-motion, file-saver | — | **Drop** (unused by HRMS screens) |

### 2.8 Explicitly not migrated

- Website `User` model, auth routes, Google OAuth, student/trainer/sales/offline-sales panels.
- Website admin pages and their APIs (courses, careers, reviews, sessions, hero tutors, students, trainers, users).
- Marketing pages, SEO, chatbot, payments, notifications, email jobs, taxonomy.
- R2/S3 upload controller, presigned URL signer, ImageKit helper.
- Seed demo accounts and credentials (`Admin@12345`, `Manager@6778`, `Employee@123`).
- Brand logo/assets.
- Duplicate/dead UI with no wiring: `StudentBio.tsx` (uses platform `AuthContext`), `EmployeeDashboard/Calendar.tsx` placeholder (replaced), `Querieslist.tsx`, `Querystats.tsx`, `Allqueriestable.tsx`, `DateAndAssignedTasks.tsx` (verify at port time). None of these represent unique functionality; equivalents exist in the live screens.

---

## 3. Stage 1 source → target mapping

### 3.1 Backend

Target root: `backend/src/`.

| Donor | Target | Action |
| --- | --- | --- |
| `config/env.js` | `config/env.js` | Extend: `JWT_SECRET`, `JWT_EXPIRES_IN`, seed values, upload limits, timezone |
| `errors/ApiError.js` | `shared/errors/ApiError.js` | Extend with code/status/details |
| `validators/employee/util.validator.js` | `shared/validation/validate.js` | Rewrite: `parse(schema)`, `assertObjectId`, `badRequest`, `notFound`, `conflict`, `forbidden` |
| `middleware/employeeAuth.js` | `middleware/auth.js` + `middleware/authorize.js` | Rewrite: one realm, `req.auth`, permission guard |
| `routes/employeeRoutes.js` | `routes/index.js` + `modules/*/routes/*.routes.js` | Re-home under `/api/v1` |
| `controllers/employee/authController.js` | `modules/auth/controllers/auth.controller.js` | Remove admin login; unified login/me/change-password |
| `services/employee/auth.service.js` | `modules/auth/services/auth.service.js` | One token signer; sanitize employee |
| `controllers/employee/adminController.js` | `modules/employees/controllers/employees.controller.js`, `team.controller.js` | Split |
| `controllers/employee/profileController.js` | `modules/employees/controllers/profile.controller.js` | Adapt; avatar file id |
| `controllers/employee/attendanceController.js` | `modules/attendance/controllers/attendance.controller.js` | Port |
| `services/employee/attendance.service.js` | `modules/attendance/services/attendance.service.js` | Port; policy resolver seam |
| `validators/employee/attendance.constants.js` | `packages/shared/src/constants/attendance.ts` | Move (single source) |
| `validators/employee/attendance.validator.js` | `packages/shared/src/lib/attendance.ts` + `modules/attendance/services/attendance.math.js` | Split pure math vs service |
| `models/employee/Attendance.js` | `modules/attendance/models/Attendance.js` | Add `organizationId` |
| `controllers/employee/leaveController.js` | `modules/leave/controllers/leave.controller.js` | Port |
| `services/employee/leave.service.js` | `modules/leave/services/leave.service.js` | Port; atomic approve; cancel restore |
| `validators/employee/leave.validator.js` | `modules/leave/validators/leave.validator.js` + shared schema | Port |
| `models/employee/LeaveRequest.js` | `modules/leave/models/LeaveRequest.js` | Add `organizationId` |
| `controllers/employee/taskController.js` | `modules/tasks/controllers/task.controller.js` | Port; attachments via files |
| `services/employee/task.service.js` | `modules/tasks/services/task.service.js` | Port |
| `models/employee/Task.js` | `modules/tasks/models/Task.js` | Add `organizationId` |
| `controllers/employee/queryController.js` | `modules/queries/controllers/query.controller.js` | Port |
| `services/employee/query.service.js` | `modules/queries/services/query.service.js` | Port; fix team filter |
| `models/employee/EmployeeQuery.js` | `modules/queries/models/EmployeeQuery.js` | Add `organizationId` |
| `controllers/employee/meetingController.js` | `modules/meetings/controllers/meeting.controller.js` | Remove `generateMeetUrl` |
| `models/employee/Meeting.js` | `modules/meetings/models/Meeting.js` | Add `organizationId` |
| `services/employee/dashboard.service.js` | `modules/reports/services/dashboard.service.js` | Port; fix query bug |
| `controllers/employee/dashboardController.js` | `modules/reports/controllers/dashboard.controller.js` | Port |
| `services/employee/activity.service.js` | `modules/activity/services/activity.service.js` | Port |
| `models/employee/ActivityLog.js` | `modules/activity/models/ActivityLog.js` | Add `organizationId` |
| `models/employee/Employee.js` | `modules/employees/models/Employee.js` | Role + org + avatar |
| `models/employee/Counter.js` | `shared/models/Counter.js` | Org-scoped key |
| `models/employee/Admin.js` | — | **Drop** |
| `services/employee/s3.service.js` | — | **Drop** |
| `controllers/uploadController.js` | `modules/files/controllers/file.controller.js` | **Rewrite** (GridFS) |
| `routes/uploadRoutes.js` | `modules/files/routes/file.routes.js` | **Rewrite** (auth) |
| `seed/seedEmployees.mjs` | `seeds/seed.js` | Rewrite: env-only admin, demo data flag |
| `test/employee/employee.test.js` | `test/unit/*.test.js`, `test/api/*.test.js` | Split by domain |

New backend files:

| Target | Purpose |
| --- | --- |
| `shared/http/respond.js` | `ok`, `created`, `fail` envelope helpers |
| `shared/http/errors.js` | Error middleware, `notFound`, code mapping |
| `shared/tenant.js` | `resolveTenant()` singleton; Stage 2 replaces implementation |
| `shared/pagination.js` | Parse/validate `page`, `pageSize`, build `{ items, meta }` |
| `modules/files/models/File.js` | File metadata (key, scope, refId, owner, org) |
| `modules/files/services/storage.service.js` | GridFS adapter (internal) |
| `modules/files/services/file.service.js` | Access rules, validation |
| `modules/calendar/routes/calendar.routes.js` | Aggregated events |
| `modules/calendar/services/calendar.service.js` | Meetings + tasks + leave + queries |
| `seeds/seed.js` | Admin + optional demo data |
| `test/helpers/api.js` | Boot app on ephemeral port, login helper |

### 3.2 Frontend

Target root: `frontend/src/`.

| Donor | Target | Action |
| --- | --- | --- |
| `lib/employeeApi.ts` | `lib/api.ts` + `features/auth/session.ts` | Single `hrms_token`; envelope unwrap; 401 logout |
| `contexts/EmployeeAuthContext.tsx` | `features/auth/AuthContext.tsx` | Login/me/logout; role from `/me` |
| `components/EmployeePrivateRoute.tsx` | `app/routes/ProtectedRoute.tsx` | Role/permission guard |
| `hooks/useChangePassword.tsx` | `features/auth/useChangePassword.ts` | Employee realm only |
| `hooks/useActiveMeeting.tsx` | `features/meetings/useActiveMeeting.tsx` | Port |
| `components/MeetingDialog.tsx` | `features/meetings/MeetingDialog.tsx` | Port; user link |
| `types/Employee.ts` | `types/*.ts` + `@hrms/shared` | Split DTOs vs view models |
| `utils/getInitials.ts` | `lib/getInitials.ts` | Port |
| `utils/getImageUrl.ts` | `lib/files.ts` | Replace signed URL with `/api/v1/files/:id` |
| `EmployeeDashboard/components/attendanceRules.ts` | re-export `@hrms/shared/lib/attendance` | Delete duplicate constants |
| `EmployeeDashboard/components/attendanceLive.ts` | `features/attendance/live.ts` | Port |
| `EmployeeDashboard/EmployeeDashboard.tsx` | `pages/employee/EmployeeDashboard.tsx` | Port |
| `EmployeeDashboard/components/Header.tsx`, `Sidebar.tsx` | `features/employee/components/` | Replace `useAuth` |
| `AttendanceDetails`, `TodayAttendance`, `WorkSummary`, `TodaysWorkSummary` | `features/attendance/components/` | Port |
| `LeaveBalance`, `LeaveHistoryTable`, `NewLeaveRequestForm` | `features/leave/components/` | Port |
| `TasksDetails`, `EmployeeQuery`, `AllQueries`, `MeetingSummary`, `RecentActivity` | `features/{tasks,queries,meetings,activity}/components/` | Port |
| `Sections/ApplyForLeave.tsx` | `pages/employee/LeavePage.tsx` | Compose feature components |
| `Sections/MyTasks.tsx` | `pages/employee/TasksPage.tsx` | Compose |
| `Sections/EmployeeProfile.tsx` | `pages/employee/ProfilePage.tsx` | Rewrite upload |
| `Sections/EmployeePasswordSetting.tsx` | `pages/employee/SettingsPage.tsx` | Reuse hook |
| `Calendar.tsx` (placeholder) | `pages/employee/CalendarPage.tsx` | **Implement** real calendar |
| `ManagerDashboard/ManagerDashboard.tsx` | `pages/manager/ManagerDashboard.tsx` | Port |
| Manager `Header`, `Sidebar`, `TodayAttendance`, `CurrentActivity`, `QuickActions`, `AlertNotification` | `features/manager/components/` | Port |
| `PendingLeaveRequests`, `TeamAttendancetable`, `Assigntaskform`, `Alltaskstable`, `Tasksummary`, `Availableemployees` | `features/{leave,tasks,team}/components/` | Port |
| `WriteReview`, `Managerqueries`, `Queryreviewform` | `features/queries/components/` + `pages/manager/QueriesPage.tsx` | Port |
| `CalendarWidget`, `Simplecalendar` | `features/calendar/components/` | Port; real events |
| `ManagerReports`, `My-employee`, `ManagerProfile`, `ManagerPasswordSettings`, `AssignedTasks` | `pages/manager/*` | Port |
| `pages/admin/AdminEmployees.tsx` | `pages/admin/EmployeesPage.tsx` | Adapt (single API client, role ceiling) |
| `pages/admin/AdminDashboard.tsx` | `components/layouts/AdminLayout.tsx` + `app/routes` | Replace shell |
| `pages/Login.tsx` (employee branch) | `pages/auth/Login.tsx` | New focused login |
| `index.css` custom utilities (`loading-dots`) | `styles/utilities.css` | Port only what HRMS uses |

New frontend files:

| Target | Purpose |
| --- | --- |
| `app/routes/AppRoutes.tsx` | Route table, lazy pages |
| `app/providers/AppProviders.tsx` | Router + Auth provider |
| `components/layouts/EmployeeLayout.tsx`, `ManagerLayout.tsx`, `AdminLayout.tsx` | Shared shell (sidebar + header + content) |
| `components/ui/*` | Button, Input, Select, Modal, Badge, Table, EmptyState, Spinner |
| `components/navigation/*` | Sidebar, Header, nav config |
| `features/auth/api.ts` | Auth endpoints |
| `lib/query.ts` | Minimal fetch-on-mount helper (no React Query) |
| `lib/datetime.ts` | `Intl` Asia/Kolkata helpers |
| `pages/auth/Login.tsx` | Login + role redirect |
| `pages/admin/OverviewPage.tsx` | Stats + quick links |
| `pages/NotFound.tsx` | 404 |
| `styles/utilities.css` | Ported custom classes |

### 3.3 Shared package

Target root: `packages/shared/src/`. See §5 for the full keep/correct/defer/drop table.

New in Stage 1:

| File | Purpose |
| --- | --- |
| `lib/attendance.ts` | Kolkata minutes, day boundaries, status math (moved from donor frontend/validator) |
| `lib/leave.ts` | `countLeaveDays`, working-day iteration |
| `lib/normalize.ts` | MIME, filename, task status normalization |
| `types/auth.ts` | `AuthPrincipal`, `AuthSession` |
| `constants/errors.ts` | `API_ERROR_CODES` |

---

## 4. Stage 1 target architecture

### 4.1 Request lifecycle

```
HTTP → helmet/cors/json → route → authenticate (JWT → Employee → req.auth)
     → authorize(permission) → validate(schema) → controller
     → service (business rules, tenant filter) → model
     → respond.ok(data) / throw ApiError
     → error middleware → { success:false, error:{code,message,details} }
```

### 4.2 Authentication and authorization

- JWT payload: `{ sub: employeeId, role }`, signed with `JWT_SECRET`, 7-day expiry.
- `authenticate` loads the employee, rejects missing/inactive (`job.isActive === false`), attaches `req.auth = { employeeId, role, organizationId, employee }`.
- `authorize(permission)` uses `hasPermission(req.auth.role, permission)` from `@hrms/shared`.
- Ownership helpers:
  - `requireSelf(req, employeeId)` — self-service routes.
  - `loadTeamMember(req, employeeId)` — `manager === req.auth.employeeId` or `admin`.
  - `loadTaskFor(req, taskId)` — assignee or assigner or admin.
  - `loadQueryForReview(req, queryId)` — team member's query or admin.
  - `loadMeetingFor(req, meetingId)` — organizer for state changes; participant for read.
  - `loadFileFor(req, fileId)` — owner, admin, or scoped participant (see §4.6).
- No route relies on the frontend for authorization. UI hiding is cosmetic only.

### 4.3 Roles and permissions (Stage 1)

Roles: `admin`, `manager`, `employee` (additive).

| Permission | admin | manager | employee |
| --- | --- | --- | --- |
| `employee:read:self` / `update:self` | ✓ | ✓ | ✓ |
| `attendance:self` | ✓ | ✓ | ✓ |
| `leave:self` | ✓ | ✓ | ✓ |
| `task:self` | ✓ | ✓ | ✓ |
| `query:self` | ✓ | ✓ | ✓ |
| `meeting:self` | ✓ | ✓ | ✓ |
| `file:upload` | ✓ | ✓ | ✓ |
| `employee:read:team` | ✓ | ✓ | — |
| `employee:read:all` | ✓ | — | — |
| `employee:create` / `update` / `deactivate` | ✓ | — | — |
| `team:manage` | ✓ | ✓ | — |
| `attendance:read:team` / `all` | ✓ | team | — |
| `leave:review:team` / `all` | ✓ | team | — |
| `task:assign` / `read:team` | ✓ | ✓ | — |
| `query:review` | ✓ | ✓ | — |
| `report:read:team` / `all` | ✓ | team | — |
| `settings:manage` | ✓ | — | — |

Role ceiling: `canAssignRole('admin', any)` = true; `canAssignRole('manager', 'employee')` = true; all others false. Managers create employees only through `/team`; the payload forces `role: "employee"` and `manager: self`. Nobody may change their own role.

### 4.4 Tenant seam (D1)

- One `Organization` document is seeded (`name`, `slug`, `isActive`).
- `env.organizationId` resolves the singleton; `req.auth.organizationId` is attached by `authenticate`.
- Every model has `organizationId` (indexed), every service filter includes it, every created document receives it from `req.auth`.
- In Stage 1 the value is constant. Stage 2 makes it request-derived and adds memberships.
- Tests assert that a document from another organization is invisible (prepares Stage 2 isolation tests).

### 4.5 Attendance policy

- Constants live in `@hrms/shared` (`ATTENDANCE_TIMEZONE`, shift, grace, half-day, overtime, break cap, `WORKING_WEEKDAYS`).
- `resolvePolicy()` returns the constants, with optional env overrides (`HRMS_TZ`, `HRMS_SHIFT_START`, …).
- Frontend computes live counters with the same shared functions; server remains authoritative.

### 4.6 Files

- `POST /api/v1/files` — `multipart/form-data`, field `file`, optional `scope` (`avatar|leave|task|query|general`) and `refId`. Requires auth.
- Validation: filename sanitized, size ≤ `MAX_UPLOAD_MB` (default 10), MIME in allowlist (images, PDF, text, docx, xlsx), extension consistent with MIME.
- Storage: GridFS (`mongoose.mongo.GridFSBucket`), metadata document `{ key, filename, mimeType, size, checksum, ownerId, organizationId, scope, refId }`.
- `GET /api/v1/files/:id` — streams with `Content-Type`, `Content-Disposition: inline|attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, max-age=300`.
- `DELETE /api/v1/files/:id` — owner or admin.
- Read access:
  - `avatar` / `general`: any authenticated employee in the organization.
  - `leave` / `query`: the owner, their manager, or an admin.
  - `task`: assignee, assigner, or admin.
- DTOs expose only `FileResource { id, url, filename, mimeType, size }`. `key` never leaves the backend.
- No anonymous route. No presigned URL. No `signedUrl` field.

### 4.7 API conventions

- Success: `{ success: true, data: ... }`.
- Failure: `{ success: false, error: { code, message, field?, details? } }`.
- Pagination: `data: { items: T[], meta: { page, pageSize, total, totalPages } }`.
- Dates: ISO-8601 strings; calendar dates `YYYY-MM-DD`; server time is authoritative for attendance.
- Status codes: 200/201, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 500 internal.

### 4.8 Frontend architecture

- `AppProviders` mounts `BrowserRouter` + `AuthProvider` (no website providers).
- `ProtectedRoute` checks session and `allowedRoles`, redirects to `/login` (not `/`).
- One axios client; request interceptor adds `Bearer`; response interceptor unwraps `data.data` and normalizes errors.
- Role-based landing: `/admin`, `/manager`, `/employee`.
- Layouts own the sidebar/header; pages compose feature components.
- No direct `axios` calls in components; all calls go through feature API modules.
- No `moment-timezone`; `lib/datetime.ts` uses cached `Intl.DateTimeFormat` with `Asia/Kolkata`.

---

## 5. Shared package disposition (Phase 1 review)

Current: 29 files, 1,671 lines, 266 symbols. Stage 1 target: ~20 files, ~1,100 lines, roughly 150 symbols.

### 5.1 Keep

| File | Reason |
| --- | --- |
| `constants/common.ts` | Page size/password limits used by both sides |
| `constants/employee.ts` | Employment statuses, limits, activity types |
| `constants/task.ts` | Donor status/priority strings and aliases |
| `constants/query.ts` | Query statuses |
| `constants/meeting.ts` | Statuses, duration limits |
| `constants/file.ts` | Size/MIME policy + resource URL |
| `types/api.ts` | Envelope, error body, pagination |
| `types/task.ts`, `types/query.ts`, `types/attendance.ts` | Directly consumed by both sides |
| `schemas/auth.ts` | Login/change-password |
| `schemas/task.ts`, `schemas/query.ts`, `schemas/meeting.ts` | Request validation |
| `schemas/file.ts` | Upload metadata/policy |

### 5.2 Correct (blocking)

| File | Correction |
| --- | --- |
| `constants/roles.ts` | Collapse to `admin\|manager\|employee`; add `canAssignRole`, `resolveReadScope`; split `employee:read:self/team/all`; keep Stage 2 matrix in the doc, not code |
| `constants/attendance.ts` | Drop `ATTENDANCE_POLICY_DEFAULTS`; add `WORKING_WEEKDAYS`; add `kolkataMinutesOfDay`/day-boundary helpers to `lib/attendance.ts` |
| `constants/leave.ts` | Keep donor types/statuses/defaults (12/10/15/0); remove ledger entry types from Stage 1 exports |
| `types/employee.ts` | `department: string` (not `departmentId`); `managerId`; `profile.avatarFileId`; role 3-value; keep `organizationId`; remove `system_admin` buckets |
| `types/leave.ts` | Replace ledger with `LeaveBalanceBucket { label,total,used,remaining }`; move `countLeaveDays` to `lib/leave.ts`; fix weekend half-day |
| `types/file.ts` | Remove `StorageCapabilities`, `FileUploadResult.file`, exported `FileMetadata`; keep `FileResource` only |
| `types/dashboard.ts` | Defer; replace with donor-aligned payloads when the pages are ported |
| `schemas/common.ts` | Password max 72 bytes; strict boolean; email trim/lowercase |
| `schemas/employee.ts` | **C1 fix**; strict; department string; no org field; role ceiling; no admin role in create |
| `schemas/leave.ts` | Half-day single date; day count; remove ledger adjustment; keep review |
| `schemas/file.ts` | Accept policy parameter; normalize MIME; no static 10 MB ceiling in the schema |
| `index.ts` | Curate exports; no internal aliases/helpers |

### 5.3 Defer to Stage 2

| File | Reason |
| --- | --- |
| `types/organization.ts` | Org settings/policy are Stage 2 |
| `types/leave.ts` ledger entries | Counters in Stage 1 |
| `types/file.ts` `StorageCapabilities` | No provider abstraction in Stage 1 |
| `schemas/attendance.ts` policy/month extras | Minimal in Stage 1 |
| `types/dashboard.ts` enterprise aggregates | Align to donor payloads later |
| `schemas/employee.ts` `updateEmployeeStatusSchema` extras | Keep minimal status endpoint |

### 5.4 Drop

| File/Symbol | Reason |
| --- | --- |
| Five-role `ROLE_PERMISSIONS` matrix | Wrong for Stage 1 |
| `ATTENDANCE_POLICY_DEFAULTS` | Not used; wrong shape; Stage 2 replaces |
| `StorageCapabilities` | No provider abstraction |
| `LeaveLedgerEntry*` exports | No ledger |
| `Organization`/`Department` domain types | No org model in Stage 1 (only `organizationId` scalar) |

### 5.5 Shared package gates

```
npm run build -w @hrms/shared
npm run typecheck -w @hrms/shared
npm run test -w @hrms/shared      # new: node --test against dist
npm run lint  (after eslint config fix)
```

Tests to add: permission matrix snapshot, role ceiling, C1 regression, `countLeaveDays` weekend/half-day/leap-day, MIME normalization, password 72-byte boundary, envelope type narrowing, schema strictness.

---

## 6. Security register

### 6.1 Essential (Stage 1, blocking)

| ID | Risk | Donor evidence | Fix | Test |
| --- | --- | --- | --- | --- |
| **S1** | Dual auth realms + platform token accepted by employee admin | `employeeAuth.resolveAdminIdentity` accepts `{role:"admin"}`, `{userId}`, `{entity:"admin"}` | One realm; single Employee identity; delete `Admin` model | token from another realm rejected |
| **S2** | Broken `GET /auth/me` | mounted behind `authenticateAdmin`; employee branch unreachable | Unified `/auth/me` | employee + admin + manager return self |
| **S3** | IDOR on admin employee routes | `findById(req.params.id)` with no scope | Admin-only guard + tenant filter; soft delete detaches reports | employee cannot call admin routes |
| **S4** | IDOR on team routes | `team/member/:id`, `team/leave/:id/status` trust ids | Verify `manager === actor` or admin | manager A cannot read/review team B |
| **S5** | IDOR on tasks | `GET /tasks/:id`, attachment URL, status patch | `canManageTask` everywhere + tenant | non-participant gets 403 |
| **S6** | IDOR on queries | review by id | team/admin check + tenant | non-team reviewer gets 403 |
| **S7** | IDOR on meetings | start/end by id | organizer check (fix `_id` handling) + tenant | participant cannot end |
| **S8** | Anonymous file access | `/api/upload/*` has no middleware; signed URLs bypass auth | Auth + scope checks; GridFS; no presigned URLs | anonymous upload/download 401 |
| **S9** | Upload abuse | no MIME/size enforcement | allowlist, size cap, filename sanitize, safe headers | `.exe`, 11 MB, `../` rejected |
| **S10** | Role escalation | managers can create only employees in donor, but shared `assignableRoleSchema` includes org_admin | 3-role ceiling; self-role change forbidden | manager cannot create admin/manager |
| **S11** | Mass assignment | donor validators whitelist, but shared PATCH leaks defaults (C1) | strict schemas + defaults-free PATCH | PATCH `{firstName}` changes only firstName |
| **S12** | Password truncation | bcrypt 72-byte limit, schema allows 128 | cap at 72 bytes or pre-hash | 73-byte password rejected/documented |
| **S13** | Leave balance race | read-check-write on approval | atomic `findOneAndUpdate` with condition | concurrent approvals cannot overdraw |
| **S14** | Cross-tenant leak (Stage 2 prep) | no tenant filter | `organizationId` on every query | cross-org fixture invisible |

### 6.2 Essential correctness fixes

| ID | Bug | Fix |
| --- | --- | --- |
| **B1** | `EmployeeQuery.find({ "employee.manager": managerId })` never matches | Resolve team ids, then `employee: { $in: teamIds }` |
| **B2** | `countLeaveDays` returns 0.5 for any multi-day half-day | 0.5 only for a single working date; reject multi-date half-days |
| **B3** | `generateMeetUrl()` fabricates Google Meet URLs | Remove; accept optional user-supplied `meetingLink` |
| **B4** | Cancel does not restore an approved balance | Allow cancelling approved future leave; decrement `used` atomically |
| **B5** | Half-day on weekend counted as 0.5 | Return 0 on non-working days |
| **B6** | `GET /team/attendance` inherited manager auth twice (`router.use` + per-route) | Single guard per route |
| **B7** | `Attendance.markedBy` refs `EmployeeAdmin` | Ref `Employee` |
| **B8** | `Counter` key is global | Key includes `organizationId` |
| **B9** | Meeting organizer `_id` access on unpopulated doc | Normalize id comparison |
| **B10** | Frontend duplicate attendance constants | Single shared implementation |

### 6.3 Optional (not required for initial commit)

- Magic-byte MIME sniffing (`file-type`).
- Rate limiting on auth and uploads.
- Refresh tokens / token rotation.
- CSP and stricter helmet policy.
- Virus scanning.
- Audit trail export.
- Playwright E2E suite.

---

## 7. Stage 1 phases

Every phase ends with the same gates unless noted: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test` (workspace-scoped where applicable), plus the phase-specific checks.

### A0 — Baseline and tooling (0.5 day)

**Depends on:** nothing.

**Tasks**
- Fix root `eslint.config.mjs`: `apps/frontend/**` → `frontend/**`, `apps/backend/**` → `backend/**`; add JS backend globals; ignore `dist`.
- Add backend `test` script (`node --test test/`), shared `test` script, frontend `test` placeholder only if a runner is added (otherwise omit).
- Extend `backend/.env.example`: `JWT_SECRET`, `JWT_EXPIRES_IN`, `ORGANIZATION_ID`, `ADMIN_*`, `MAX_UPLOAD_MB`, `HRMS_TZ`.
- Add root `README` run order: install → shared build → seed → dev.
- Confirm `postinstall` builds shared.

**Gates:** `npm run lint` matches real files; `npm run build` green; `npm run typecheck` green.

**Done:** clean baseline, no source changes.

---

### A1 — Shared contracts correction (2 days)

**Depends on:** A0.

**Source → target:** `packages/shared/src/**` (all Phase 1 files; see §5).

**Tasks**
- Apply C1, H1, H2, H4, H5, M1, M5, M8, M10, M17.
- Collapse to 3 roles; add `canAssignRole`, `resolveReadScope`, `API_ERROR_CODES`.
- Remove org/ledger/provider contracts from exports.
- Add `lib/attendance.ts`, `lib/leave.ts`, `lib/normalize.ts`, `types/auth.ts`.
- Add `node --test` suite against `dist`.
- Update barrel; keep exports curated.

**Gates:** build, typecheck, shared tests, export-resolution script.

**Done:** no consumer can import a deferred/enterprise contract; all blocking review findings closed.

---

### A2 — Backend foundation, models, seed (3 days)

**Depends on:** A1.

**Source → target:** `config/env.js`, `errors/ApiError.js`, `middleware/*`, `models/employee/*` (except Admin), `shared/*`, `seeds/seed.js`.

**Tasks**
- Envelope/error middleware, `ApiError`, `respond` helpers.
- `authenticate` + `authorize(permission)` skeleton.
- Model port with `organizationId`, role enum, indexes, `select: false` passwords, avatar file id.
- `Organization` singleton + `resolveTenant`.
- Counter keyed by organization.
- Seed: admin from env only; `--demo` optional; refuses default/placeholder passwords.
- Module skeleton (`routes/index.js` mounting empty routers).

**Gates:** app boots without Mongo (warn) and with Mongo; seed creates admin; unit tests for env/tenant/envelope.

**Done:** schema compiles, seed idempotent, no hardcoded credentials.

---

### A3 — Auth, RBAC, admin identity (2 days)

**Depends on:** A2.

**Source → target:** `authController.js`, `auth.service.js`, `employeeAuth.js`, `employee.validator.js` (password parts).

**Tasks**
- Unified `POST /auth/login`, `GET /auth/me`, `PUT /auth/change-password`.
- Remove `/auth/admin-login` and the `Admin` model.
- Token payload, inactive rejection, safe sanitization.
- Permission matrix wiring; `canAssignRole`; self-role guard.
- Login rate-limit hook (optional; stub only if no dependency).
- Backend tests: login, me, change password, role guard, token realm.

**Gates:** login for seeded admin, manager, employee; 401/403 tests; no endpoint reachable without auth except login.

**Done:** one identity, one realm, 3 roles enforced server-side.

---

### A4 — Files (2 days)

**Depends on:** A3.

**Source → target:** `uploadController.js` + `uploadRoutes.js` → `modules/files/*`; `s3.service.js` dropped.

**Tasks**
- Add `multer`; memory storage; limits.
- GridFS bucket service; metadata model; checksum.
- Upload/download/delete routes + access rules.
- Filename sanitization, MIME/extension allowlist, safe response headers.
- Replace all donor upload call sites later (`EmployeeProfile`, `ManagerProfile`, `AssignTaskForm`) with `POST /files`.

**Gates:** upload/download/delete tests; anonymous 401; MIME/size rejection; scoped access matrix.

**Done:** no anonymous file path exists; attachments usable by leave/tasks/queries.

---

### A5 — Employee and admin management + profile (3 days)

**Depends on:** A3, A4.

**Source → target:** `adminController.js`, `profileController.js`, `Employee.js`, `employee.validator.js`; frontend `AdminEmployees` contract.

**Tasks**
- `GET/POST /admin/employees`, `GET/PUT/DELETE /admin/employees/:id`, `PATCH .../status`, `GET /admin/stats`, `GET /admin/managers`.
- Team: `GET /team`, `POST /team`, `GET /team/available`, `POST/DELETE /team/assign`.
- Profile: `GET/PUT /me` with avatar file id.
- Soft delete detaches reports; reactivation.
- C1/role-ceiling/self-change guards.
- Pagination `{items, meta}`; search/filter parity.
- Tests: CRUD, role ceiling, IDOR, deactivate/reactivate, stats.

**Gates:** all admin/team/profile tests green; API contract frozen for frontend.

**Done:** admin can run the full employee lifecycle; manager can manage reports; employee can edit own profile.

---

### A6 — Attendance engine (3 days)

**Depends on:** A5.

**Source → target:** attendance controller/service/model/constants/validator.

**Tasks**
- Port check-in/out, breaks, sessions, overtime, half-day/absent, auto break end.
- Self endpoints + team endpoints + month/summary.
- Single shared policy/math implementation; frontend imports it.
- `markedBy` ref fix; legacy record repair retained.
- Tests: port 20+ donor cases + API tests for self/team/IDOR.

**Gates:** donor attendance tests pass; month/summary parity; team isolation test.

**Done:** employee and manager attendance screens have complete server support.

---

### A7 — Leave management (2 days)

**Depends on:** A5.

**Source → target:** leave controller/service/validator/model.

**Tasks**
- Balance, submit, draft, update draft, cancel, history, pending, review.
- Counter side effects; atomic approval; cancel-approved restore.
- Half-day rules; weekend exclusion; pending-balance calculation.
- Attachments via file ids.
- Tests: workflow state machine, balance math, race, team scope, B2/B4.

**Gates:** workflow tests green; no overdraw; manager-only review.

**Done:** complete leave lifecycle with correct balances.

---

### A8 — Tasks and attachments (2 days)

**Depends on:** A5, A4.

**Source → target:** task controller/service/model.

**Tasks**
- Assign, list, get, status update, team list, team summary.
- Human task ids via org-scoped counter.
- Attachments as file ids; download via `/files/:id`; remove signed-URL route.
- `canManageTask` for every read/mutation.
- Tests: assignment, status transitions, completion, attachments, IDOR.

**Gates:** task tests green; manager team summary parity.

**Done:** tasks work end to end with secure attachments.

---

### A9 — Queries and activity (1.5 days)

**Depends on:** A5.

**Source → target:** query controller/service/model; activity service/model.

**Tasks**
- Raise/list/mine/team/review/stats.
- Fix team filter (B1) with team-id lookup.
- Status transitions (open/in_review/resolved/raised_again).
- Activity log writes for all donor events; recent feed.
- Tests: repeat query, review scope, stats, activity entries.

**Gates:** query tests green; manager sees only team queries.

**Done:** queries and activity feed complete.

---

### A10 — Meetings, calendar, colleagues (2 days)

**Depends on:** A5, A6.

**Source → target:** meeting controller/model; calendar service.

**Tasks**
- List, active, create, start, end.
- User-supplied link only; validate `http(s)`; no generator.
- Availability, active meeting blocking, auto-end, participant scoping.
- Colleagues directory (teammates + manager).
- Calendar aggregation (meetings, tasks, leave, queries) for a date range.
- Tests: create/start/end, link validation, overlapping meeting, access, calendar payload.

**Gates:** meeting tests green; no fabricated URLs; calendar returns real events.

**Done:** meetings and calendar fully functional.

---

### A11 — Dashboards and reports (2 days)

**Depends on:** A6–A10.

**Source → target:** dashboard controller/service; team report builder.

**Tasks**
- `GET /dashboard`, `GET /managers-dashboard`, `GET /team`, `GET /team/member/:id`, `GET /team/reports`.
- Preserve donor payload shapes (attendance, summary, task summary, pending leaves, alerts, activity).
- Monthly report classification (present/late/absent/leave), attendance rate.
- Fix dashboard query bug (B1).
- Tests: dashboard shape, monthly report math, team scope.

**Gates:** frontend contract snapshot tests; report matches donor for fixtures.

**Done:** both dashboards have complete data.

---

### A12 — Frontend foundation + employee UI (4 days)

**Depends on:** A3, A4, A5 (can start against mocks after A5 contract freeze).

**Source → target:** `lib/api.ts`, auth context/guard, layouts, employee pages/components.

**Tasks**
- Vite/RRD 7/Tailwind 4 setup; providers; route table; 404.
- Login page (email/password, role redirect, error states).
- API client with envelope unwrap + 401 handling.
- Shared UI primitives; `loading-dots`.
- Employee dashboard, attendance, leave, tasks, queries, meetings, calendar, profile, settings.
- Replace upload calls; replace `getImageUrl`; replace platform `useAuth`.
- Remove duplicate attendance constants; use shared math.
- Calendar page implemented (no placeholder).

**Gates:** `npm run build -w @hrms/frontend`, typecheck; manual smoke of all employee routes.

**Done:** employee experience at donor parity, using the new API.

---

### A13 — Manager UI (3 days)

**Depends on:** A12 (shell/components), A6–A11.

**Source → target:** manager pages/components.

**Tasks**
- Dashboard (attendance, activity, alerts, pending leave, team table).
- Tasks (assign, team list, summary), leave review, queries/review, team directory/detail, reports, profile, settings.
- Meeting dialog reuse.
- Remove dead components; wire every button.

**Gates:** build/typecheck; manual smoke of all manager routes; review actions update dashboards.

**Done:** manager experience at donor parity.

---

### A14 — Admin console + cross-cutting UI (2 days)

**Depends on:** A5, A12.

**Source → target:** `AdminEmployees.tsx` → `pages/admin/EmployeesPage.tsx`; new admin layout/overview.

**Tasks**
- Admin login (same `/login`), role landing.
- Overview: staff stats, department/role/status breakdown, quick links.
- Employees: list, filters, create, edit, deactivate/reactivate, role ceiling, manager assignment.
- Optional admin task assignment from employee detail (`POST /admin/tasks`) — wire it or omit the button; no dead UI.
- Profile/settings reuse.
- Remove website admin nav/pages.

**Gates:** build/typecheck; admin cannot create `admin`; manager cannot access `/admin`.

**Done:** HRMS admin console at parity with donor `AdminEmployees`.

---

### A15 — Integration, security, commit prep (3 days)

**Depends on:** A12–A14.

**Tasks**
- Full API integration test run; seed + smoke with real Mongo.
- Security checklist: IDOR matrix, file access, role ceiling, no anonymous endpoints, no secrets.
- Fix flaky React 19 StrictMode effects; verify double-fetch safety.
- Verify responsive layout at 360/768/1280.
- Update `README`, `docs/architecture.md`, `.env.example`.
- Fresh-clone verification: install → shared build → seed → dev.
- Initial commit (single clean commit or reviewed series).

**Gates:** all acceptance criteria in §11.

**Done:** initial commit ready.

---

### Phase dependency graph

```
A0 → A1 → A2 → A3 ─┬→ A4 ─┬→ A5 ─┬→ A6 ─┐
                   │       │       ├→ A7 ─┤
                   │       │       ├→ A8 ─┼→ A11 → A13 → A15
                   │       │       ├→ A9 ─┤
                   │       │       └→ A10 ┘
                   │       └────────────→ A12 → A14 → A15
                   └──────────────────────────→ A12
```

Parallelizable: A4/A5 after A3; A6–A10 after A5; A12 can start after A5 contract freeze; A13/A14 after A12.

---

## 8. Stage 2 enterprise transformation roadmap

Each wave is independently shippable and keeps Stage 1 endpoints working through adapters.

### Wave 1 — Organization and membership foundation

- `Organization` (name, slug, status, settings), `Membership` (employee ↔ org ↔ role), invitations.
- Backfill: existing singleton org becomes org #1; all Stage 1 documents already carry `organizationId`.
- Org context resolved from membership; no implicit singleton.
- **Exit:** two orgs exist; data is invisible across them; Stage 1 tests still pass.

### Wave 2 — Five-role RBAC

- Expand roles: `system_admin`, `org_admin`, `hr_manager`, `manager`, `employee`.
- Map Stage 1 `admin → org_admin`; seed `system_admin` outside any org.
- Split admin duties: `org_admin` (org settings, employees), `hr_manager` (employee lifecycle, attendance/leave policy, reports).
- Permission matrix, assignment ceiling, self-escalation guard, role-change audit.
- **Exit:** route guards unchanged; matrix drives all decisions; escalation tests pass.

### Wave 3 — Organization-aware auth and tenant isolation

- Tokens carry `organizationId` + role; refresh/session store; optional SSO.
- Tenant middleware on every query; central `tenantFilter()`; cross-tenant tests per module.
- Invitation/onboarding flow; deactivated membership invalidation.
- **Exit:** automated cross-tenant suite green; no raw collection query without tenant filter (lint rule).

### Wave 4 — Configurable attendance policy

- `OrganizationSettings.attendance` + optional department overrides + holiday calendar.
- `resolvePolicy(orgId)` replaces constants; UI for policy management.
- Working weekdays, shift, grace, half-day, overtime, break cap.
- **Exit:** two orgs run different policies; Stage 1 behaviour is the default.

### Wave 5 — Leave ledger and approval workflows

- Append-only `LeaveLedgerEntry`; derived balances; idempotency keys; reversals.
- Backfill counters: opening allocation + usage from approved requests.
- Multi-level approvals (manager → HR), delegation, comments, audit.
- **Exit:** ledger balance equals legacy counters for all fixtures; reversal is traceable.

### Wave 6 — StorageProvider and file lifecycle

- `StorageProvider` interface (`put`, `getStream`, `delete`, `capabilities`).
- GridFS adapter (wraps Stage 1 service); optional S3 adapter.
- Retention, quotas per org, signed-URL capability only if provider supports it (never in shared DTOs).
- **Exit:** switching adapters requires no domain change.

### Wave 7 — Organization-scoped reporting

- Org-wide dashboards, department filters, exports, scheduled summaries.
- Report permissions (`report:read:org`), date-range policies.
- **Exit:** HR sees org, manager sees team, employee sees self.

### Wave 8 — Audit, security, scalability

- Audit log for every mutation (actor, tenant, before/after).
- Rate limiting, lockout, password rotation, session revocation.
- Index review, pagination everywhere, aggregation limits, observability.
- **Exit:** security checklist and load baseline signed off.

### Stage 2 migration safeguards

- No breaking API removals without a deprecation window.
- Every wave ships with a data migration script + rollback note.
- Shared contracts are versioned; frontend/backend upgrade together.
- Stage 1 test suite remains the regression gate.

---

## 9. Four-person workstreams

| Workstream | Owner profile | Stage 1 phases | Stage 2 waves |
| --- | --- | --- | --- |
| **A — Platform backend** | Backend/auth/security | A0, A1, A2, A3, A4, A5 | 1, 2, 3, 6 |
| **B — Domain backend** | Backend/domain logic | A6, A7, A8, A9, A10, A11 | 4, 5, 7 |
| **C — Employee frontend** | React/UI | A12 (employee + shared UI) | 2, 4, 7 (UI) |
| **D — Manager/admin frontend** | React/UI | A13, A14 | 2, 4, 7 (admin UI) |

### Integration dependencies

| Dependency | Producer | Consumer | Contract |
| --- | --- | --- | --- |
| Shared package (`A1`) | A | All | Build + tests green before A2/A12 |
| API envelope + auth | A | B, C, D | Frozen after A3 |
| Employee DTOs | A | C, D | Frozen after A5 |
| Attendance/leave/task/query contracts | B | C, D | Per-phase contract note |
| File endpoints | A | B, C, D | Frozen after A4 |
| Dashboard payloads | B | C, D | Snapshot tests |
| UI primitives/layouts | C | D | Available by end of A12 day 2 |

### Working agreements

- One shared `docs/api.md` endpoint table updated per phase (source of truth).
- Contract changes require a note in the PR and a matching shared-type change.
- Backend merges only with tests; frontend merges only with typecheck + build.
- Daily 15-minute integration sync; A owns auth/contract questions, B owns domain semantics.
- No one edits `LearnILmWorld`; copies happen into HRMS only.

### Suggested sequencing (calendar-agnostic)

```
Week 1: A0, A1, A2, A3; A12 shell/auth (C), A13/A14 layout prep (D)
Week 2: A4, A5; A6/A7 (B); A12 employee (C); D builds manager/admin against mocks
Week 3: A8/A9/A10/A11 (B); C finishes employee; D manager/admin
Week 4: A15 integration/security; buffer
```

---

## 10. Test strategy

### 10.1 Unit (backend, `node:test`)

- Port all 55 donor tests (minus `generateMeetUrl`).
- Add: password 72-byte boundary, role ceiling, permission matrix, tenant filter, pagination, envelope, file policy, leave race, query team filter.

### 10.2 API integration

- Boot `app` on an ephemeral port; connect to `MONGODB_URI_TEST`.
- Seed three users (admin/manager/employee) + one report + one task + one leave + one query + one meeting.
- Use global `fetch` with bearer tokens; assert status + envelope.
- Skip with a clear message when no test DB is configured (documented in README).
- Cover every endpoint at least once, plus the IDOR matrix.

### 10.3 Shared

- `node --test test/*.test.mjs` importing `dist`.
- Schema behaviour, permission matrix, day math, MIME normalization.

### 10.4 Frontend

- `tsc -b` + `vite build` are gates.
- Manual smoke checklist per role (documented in `docs/smoke.md`).
- Optional: Playwright (deferred; not required for initial commit).

### 10.5 Security tests (minimum)

1. Employee cannot call any `/admin/*` route.
2. Manager A cannot read/update team B member, leave, task, query, report.
3. Employee cannot read another employee's attendance, leave, task, query, file.
4. Anonymous cannot upload/download/delete files.
5. Manager cannot create or promote to `admin`/`manager`.
6. User cannot change own role.
7. Approved leave cannot be over-approved concurrently.
8. Cross-organization fixtures invisible (tenant seam).
9. Deactivated employee token rejected.
10. Meeting start/end restricted to organizer.

---

## 11. Initial Git commit acceptance criteria

### Functional

- [ ] All 66 routes (63 donor + 3 files) implemented and reachable under `/api/v1`.
- [ ] Login works for admin, manager, employee; role redirects land on `/admin`, `/manager`, `/employee`.
- [ ] Employee screens: dashboard, attendance, leave, tasks, queries, meetings, calendar, profile, settings — all functional.
- [ ] Manager screens: dashboard, team, attendance, leave review, tasks, queries, reports, profile, settings — all functional.
- [ ] Admin screens: overview, employees (list/create/edit/deactivate/reactivate), profile, settings — all functional.
- [ ] No placeholder page, dead button, or unimplemented handler ships.
- [ ] Attendance math matches donor for fixed fixtures (late, half-day, overtime, breaks, absent).
- [ ] Leave balances and approvals match donor; cancel/restore is correct.
- [ ] Task summaries and monthly reports match donor fixtures.
- [ ] Calendar shows real meetings/tasks/leave/queries.

### Security

- [ ] No anonymous upload/download/delete route.
- [ ] Every file read is authorized by owner/scope.
- [ ] No endpoint trusts a path id without an ownership/team/admin check.
- [ ] Role ceiling enforced; self-role change forbidden.
- [ ] No hardcoded credentials; seed requires env.
- [ ] `.env` ignored; no secrets in Git.
- [ ] Password hashing with bcrypt 6; 72-byte limit handled.
- [ ] Inactive employees cannot authenticate.

### Quality

- [ ] `npm run build` green (shared + frontend).
- [ ] `npm run typecheck` green (all workspaces).
- [ ] `npm run lint` green (all workspaces).
- [ ] `npm run test` green (shared + backend).
- [ ] Backend unit tests ≥ 70 cases; API tests cover all routes.
- [ ] No `any`/suppression added to silence migration errors without a comment.
- [ ] No unused donor dependencies installed.
- [ ] `README` has install, seed, run, test, and troubleshooting steps.
- [ ] `docs/architecture.md` reflects the implemented Stage 1 layout.
- [ ] Fresh clone → `npm install` → seed → `npm run dev` works.

### Repository

- [ ] `LearnILmWorld` unmodified.
- [ ] No website admin/marketing/student/trainer code carried over.
- [ ] No brand assets copied without approval.
- [ ] Commit history is understandable (single initial commit or a small reviewed series).
- [ ] `docs/migration-plan.md` (this file) committed.

---

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Express 5 async/error semantics | Unhandled rejections | Wrap controllers; error middleware; API tests |
| Mongoose 9 aggregation/middleware changes | Attendance/report regressions | Port tests first; fixture parity |
| GridFS + multer mismatch | Upload failures | Small spike in A4; memory storage; stream tests |
| React 19 StrictMode double effects | Duplicate attendance actions | Idempotent actions + abort/ignore guards |
| Tailwind 4 class changes | Visual regressions | Standard utilities only; visual smoke |
| RRD 7 route changes | Broken navigation | Explicit route table + guard tests |
| Donor dead code mistaken for features | Wasted effort | Inventory §2.8; verify imports before porting |
| Scope creep into Stage 2 | Delayed commit | Non-goals §0.2; D1 seam only |
| Leave balance race | Incorrect balances | Atomic update + test |
| Tenant seam rejected | Stage 2 rewrite | Decision D1 at approval |

---

## 13. Approval gate

Stage 1 can begin when:

1. **D1–D10** are approved or amended (D1 is the only scope-changing decision).
2. The Stage 1 non-goals in §0.2 are accepted.
3. The endpoint parity checklist in §2.4 is accepted as the definition of "complete".
4. The shared disposition in §5 is accepted (including dropping the five-role matrix and ledger contracts from Stage 1).
5. The acceptance criteria in §11 are accepted as the initial-commit bar.

No implementation starts before this plan is approved.
