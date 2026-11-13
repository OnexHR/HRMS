# A0 Baseline & Tooling Report

**Phase:** Stage 1, Phase A0 (Baseline & Tooling) — only phase executed.
**Date:** 2026-11-13
**Repository:** `C:\Users\Ankit Das\Desktop\HRMS`
**Donor (read-only):** `C:\Users\Ankit Das\Desktop\learnILM\LearnILmWorld`
**Plan of record:** `docs/migration-plan.md` §7, Phase A0
**Result:** A0 gates pass. One pre-existing quality failure (`format:check`) and one pre-existing Git-state blocker (uncommitted restructure) remain, both documented below. No A1 work was started.

---

## 1. Environment

| Item                 | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| OS                   | Windows (win32)                                                          |
| Node.js              | `v24.18.0`                                                               |
| npm                  | `11.16.0`                                                                |
| Git branch           | `master`                                                                 |
| HEAD                 | `d582e4a chore: finalize monorepo structure and workspace configuration` |
| Previous commit      | `e4aaeb6 chore: baseline before HRMS monorepo restructure`               |
| Remotes              | none configured                                                          |
| Tracked files        | 147                                                                      |
| Working-tree entries | 170 (7 modified, 132 deleted, 31 untracked paths)                        |

### 1.1 Git working-tree state at A0 start

The repository is **mid-restructure and uncommitted**. HEAD still tracks the old `apps/` layout.

| State               | Paths                                                                                                    | Notes                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Deleted (unstaged)  | `apps/backend/**`, `apps/frontend/**` (132 entries)                                                      | Superseded by root-level `backend/` and `frontend/` |
| Untracked           | `backend/`, `frontend/`, `docs/migration-plan.md`, 28 new `packages/shared/src/**` files                 | Approved target layout, not yet committed           |
| Modified (unstaged) | `README.md`, `docs/architecture.md`, `package.json`, `package-lock.json`, `packages/shared/src/index.ts` | Pre-existing restructure work, not produced by A0   |

**Implication:** there is no clean committed baseline. A0 did not commit anything (out of scope). See §8 and §11.

---

## 2. Project structure inventory

### 2.1 Backend (`backend/`)

| Path                                                                   | Purpose                                            | State                   |
| ---------------------------------------------------------------------- | -------------------------------------------------- | ----------------------- |
| `package.json`                                                         | `@hrms/backend` manifest                           | present                 |
| `.env.example`                                                         | Environment template                               | present, extended in A0 |
| `src/app.js`                                                           | Express app config (CORS, JSON, 404 envelope)      | present                 |
| `src/server.js`                                                        | Startup, DB connect, graceful shutdown             | present                 |
| `src/config/env.js`                                                    | Env parsing (`PORT`, `MONGODB_URI`, `CORS_ORIGIN`) | present                 |
| `src/config/database.js`                                               | Mongoose connect/disconnect                        | present                 |
| `src/modules/<name>/{controllers,models,routes,services,validators}`   | 14 empty module skeletons                          | `.gitkeep` only         |
| `src/middleware`, `src/shared/{constants,errors,helpers}`, `src/utils` | Empty                                              | `.gitkeep` only         |

Modules scaffolded (14): `attendance`, `auth`, `calendar`, `departments`, `employees`, `leave`, `meetings`, `organizations`, `queries`, `reports`, `settings`, `system-admin`, `tasks`, `users`.

Real backend source files: **6** (4 JS + manifest + env example). No models, controllers, services, routes, tests, or seed exist yet. No donor code has been migrated.

### 2.2 Frontend (`frontend/`)

| Path                                                                                             | Purpose                                               |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `package.json`, `README.md`, `.gitignore`                                                        | Workspace manifest and docs                           |
| `index.html`, `vite.config.ts`, `tsconfig{,.app,.node}.json`                                     | Vite 8 / TS 6 project setup                           |
| `src/main.tsx`, `src/App.tsx`, `src/index.css`                                                   | Minimal shell; `index.css` is `@import 'tailwindcss'` |
| `public/favicon.svg`, `public/icons.svg`, `src/assets/icons/*.svg`, `src/assets/images/hero.png` | Placeholder assets                                    |
| `src/{app,components,features,pages,lib,hooks,types,styles,context}/**`                          | Empty scaffolds (`.gitkeep`)                          |

