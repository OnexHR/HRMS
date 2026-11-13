import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Single lint configuration for the monorepo.
 *
 * `basePath` is pinned to the repository root so the workspace `lint` scripts
 * (which run from `frontend/`, `backend/`, and `packages/shared/`) match the
 * same repository-relative globs as the root `npm run lint`.
 */
const repoRoot = import.meta.dirname

export default defineConfig([
  globalIgnores(['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**']),
  {
    basePath: repoRoot,
    files: ['frontend/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    basePath: repoRoot,
    files: ['packages/shared/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    basePath: repoRoot,
    files: ['backend/**/*.js', 'eslint.config.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
  },
])
