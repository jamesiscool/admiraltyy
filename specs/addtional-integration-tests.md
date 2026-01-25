# Functional Integration Test Gaps

## High Priority - Core Workflows

### Movie Add Workflow
- [x] Test TMDB fetch + DB insert for `createMovie()`
- [x] Test duplicate movie detection
- [x] Test `grabMovieRelease()`: NZB download -> NZBGet queue -> DB record
- [ ] Test movie file import: download dir -> destination -> DB record
- [ ] Test cascade delete for movies (movie -> files -> releases -> downloads)

### Series Add Workflow
- [ ] Test `createSeries()` with TMDB fetch + seasons/episodes insert
- [ ] Test monitored seasons selection during series creation
- [ ] Test `grabEpisodeRelease()`: NZB download -> NZBGet queue -> DB record
- [ ] Test episode file import with season determination
- [ ] Test cascade delete for series (series -> seasons -> episodes -> files -> releases -> downloads)

### File Scanning Workflow
- [ ] Test `scanMoviesFiles()` end-to-end with DB operations
- [ ] Test `scanSeriesFiles()` end-to-end with episode matching
- [ ] Test deleted file detection (`markDeletedMovieFiles`, `markDeletedSeriesFiles`)
- [ ] Test upsert operations with real DB

### Download Completion Workflow
- [ ] Test `syncNzbgetHistory()` sync logic between NZBGet and DB
- [ ] Test download status transitions
- [ ] Test file import triggering on download completion

---

## Medium Priority - Individual Operations

### Database/ORM
- [ ] Test complex queries with joins (e.g., `findSeriesWithDetails()`)
- [ ] Test `listMovies()` with file size aggregation
- [ ] Test `listSeries()` with episode count/missing episode calculations
- [ ] Test relationship integrity constraints
- [ ] Test bulk operations (e.g., deleting multiple seasons)

### NZBGet Integration
- [ ] Test NZBGet API initialization flow
- [ ] Test polling logic (`nzbgetPoller.ts`)
- [ ] Test process management lifecycle (`nzbgetProcess.ts`)
- [ ] Test orphan cleanup on process exit
- [ ] Test NZBGet API failure handling

### TMDB Service
- [ ] Test actual API calls (not just mappers)
- [ ] Test `searchMulti()` aggregation
- [ ] Test `fetchMovieDetails()` and `fetchSeriesWithEpisodes()`
- [ ] Test `checkNeedsYearDisambiguation()` DB query logic
- [ ] Test API error handling/retries

### Indexer Service
- [ ] Test NZB download with error handling
- [ ] Test Newznab API response parsing
- [ ] Test search result normalization
- [ ] Test attribute extraction from Newznab response
- [ ] Test network error handling

### Settings Service
- [ ] Test settings initialization from file
- [ ] Test default settings creation
- [ ] Test settings persistence to disk
- [ ] Test corrupted settings file handling

### File Import
- [ ] Test error handling (missing finalDir, no video files)
- [ ] Test subtitle file handling
- [ ] Test quality parsing during import
- [ ] Test `buildMoviePath()` and `buildTvPath()` logic
- [ ] Test year disambiguation in folder names

---

## Lower Priority - Edge Cases

### Series/Episodes
- [ ] Test series with no episodes
- [ ] Test season/episode monitoring state propagation
- [ ] Test next airing date calculation
- [ ] Test `useYearInFolder` disambiguation logic

### Search
- [ ] Test empty query handling
- [ ] Test pagination
- [ ] Test movie vs TV result aggregation

### Movies
- [ ] Test alternative title handling
- [ ] Test file size calculations in movie details
- [ ] Test error handling when TMDB API fails
- [ ] Test error handling when NZBGet returns invalid ID

### Logging
- [ ] Test log file creation
- [ ] Test timestamp formatting

---

## Test Infrastructure Notes

- Database helper exists at `test/helpers/db.ts` - use for integration tests
- NZBGet stub exists at `test/helpers/nzbget-stub.ts` - use for NZBGet integration
- Mock NZBGet client at `test/helpers/mocks.ts`
- Filesystem fixtures at `test/fixtures/filesystem.ts`
- Prefer property-based tests (fast-check) where applicable
- Colocate tests: `foo.ts` -> `foo.test.ts`