The frontend is a **placeholder landing shell** only. No HRMS screens, router, API client, or auth context exist yet.

### 2.3 Shared (`packages/shared/`)

| Item                                         | Value                                                           |
| -------------------------------------------- | --------------------------------------------------------------- |
| Source files                                 | 29 TypeScript files                                             |
| Source lines                                 | 1,671                                                           |
| Modules                                      | `constants/` (9), `schemas/` (9), `types/` (10), `index.ts` (1) |
| Build output                                 | `dist/` with 29 JS files + declarations                         |
| Runtime exports (from built `dist` via Node) | **150**                                                         |
| Tests                                        | none                                                            |
| Barrel                                       | `src/index.ts` re-exports all 29 modules                        |

This is the unchanged Phase 1 shared package. Its review findings (C1 default leakage, H1 role ceiling, H2 read scope, H4 `FileMetadata.key`, H5 no tests, M1 weekend half-day, M5 MIME enforcement, M8 error codes, M17 strictness, plus the deferred enterprise contracts) remain **open by design**. A1 corrects them; A0 only recorded them. Confirmed present at runtime: `ATTENDANCE_POLICY_DEFAULTS`, the five-role matrix, and the ledger/provider contracts are still exported.

---

## 3. Manifests, scripts and configuration

### 3.1 Root `package.json`

- Workspaces: `frontend`, `backend`, `packages/shared`.
- Scripts: `dev`, `dev:frontend`, `dev:backend`, `dev:shared`, `build`, `build:shared`, `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `test`, `postinstall`.
- `postinstall` builds `@hrms/shared` (verified).
- `engines.node: >=20.19.0`; `overrides.minimatch: 11.0.8`.

### 3.2 Workspace scripts

| Workspace        | Scripts                                                                 | Notes                            |
| ---------------- | ----------------------------------------------------------------------- | -------------------------------- |
| `@hrms/frontend` | `dev`, `build` (`tsc -b && vite build`), `typecheck`, `lint`, `preview` | No test runner (allowed by plan) |
| `@hrms/backend`  | `dev`, `start`, `lint`, `test`                                          | `test` added in A0               |
| `@hrms/shared`   | `build`, `dev`, `typecheck`, `lint`, `test`                             | `test` added in A0               |

### 3.3 TypeScript

| Config                          | Key settings                                                                                              | Assessment                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `frontend/tsconfig.json`        | project references to app/node configs                                                                    | valid                                                         |
| `frontend/tsconfig.app.json`    | ES2023, bundler resolution, `strict`, `noUnused*`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noEmit` | valid                                                         |
| `frontend/tsconfig.node.json`   | NodeNext, node types, `vite.config.ts` only                                                               | valid                                                         |
| `packages/shared/tsconfig.json` | NodeNext, `declaration`, `declarationMap`, `strict`, `noUnused*`, outDir `dist`                           | valid; requires `.js` import specifiers (currently satisfied) |

No TypeScript errors at baseline.

### 3.4 ESLint (fixed in A0)

Pre-A0 the config still targeted the retired layout: `apps/frontend/**`, `apps/backend/**`. Consequences:

1. Root `npm run lint` exited **0 but was misleading**: it linted 34 files (29 shared TS + 4 backend JS + config). The backend JS matched **no config object**, so it was linted with zero rules; `frontend/**` was not linted at all.
2. Workspace lint scripts failed with exit **2**: `eslint src` / `eslint .` from inside a workspace could not match root-relative globs, producing _"all of the files matching the glob pattern ... are ignored"_ (ESLint resolves flat-config `files` globs against the current working directory).

A0 fix: globs changed to `frontend/**` and `backend/**`, backend globals kept as `globals.node` + `sourceType: 'module'`, and `basePath` pinned to the repository root so workspace scripts match the same repository-relative globs. Post-fix evidence in §5.

### 3.5 Prettier

`.prettierrc`: no semicolons, single quotes, trailing commas, 100 columns. `.prettierignore` excludes build output, lockfiles, and env files (with `.env.example` re-included). `npm run format:check` fails on 30 pre-existing files (§6, F1).

