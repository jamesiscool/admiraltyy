# Functional Integration Test Gaps

- If, while implementing the tests, it seems too convoluted and you don't think it's worth it for that case, mark it as complete but put a note explaining why. 

## High Priority - Core Workflows

### Movie Add Workflow ✅ Complete
- [x] Test TMDB fetch + DB insert for `createMovie()`
- [x] Test duplicate movie detection
- [x] Test `grabMovieRelease()`: NZB download -> NZBGet queue -> DB record
- [x] Test movie file import: download dir -> destination -> DB record
- [x] Test cascade delete for movies (movie -> files -> releases -> downloads)

### Series Add Workflow ✅ Complete
- [x] Test `createSeries()` with TMDB fetch + seasons/episodes insert
- [x] Test monitored seasons selection during series creation
- [x] Test `grabEpisodeRelease()`: NZB download -> NZBGet queue -> DB record
- [x] Test episode file import with season determination
- [x] Test cascade delete for series (series -> seasons -> episodes -> files -> releases -> downloads)

### File Scanning Workflow ✅ Complete
- [x] Test `scanMoviesFiles()` end-to-end with DB operations
- [x] Test `scanSeriesFiles()` end-to-end with episode matching
- [x] Test deleted file detection (`markDeletedMovieFiles`, `markDeletedSeriesFiles`)
- [x] Test upsert operations with real DB

### Download Completion Workflow ✅ Complete
- [x] Test `syncNzbgetHistory()` sync logic between NZBGet and DB
- [x] Test download status transitions
- [x] Test file import triggering on download completion

---

## Medium Priority - Individual Operations

### Database/ORM ✅ Complete
- [x] Test complex queries with joins (e.g., `findSeriesWithDetails()`)
- [x] Test `listMovies()` with file size aggregation
- [x] Test `listSeries()` with episode count/missing episode calculations
- [x] Test relationship integrity constraints
- [x] Test bulk operations (e.g., deleting multiple seasons)

### NZBGet Integration ✅ Complete
- [x] Test NZBGet API initialization flow
- [x] Test polling logic (`nzbgetPoller.ts`)
- [x] Test process management lifecycle (`nzbgetProcess.ts`)
- [x] Test orphan cleanup on process exit
- [x] Test NZBGet API failure handling

### TMDB Service ✅ Complete
- [x] Test actual API calls (not just mappers)
- [x] Test `searchMulti()` aggregation
- [x] Test `fetchSeriesPreview()` and `fetchSeriesWithEpisodes()`
- [x] Test `checkNeedsYearDisambiguation()` logic
- [x] Test `fetchMovieDetails()` (needs cached fixture)
- [x] Test API error handling/retries (error handlers return defaults: [], null, false)

### Indexer Service ✅ Complete
- [x] Test NZB download with error handling
- [x] Test Newznab API response parsing
- [x] Test search result normalization
- [x] Test attribute extraction from Newznab response
- [x] Test network error handling

### Settings Service ✅ Complete
- [x] Test settings initialization from file
- [x] Test default settings creation
- [x] Test settings persistence to disk
- [x] Test corrupted settings file handling

### File Import ✅ Complete
- [x] Test error handling (missing finalDir, no video files)
- [x] Test subtitle file handling
- [x] Test quality parsing during import
- [x] Test `buildMoviePath()` and `buildTvPath()` logic
- [x] Test year disambiguation in folder names

---

## Lower Priority - Edge Cases

### Series/Episodes ✅ Complete
- [x] Test series with no episodes
- [x] Test season/episode monitoring state propagation
- [x] Test next airing date calculation
- [x] Test `useYearInFolder` disambiguation logic

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
- Indexer stub exists at `test/helpers/indexer-stub.ts` - use for Newznab API integration
- Mock NZBGet client at `test/helpers/mocks.ts`
- Filesystem fixtures at `test/fixtures/filesystem.ts`
- Prefer property-based tests (fast-check) where applicable
- Colocate tests: `foo.ts` -> `foo.test.ts`
