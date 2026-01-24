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

## Phase 2: Test Helpers

**Goal:** Create shared test utilities.

- [ ] Create `test/helpers/db.ts`
  - `setupTestDb()` — in-memory SQLite with migrations
  - `seedTestData(db)` — optional seed helper
  - Export typed `TestDb` type

- [ ] Create `test/helpers/mocks.ts`
  - `createNzbgetClient(mode)` — mock/stub/real based on env
  - `MockNzbgetClient` class with in-memory state

- [ ] Create `test/helpers/index.ts`
  - Re-export all helpers

---

## Phase 3: HTTP Caching (fast-forward)

**Goal:** Configure fast-forward for TMDB/indexer API caching.

- [ ] Create `src/lib/fetch-cache.ts`
  - Wrap `globalThis.fetch` with fast-forward
  - Mode based on `NODE_ENV`: dev=ON, test=READ_ONLY, prod=OFF
  - Cache dir: `test/fixtures/http/`

- [ ] Update existing TMDB service to use wrapped fetch
  - Modify `src/services/tmdb.ts` imports

- [ ] Populate initial cache
  - Run in dev mode to cache common TMDB responses
  - Commit `test/fixtures/http/` to git

---

## Phase 4: Database Testing

**Goal:** In-memory SQLite per test.

- [ ] Update `test/helpers/db.ts`
  - Use `better-sqlite3` with `:memory:`
  - Run Drizzle migrations on setup
  - Return typed db instance

- [ ] Create `test/fixtures/seed.sql` (optional)
  - Sample movies, shows, queue items for tests

- [ ] Create first DB integration test
  - `src/db/queries.test.ts` — test a query function

---

## Phase 5: Filesystem Testing (memfs)

**Goal:** Virtual filesystem for file operations.

- [ ] Install memfs
  ```bash
  bun add -d memfs
  ```

- [ ] Create `test/fixtures/filesystem.ts`
  - `createTestFilesystem()` — returns vol with sample structure
  - Sample media library structure

- [ ] Update file operations to accept fs interface
  - Or mock at module level in tests

---

## Phase 6: Property-Based Tests (started)

**Goal:** Add fast-check property tests to critical areas.

- [x] Utils property tests
  - `src/lib/utils.test.ts` — cn(), formatSize(), generateSettingId() property tests

- [ ] DB schema invariants
  - `src/db/queries.test.ts` — insert/retrieve roundtrip

- [ ] API response parsing
  - `src/services/tmdb.test.ts` — arbitrary response parsing

- [ ] State machines (if applicable)
  - Download queue state transitions

- [ ] Path sanitization
  - `src/lib/paths.test.ts` — no traversal escapes

---

## Phase 7: Playwright Setup

**Goal:** E2E testing infrastructure.

- [ ] Install Playwright
  ```bash
  bun add -d playwright @playwright/test
  bunx playwright install chromium
  ```

- [ ] Create `playwright.config.ts`
  - testDir: `./e2e`
  - webServer: `bun run dev` on port 2828
  - reuseExistingServer: true

- [ ] Create `e2e/` directory structure
  ```
  e2e/
  ├── search.spec.ts
  ├── add-movie.spec.ts
  └── fixtures/
  ```

- [ ] Add scripts to `package.json`
  - `"test:e2e": "playwright test"`
  - `"test:e2e:real": "NZBGET_MODE=real playwright test"`

---

## Phase 8: E2E User Flows

**Goal:** Cover all happy path user flows.

- [ ] `e2e/search.spec.ts`
  - Search movie by title
  - Search show by title
  - View search results

- [ ] `e2e/add-movie.spec.ts`
  - Search → select → add to library
  - Verify success feedback

- [ ] `e2e/add-show.spec.ts`
  - Search → select → add to library

- [ ] `e2e/library.spec.ts`
  - Browse movie library
  - Browse TV library
  - View item details

- [ ] `e2e/queue.spec.ts`
  - View download queue
  - (with mock NZBget)

- [ ] `e2e/settings.spec.ts`
  - Navigate to settings
  - Modify a setting

---

## Phase 9: NZBget Mock/Stub

**Goal:** Three-tier NZBget testing support.

- [ ] Create `test/helpers/nzbget-mock.ts`
  - `MockNzbgetClient` — in-memory, no network
  - Tracks calls, returns canned responses

- [ ] Create `test/helpers/nzbget-stub.ts`
  - `StubNzbgetClient` — fake JSON-RPC server
  - Uses actual HTTP but controlled responses

- [ ] Environment variable handling
  - `NZBGET_MODE`: mock (default) | stub | real
  - Factory function returns appropriate client

---

## Phase 10: CI Integration

**Goal:** GitHub Actions workflow.

- [ ] Create `.github/workflows/test.yml`
  ```yaml
  name: Tests
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: oven-sh/setup-bun@v2
        - run: bun install
        - run: bun test
          continue-on-error: true
        - run: bun test:e2e
          continue-on-error: true
  ```

- [ ] Cache Playwright browsers in CI

- [ ] Upload test artifacts (screenshots on failure)

---

## Files to Create

```
vitest.config.ts
playwright.config.ts
src/lib/fetch-cache.ts
test/
├── fixtures/
│   ├── http/                 # fast-forward cache (already exists)
│   ├── seed.sql
│   └── filesystem.ts
├── helpers/
│   ├── index.ts
│   ├── db.ts
│   ├── mocks.ts
│   ├── nzbget-mock.ts
│   └── nzbget-stub.ts
e2e/
├── search.spec.ts
├── add-movie.spec.ts
├── add-show.spec.ts
├── library.spec.ts
├── queue.spec.ts
├── settings.spec.ts
└── fixtures/
.github/workflows/test.yml
```

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add test scripts, devDependencies |
| `src/services/tmdb.ts` | Use cached fetch |

---

## Verification Checklist

After implementation:

- [x] `bun test` runs and finds colocated tests
- [ ] `bun test:e2e` runs Playwright tests
- [ ] fast-forward cache works (READ_ONLY mode fails on cache miss)
- [ ] In-memory DB tests are isolated
- [ ] memfs tests don't touch real filesystem
- [x] Property tests generate multiple cases
- [ ] NZBget mock mode works without network
- [ ] CI workflow runs (non-blocking)

---

## Dependencies to Add

```bash
# Property testing
bun add -d @fast-check/vitest

# Filesystem mocking  
bun add -d memfs

# E2E
bun add -d playwright @playwright/test
```

Already installed: `vitest`, `@with-logic/fast-forward`, `@testing-library/react`, `jsdom`