### 3.6 Environment and `.gitignore`

- Only `backend/.env.example` exists; no `.env` file is present. No secret values were read or printed.
- `.gitignore` covers `node_modules/`, `dist/`, `build/`, `coverage/`, `.env`, `.env.*`, with `!.env.example` / `!.env.*.example` re-inclusions.
- Verified `backend/.env.example` is **untracked but not ignored** (`git status` → `?? backend/.env.example`; `git ls-files -o --exclude-standard` lists it), so it will be committed.
- `package-lock.json` is the active lockfile. `package-lock.backup.json` is tracked and documented in the README as an unused backup (repo-hygiene note in §8).

---

## 4. Stack version verification

All approved versions are installed and consistent with the manifests.

| Component           | Approved             | Manifest   | Installed | Status |
| ------------------- | -------------------- | ---------- | --------- | ------ |
| Express             | 5.3                  | `^5.3.0`   | `5.3.0`   | PASS   |
| Mongoose            | 9.12                 | `^9.12.1`  | `9.12.1`  | PASS   |
| bcrypt              | 6                    | `^6.0.0`   | `6.0.0`   | PASS   |
| React               | 19.3                 | `^19.3.1`  | `19.3.1`  | PASS   |
| React DOM           | 19.3                 | `^19.3.1`  | `19.3.1`  | PASS   |
| React Router DOM    | 7.18                 | `^7.18.5`  | `7.18.5`  | PASS   |
| Tailwind CSS        | 4.3                  | `^4.3.5`   | `4.3.5`   | PASS   |
| `@tailwindcss/vite` | 4.3                  | `^4.3.5`   | `4.3.5`   | PASS   |
| TypeScript          | 6.0                  | `~6.0.3`   | `6.0.3`   | PASS   |
| Zod                 | (shared/runtime)     | `^4.6.7`   | `4.6.7`   | PASS   |
| Vite                | (not pinned by plan) | `^8.3.6`   | `8.3.8`   | PASS   |
| ESLint              | (tooling)            | `^10.14.0` | `10.14.0` | PASS   |

`npm ls --depth=0` exits `0` with no missing, invalid, or extraneous packages.

Known, expected gaps (not A0 defects):

- `multer` is **not installed** — required in A4.
- `zod` is not declared in `backend/package.json` — the plan adds it in A1/A2 when shared schemas are consumed server-side.
- No test runner dependencies are needed; backend/shared use `node:test`.

---

## 5. Commands executed and actual results

All commands were run from `C:\Users\Ankit Das\Desktop\HRMS` unless stated.

### 5.1 Baseline, before any A0 edit

| #   | Command                                                 | Actual result                                                                                           | Exit           |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | `git branch --show-current`                             | `master`                                                                                                | 0              |
| 2   | `git log --oneline -5`                                  | 2 commits, HEAD `d582e4a`                                                                               | 0              |
| 3   | `git status --porcelain=v1`                             | 170 entries: 7 modified, 132 deleted, 31 untracked                                                      | 0              |
| 4   | `node -v` / `npm -v`                                    | `v24.18.0` / `11.16.0`                                                                                  | 0              |
| 5   | `npm ls --depth=0`                                      | clean tree, no invalid/missing packages                                                                 | 0              |
| 6   | `npm run build`                                         | shared `tsc` + frontend `tsc -b && vite build`; 16 modules, `dist/index-*.js` 220.03 kB (gzip 68.81 kB) | **0**          |
| 7   | `npm run typecheck`                                     | frontend + shared typecheck                                                                             | **0**          |
| 8   | `npm run lint`                                          | ran 34 files; **frontend skipped, backend linted with no rules**                                        | 0 (misleading) |
| 9   | `npm run lint -w @hrms/shared`                          | `ESLint: You are linting "src", but all files ... are ignored`                                          | **2**          |
| 10  | `npm run lint -w @hrms/frontend`                        | `ESLint: You are linting ".", but all files ... are ignored`                                            | **2**          |
| 11  | `npm run lint -w @hrms/backend`                         | no errors (but no backend block matched)                                                                | 0              |
| 12  | `npm run test`                                          | no workspace exposes `test`; no-op                                                                      | 0              |
| 13  | `npm run format:check`                                  | 30 files need formatting                                                                                | **1**          |
| 14  | `node --test` probe (empty temp project)                | `tests 0`, `pass 0`                                                                                     | 0              |
| 15  | `node --test test/` probe (missing/empty dir)           | `Could not find 'test/'` / `Cannot find module ...\test`                                                | **1**          |
| 16  | `node -e "import('@hrms/shared')..."` (from `backend/`) | `runtime exports: 150`; import resolves through workspace link                                          | 0              |
| 17  | In-process app probe (`app.listen(0)` + `fetch`)        | `GET /api/v1/probe` → `404 {"success":false,"error":{"message":"Not found"}}`                           | 0              |

