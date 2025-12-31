---
name: Add Movie to DB
overview: Implement the "Add Movie" functionality that fetches TMDB metadata and saves the movie to the database with monitored=true and sync timestamp.
todos:
  - id: tmdb-details
    content: Add fetchMovieDetails() to tmdb.ts for full movie metadata
    status: completed
  - id: movies-post
    content: Implement POST /api/movies to insert movie with TMDB data
    status: completed
    dependencies:
      - tmdb-details
  - id: client-dialog
    content: Wire AddMovieDialog handleAdd to call the movies API
    status: completed
    dependencies:
      - movies-post
---

# Add Movie to Database with TMDB Metadata

## Summary

Implement the movie creation flow: when user clicks "Add" in the AddMovieDialog, fetch full metadata from TMDB and insert into the `movies` table with `monitored: true` and `lastInfoSync` set.

## Implementation

### 1. Add TMDB movie details fetcher

Add `fetchMovieDetails(tmdbId)` function to [`src/server/api/tmdb.ts`](src/server/api/tmdb.ts) that fetches:

- Runtime, genres (as names), cast, IMDB ID
- Release dates (cinema/digital)
- Content rating

TMDB endpoints needed:

- `/movie/{id}` with `append_to_response=credits,release_dates`

### 2. Implement POST /api/movies endpoint

Update [`src/server/routes/movies.ts`](src/server/routes/movies.ts):

- Accept `{ tmdbId, resolution }` in request body
- Call `fetchMovieDetails(tmdbId)`
- Insert into `movies` table with:
- `monitored: true` (default)
- `dateAdded: new Date().toISOString()`
- `lastInfoSync: new Date().toISOString()`
- All TMDB metadata mapped to schema fields

### 3. Wire up client dialog

Update [`src/client/routes/add/-add-movie-dialog.tsx`](src/client/routes/add/-add-movie-dialog.tsx):

- Replace TODO in `handleAdd` with API call to `POST /api/movies`