# Testing Implementation Plan

Implementation checklist for `specs/testing.md`.

---

## Phase 1: Vitest Configuration ✓

**Goal:** Configure Vitest for colocated tests with fast-check integration.

- [x] Update `package.json` scripts
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"test:all": "vitest run && playwright test"`

- [x] Create `vitest.config.ts`
  - Configure `include: ['src/**/*.test.ts']`
  - Setup jsdom environment for React components
  - Configure coverage (optional, no thresholds)

- [x] Install missing dependencies
  ```bash
  bun add -d @fast-check/vitest
  ```

- [x] Create sample unit test to verify setup
  - `src/lib/utils.test.ts` — test `cn()` utility

---

## Phase 2: Test Helpers ✓

**Goal:** Create shared test utilities.

- [x] Create `test/helpers/db.ts`
  - `setupTestDb()` — in-memory SQLite with migrations
  - `seedTestData(db)` — optional seed helper
  - Export typed `TestDb` type

- [x] Create `test/helpers/mocks.ts`
  - `createNzbgetClient(mode)` — mock/stub/real based on env
  - `MockNzbgetClient` class with in-memory state

- [x] Create `test/helpers/index.ts`
  - Re-export all helpers

---

## Phase 3: HTTP Caching (fast-forward) ✓

**Goal:** Configure fast-forward for TMDB/indexer API caching.

- [x] TMDB service already uses fast-forward
  - `src/services/tmdb.ts` wraps fetch with fast-forward
  - Mode based on `BUN_ENV`: dev=ON, test=READ_ONLY, prod=OFF
  - Cache dir: `test/fixtures/http/tmdb/`

- [x] Initial cache populated
  - `test/fixtures/http/tmdb/` contains cached TMDB responses
  - Committed to git

---

## Phase 4: Database Testing ✓

**Goal:** In-memory SQLite per test.

- [x] `test/helpers/db.ts` implemented
  - Uses `better-sqlite3` with `:memory:` (Node/vitest)
  - Uses `bun:sqlite` with `:memory:` (Bun runtime)
  - Creates tables via DDL (no migrations needed)
  - Returns typed db instance

- [x] Create first DB integration test
  - `test/helpers/db.test.ts` — tests insert/retrieve, isolation, seeding
  - Property tests for movie/series insert roundtrip

- [ ] Create `test/fixtures/seed.sql` (optional)
  - Sample movies, shows, queue items for tests

---

## Phase 5: Filesystem Testing (memfs) ✓

**Goal:** Virtual filesystem for file operations.

- [x] Install memfs
  - Already in devDependencies

- [x] Create `test/fixtures/filesystem.ts`
  - `createTestFilesystem()` — returns vol with sample structure
  - `createEmptyFilesystem()` — empty vol
  - `createFilesystemFromJSON()` — custom structure
  - Sample media library structure (movies, TV, downloads)

- [x] Mock at module level in tests
  - `src/services/fileScan.test.ts` mocks `node:fs` with memfs
  - Tests listSubfolders, listVideoFiles, listVideoFilesRecursive

---

## Phase 6: Property-Based Tests ✓

**Goal:** Add fast-check property tests to critical areas.

- [x] Utils property tests
  - `src/lib/utils.test.ts` — cn(), formatSize(), generateSettingId() property tests

- [x] DB schema invariants
  - `test/helpers/db.test.ts` — insert/retrieve roundtrip for movies/series

- [x] FileScan property tests
  - `src/services/fileScan.test.ts` — simplifyTitle, parseEpisode, parseQuality

- [x] API response parsing
  - `src/services/tmdb.test.ts` — arbitrary response parsing

- [ ] State machines (if applicable)
  - Download queue state transitions

- [ ] Path sanitization
  - `src/lib/paths.test.ts` — no traversal escapes

---

## Phase 7: Playwright Setup ✅ Complete

**Goal:** E2E testing infrastructure.

- [x] Install Playwright
  - Already in devDependencies: `@playwright/test`, `playwright`
  - Chromium installed via `bunx playwright install`

- [x] Create `playwright.config.ts`
  - testDir: `./e2e`
  - webServer: `bun run dev` on port 2828
  - reuseExistingServer: true

- [x] Create `e2e/` directory structure
  ```
  e2e/
  └── search.spec.ts
  ```

- [x] Add scripts to `package.json`
  - `"test:e2e": "playwright test"`
  - `"test:e2e:real": "NZBGET_MODE=real playwright test"`

---

## Phase 8: E2E User Flows ✅ Complete

**Goal:** Cover all happy path user flows.

- [x] `e2e/search.spec.ts`
  - Search movie by title
  - Search show by title
  - View search results

- [x] `e2e/add-movie.spec.ts`
  - Search → select → open dialog
  - Quality selector visible
  - Add buttons visible

- [x] `e2e/add-show.spec.ts`
  - Search → open dialog
  - Quality selector and buttons visible

- [x] `e2e/library.spec.ts`
  - Browse movie library
  - Browse TV library
  - Search inputs visible

- [x] `e2e/queue.spec.ts`
  - Activity page navigation
  - Basic page loading

- [x] `e2e/settings.spec.ts`
  - Navigate to settings
  - Section headings visible

---

## Phase 9: NZBget Mock/Stub (partial)

**Goal:** Three-tier NZBget testing support.

- [x] Create `test/helpers/mocks.ts`
  - `MockNzbgetClient` — in-memory, no network
  - Tracks calls, returns canned responses
  - `createNzbgetClient()` factory function

- [ ] Create `test/helpers/nzbget-stub.ts`
  - `StubNzbgetClient` — fake JSON-RPC server
  - Uses actual HTTP but controlled responses

- [x] Environment variable handling
  - `NZBGET_MODE`: mock (default) | stub | real
  - Factory function returns appropriate client (mock only for now)

---

## Phase 10: CI Integration ✅ Complete

**Goal:** GitHub Actions workflow.

- [x] Create `.github/workflows/test.yml`
  - Triggers on push/PR to main
  - Runs `bun run test` and `bun run test:e2e`
  - continue-on-error: true (non-blocking)

- [x] Cache Playwright browsers in CI
  - Uses actions/cache@v4 with playwright version key
  - Caches ~/.cache/ms-playwright

- [x] Upload test artifacts (screenshots on failure)
  - Uploads playwright-report/ and test-results/
  - 7-day retention

---

## Files Created

```
vitest.config.ts ✓
playwright.config.ts ✓
test/
├── fixtures/
│   ├── http/                 # fast-forward cache ✓
│   ├── filesystem.ts ✓
│   └── filesystem.test.ts ✓
├── helpers/
│   ├── index.ts ✓
│   ├── db.ts ✓
│   ├── db.test.ts ✓
│   ├── mocks.ts ✓
│   └── mocks.test.ts ✓
src/
├── lib/utils.test.ts ✓
├── services/fileScan.test.ts ✓
├── services/tmdb.test.ts ✓
e2e/
├── search.spec.ts ✓
├── add-movie.spec.ts ✓
├── add-show.spec.ts ✓
├── library.spec.ts ✓
├── settings.spec.ts ✓
└── queue.spec.ts ✓
```

## Files to Create (Remaining)

```
test/fixtures/seed.sql          # Optional DB seed data
test/helpers/nzbget-stub.ts     # Phase 9 - stub server
```

## Files Created (This Session)

```
.github/workflows/test.yml      # Phase 10 - CI ✓
```

---

## Verification Checklist

After implementation:

- [x] `bun test` runs and finds colocated tests
- [x] `bun test:e2e` runs Playwright tests
- [x] fast-forward cache works (TMDB uses READ_ONLY in test mode)
- [x] In-memory DB tests are isolated
- [x] memfs tests don't touch real filesystem
- [x] Property tests generate multiple cases
- [x] NZBget mock mode works without network
- [x] CI workflow runs (non-blocking)

---

## Dependencies

```bash
# Already installed
vitest ✓
@fast-check/vitest ✓
memfs ✓
@with-logic/fast-forward ✓
@testing-library/react ✓
jsdom ✓
playwright ✓
@playwright/test ✓
```