### 5.2 After A0 corrections

| #   | Command                                                     | Actual result                                                                                 | Exit  |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----- |
| 18  | `npm run lint`                                              | no output (clean), **37 files** now targeted                                                  | **0** |
| 19  | `npm run lint -w @hrms/shared`                              | targets **29** files, no errors                                                               | **0** |
| 20  | `npm run lint -w @hrms/frontend`                            | targets **3** files, no errors                                                                | **0** |
| 21  | `npm run lint -w @hrms/backend`                             | targets **4** files, no errors                                                                | **0** |
| 22  | `npm run test`                                              | backend: `tests 0 / pass 0`; shared: `tests 0 / pass 0`                                       | **0** |
| 23  | `npm run build`                                             | identical success to #6                                                                       | **0** |
| 24  | `npm run typecheck`                                         | identical success to #7                                                                       | **0** |
| 25  | `npm run postinstall`                                       | builds `@hrms/shared`                                                                         | **0** |
| 26  | `npm ci --dry-run`                                          | `up to date in 9s`; postinstall ran; warning about `bcrypt` install script (see F5)           | **0** |
| 27  | `npm run format:check`                                      | still 30 files (unchanged, see F1)                                                            | **1** |
| 28  | backend boot smoke (`Start-Job` + `GET :4000/api/v1/probe`) | process reached `Running`; request returned 404 (PowerShell surfaced it as `(404) Not Found`) | 0     |

### 5.3 Runtime probes

- **Backend boots without MongoDB**: `server.js` starts, warns, and serves the 404 envelope. Verified on port 4000 and on an ephemeral port.
- **Malformed JSON**: `POST` with invalid JSON returns Express's default **HTML** 400 error page, not the JSON envelope. This is expected before A2 (error middleware), and is recorded as F4.
- **Frontend production build**: succeeds; output is the 220 kB placeholder shell.

---

## 6. Existing failures, warnings and gaps

None of the following were introduced by A0. Items marked _(fixed)_ were corrected in A0 because they blocked the A0 lint/test gates.

| ID      | Item                                                                                         | Impact                                                                 | Status                                                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1**  | `npm run format:check` fails on 30 files (29 shared sources + `docs/migration-plan.md`)      | Quality gate red; not in A0/initial-commit gates                       | **Open** — defer to A1 (`npm run format` after the shared rewrite)                                                                                         |
| **F2**  | ESLint config referenced `apps/frontend/**`, `apps/backend/**`                               | Frontend unlinted; backend linted with no rules; workspace lint exit 2 | **Fixed** in A0                                                                                                                                            |
| **F3**  | Workspace `lint` scripts unusable from workspace dirs                                        | `npm run lint -w ...` failed with exit 2                               | **Fixed** via root `basePath`                                                                                                                              |
| **F4**  | Malformed JSON returns Express HTML error, not `{ success:false, error }`                    | API contract inconsistency                                             | **Open** — A2 error middleware                                                                                                                             |
| **F5**  | npm 11.16 `allow-scripts` warning: `bcrypt@6.0.0` (`node-gyp-build`) not explicitly approved | Potential clean-install concern                                        | **Not a blocker** — bcrypt resolves shipped prebuilds at runtime via `node-gyp-build`; `bcrypt.hash()` verified working, and win32-x64 prebuild is present |
| **F6**  | No committed baseline; `apps/` deletions and new layout uncommitted                          | Initial-commit history is unclear; A1 diffs would be noisy             | **Open** — needs a baseline commit (recommendation in §11)                                                                                                 |
| **F7**  | No tests exist (backend/shared), `npm test` was a no-op                                      | Test gate vacuous                                                      | **Partially addressed** — scripts added; tests arrive in A1+                                                                                               |
| **F8**  | Backend has no `typecheck` script (plain JS)                                                 | N/A by design                                                          | Accepted                                                                                                                                                   |
| **F9**  | README references `frontend/.env` / `VITE_API_URL`, but no frontend env example exists       | Fresh-clone confusion                                                  | **Open** — A12 adds the API client/env                                                                                                                     |
| **F10** | `package-lock.backup.json` (140 KB) is tracked                                               | Repo hygiene only                                                      | **Open** — recommend removing before the initial commit                                                                                                    |
| **F11** | `npm run dev` (both servers) not exercised end-to-end                                        | Unverified joint startup                                               | Accepted — backend boot and frontend build verified separately                                                                                             |
| **F12** | `docs/migration-plan.md` not Prettier-formatted                                              | Feeds F1                                                               | **Open** — formatting pass in A1                                                                                                                           |

