# Testing Implementation Plan

## Phase 1: Infrastructure Setup ✅ Complete

- [x] Install deps: `vitest`, `@fast-check/vitest`, `memfs`, `playwright`, `@playwright/test`
- [x] Create `vitest.config.ts` with path aliases
- [x] Create `playwright.config.ts` pointing to localhost:2828
- [x] Add test scripts to `package.json`
- [x] Create `test/helpers/db.ts` — in-memory SQLite setup
- [x] Create `test/fixtures/http/` directory for fast-forward cache
- [x] Set up fast-forward fetch wrapper (in `src/services/tmdb.ts` directly)
- [x] Wire fast-forward into nzbget, indexers (tmdb done)

## Phase 2: Database Test Helpers ✅ Complete

- [x] `setupTestDb()` — creates in-memory db with schema via drizzle-kit API
- [x] `seedTestData()` — sample movie, series, season, episodes
- [x] Verify schema works against in-memory SQLite (tests pass)

## Phase 3: HTTP Interception (fast-forward) ✅ Complete

- [x] Record TMDB API responses for common queries (100+ fixtures in `test/fixtures/http/tmdb/`)
- [x] Record NZBget JSON-RPC responses (auto-records during dev usage)
- [x] Record indexer API responses (auto-records during dev usage)
- [x] Commit fixtures to `test/fixtures/http/`
- [x] Verify READ_ONLY mode fails on cache miss (set `BUN_ENV=ci` in CI workflow)

## Phase 4: Filesystem Interception (memfs) ✅ Complete

- [x] Create test helper to mock `fs` with memfs (`test/helpers/fs.ts`)
- [x] Set up fixtures for media folder structures (`SAMPLE_MEDIA_LIBRARY`)
- [x] Wire into file scan / import tests (`fileScan.server.test.ts`)

## Phase 5: Unit Tests (Property-Based) ✅ Complete

Priority targets:

- [x] `src/services/tmdb-mappers.ts` — response parsing (`tmdb-mappers.test.ts`)
- [x] `src/services/fileScan.server.ts` — filename parsing, quality parsing, episode parsing (89 tests)
- [x] `src/services/path.server.ts` — path building/sanitization (21 tests)
- [x] Schema validation (zod schemas in `*.ts` files) (`schemas.test.ts`, 24 tests)

## Phase 6: Integration Tests ✅ Complete

- [x] `movies.server.test.ts` — CRUD, search releases, grab release (27 tests)
- [x] `series.server.test.ts` — CRUD, season/episode management (32 tests)
- [x] `episodes.server.test.ts` — find releases, grab release (13 tests)
- [x] `nzbget.server.test.ts` — queue operations, history sync (19 tests)
- [x] `settings.server.test.ts` — read/write settings, folder paths, password gen (22 tests)
- [x] `indexers.server.test.ts` — multi-indexer search (30 tests)

## Phase 7: E2E Tests ✅ Complete

- [x] `e2e/search.spec.ts` — search movie/show (7 tests)
- [x] `e2e/add-movie.spec.ts` — add movie dialog (4 tests)
- [x] `e2e/add-series.spec.ts` — add series from search (5 tests)
- [x] `e2e/movie-detail.spec.ts` — view movie, manual search dialog, delete modal (10 tests)
- [x] `e2e/settings.spec.ts` — configure folders, indexers (14 tests)

## Phase 8: CI Integration ✅ Complete

- [x] Add GitHub workflow for vitest
- [x] Add GitHub workflow for playwright
- [x] Configure continue-on-error (advisory)
- [x] Set `BUN_ENV=ci` for fast-forward READ_ONLY mode

---

## Open Questions

- fast-forward vs msw for stateful nzbget sequences?
- ~~how to handle nzbget process management in integration tests — skip or mock at process level?~~ Resolved: mock ofetch at RPC level, mock Bun.spawn to prevent process startup
- e2e: seed db before tests or rely on fast-forward http cache?