**Newly introduced failures: none.** After the A0 edits, `build`, `typecheck`, root `lint`, all three workspace `lint` scripts, and `test` all exit `0`.

---

## 7. Files changed in A0

Exactly four existing files were edited, plus this report. No feature code, no donor code, no architectural change.

| File                           | Change                                                                                                                                                                                  | Reason                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `eslint.config.mjs`            | `apps/frontend/**` → `frontend/**`; `apps/backend/**` → `backend/**`; added `basePath: import.meta.dirname` to each config object; kept backend `globals.node` + `sourceType: 'module'` | Fix the known glob defect so root and workspace lint target real files    |
| `backend/package.json`         | Added `"test": "node --test"`                                                                                                                                                           | A0 requirement; discovers `backend/test/**/*.test.js` when A2+ adds tests |
| `packages/shared/package.json` | Added `"test": "node --test"`                                                                                                                                                           | A0 requirement; discovers `packages/shared/test/*.test.mjs` in A1         |
| `backend/.env.example`         | Added `JWT_EXPIRES_IN`, `ORGANIZATION_ID`, `ORGANIZATION_NAME`, `ORGANIZATION_SLUG`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `MAX_UPLOAD_MB`, `HRMS_TZ` (placeholders only)      | A0 requirement; unblocks A2 seed/auth work without inventing values later |
| `docs/a0-baseline-report.md`   | New                                                                                                                                                                                     | This deliverable                                                          |

### 7.1 Scope decision / deviation

- The approved plan wrote the backend test command as `node --test test/`. On Node 24 that fails when `test/` is missing or empty (`Cannot find module ...\test`). `node --test` is used instead: it auto-discovers `**/*.test.{js,mjs}` and exits `0` with zero tests today. **No approval needed:** same intent, no architecture impact.
- No workspace `lint` scripts were deleted or rewritten; the root `basePath` fix makes the existing scripts correct.
- `frontend/package.json` was **not** changed (no test runner was added, consistent with the plan).

---

## 8. Fresh-clone assessment

| Step                              | Evidence                                                     | Status           |
| --------------------------------- | ------------------------------------------------------------ | ---------------- |
| `npm install` / `npm ci` resolves | `npm ls` clean; `npm ci --dry-run` exit 0                    | PASS             |
| `postinstall` builds shared       | `npm run postinstall` exit 0; `dist/` produced               | PASS             |
| Workspace links resolve           | `@hrms/shared` imported from `backend/`, 150 exports         | PASS             |
| Environment template exists       | `backend/.env.example` under version control, `.env` ignored | PASS (extended)  |
| Backend starts without DB         | boot probe serves 404 envelope                               | PASS             |
| Frontend builds                   | `vite build` successful                                      | PASS             |
| Lint/typecheck/test               | all exit 0                                                   | PASS             |
| Reproducible committed baseline   | working tree uncommitted, `apps/` still in HEAD              | **BLOCKED** (F6) |
| Format check                      | 30 files                                                     | **FAIL** (F1)    |

**Setup blockers for a fresh clone:** none for install/build/run. The only blockers are repository hygiene: no committed baseline (F6) and the Prettier gate (F1). Neither prevents A1 from starting, but both must be resolved before the initial commit.

---

## 9. A0 acceptance checklist

| Criterion                                                         | Status                            | Evidence                                                           |
| ----------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Git status and branch inspected                                   | **PASS**                          | `master`, HEAD `d582e4a`, 170 working-tree entries                 |
| Current structure and files recorded                              | **PASS**                          | §2                                                                 |
| Root/frontend/backend/shared manifests inspected                  | **PASS**                          | §3                                                                 |
| Workspace, TS, ESLint, Prettier, env, build/test config inspected | **PASS**                          | §3                                                                 |
| Baseline build run                                                | **PASS**                          | exit 0 (§5 #6)                                                     |
| Baseline typecheck run                                            | **PASS**                          | exit 0 (#7)                                                        |
| Baseline lint run                                                 | **PASS (after fix)**              | pre-fix was misleading/broken; post-fix 37 files, exit 0 (#18–21)  |
| Baseline test run                                                 | **PASS (vacuous)**                | scripts added; 0 tests, exit 0 (#22)                               |
| Existing failures/warnings documented                             | **PASS**                          | §6                                                                 |
| ESLint `apps/*` glob issue fixed                                  | **PASS**                          | §3.4, §7                                                           |
| Stack versions verified against approved targets                  | **PASS**                          | §4, all match                                                      |
| Shared package state recorded, findings not fixed                 | **PASS**                          | 29 files / 1,671 lines / 150 runtime exports; §2.3                 |
| `.gitignore` and env handling verified; no secrets exposed        | **PASS**                          | §3.6                                                               |
| Fresh-clone setup blockers identified                             | **PASS**                          | §8                                                                 |
| No feature implementation or donor migration                      | **PASS**                          | only tooling/config edited                                         |
| Approved layout preserved                                         | **PASS**                          | `frontend/`, `backend/`, `packages/shared/` unchanged structurally |
| Donor untouched                                                   | **PASS**                          | §10                                                                |
| `format:check` green                                              | **FAIL (pre-existing, deferred)** | F1                                                                 |
| Committed reproducible baseline                                   | **BLOCKED (pre-existing)**        | F6, outside A0 scope                                               |

**A0 gate verdict: PASS** for the plan’s A0 gates (`build`, `typecheck`, `lint`, no source changes, donor untouched). F1/F6 are recorded pre-existing conditions, not A0 regressions.

---

## 10. Donor integrity confirmation

The donor was accessed read-only. No write, rename, delete, format, or overwrite occurred.

| Check                                                                   | Result                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Donor files scanned (excluding `.git`, `node_modules`, `dist`, `build`) | 562 files, 31,553,273 bytes                                                                                                                                                                                                                           |
| Latest donor modification time                                          | `2026-10-01 22:46:51`                                                                                                                                                                                                                                 |
| Donor files modified in the last 24 hours                               | **0**                                                                                                                                                                                                                                                 |
| Donor `git status` (read-only)                                          | 3 pre-existing modifications: `backend/services/employee/attendance.service.js`, `backend/test/employee/employee.test.js`, `frontend/src/pages/EmployeeDashboard/components/TodayAttendance.tsx` — identical to the pre-A0 snapshot, dated 2026-10-01 |

The three donor modifications predate this work and were not touched.

---

## 11. Recommended next action

1. **Approve a baseline commit before A1** (recommended).
   The restructure and the A0 tooling changes are currently uncommitted, and HEAD still contains `apps/`. Suggested commit:
   `chore: finalize monorepo layout and A0 tooling baseline`
   Contents: `apps/` deletions, `backend/`, `frontend/`, `packages/shared/`, `docs/`, root config/lockfile changes. This makes A1 diffs reviewable and removes blocker F6. This is the only open item that needs your decision.
2. **Start A1** using `packages/shared` only: apply the blocking review findings (C1, H1, H2, H4, H5, M1, M5, M8, M10, M17), collapse to three roles, defer/drop enterprise contracts, and add the `node --test` suite.
3. **Clear F1 during A1** with a single `npm run format` after the shared rewrite (do not reformat now; those files are about to change).
4. **Optionally remove `package-lock.backup.json`** before the initial commit (F10).

No A1 work has started. The next phase waits for your approval.
