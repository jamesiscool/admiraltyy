# Service File Organization

## Overview

Every service domain follows a 4-file pattern that separates concerns by environment and purpose.

## File Pattern

```
src/services/
├── movies.ts           # Client-safe code
├── movies.functions.ts # Server function wrappers (createServerFn)
├── movies.server.ts    # Server-only helpers
└── movies.queries.ts   # React Query options only
```

## File Responsibilities

### `*.ts` — Client-Safe Code

Safe to import anywhere (client or server).

**Contains:**
- Zod schemas for validation
- TypeScript interfaces/types
- Pure functions (no side effects, no imports from server-only modules)
- Constants

**Rules:**
- No `node:*` or `bun:*` imports
- No database imports
- No `createServerFn`
- No file system access

**Example:**

```typescript
// movies.ts
import { z } from 'zod'
import type * as schema from '@/db/schema'

export interface MoviePreview {
  id: number
  title: string
  year: number
  posterUrl: string | null
}

export const grabReleaseInput = z.object({
  movieId: z.string(),
  guid: z.string(),
  title: z.string(),
  downloadUrl: z.string(),
  size: z.number(),
})

export type GrabReleaseInput = z.infer<typeof grabReleaseInput>

// Pure function - no imports, deterministic
export function formatMovieTitle(title: string, year: number): string {
  return `${title} (${year})`
}
```

### `*.functions.ts` — Server Function Wrappers

`createServerFn` wrappers that expose server logic to the client via RPC.

**Contains:**
- `createServerFn` declarations only
- Input validation (via `.inputValidator()`)
- Handlers that call into `*.server.ts` helpers

**Rules:**
- Thin wrappers — logic lives in `*.server.ts`
- One server function per operation
- Imports from `*.ts` for schemas, `*.server.ts` for logic

**Example:**

```typescript
// movies.functions.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { grabReleaseInput } from './movies'
import { 
  listMoviesFromDb, 
  getMovieById, 
  createMovieFromTmdb,
  grabMovieReleaseImpl 
} from './movies.server'

export const listMovies = createServerFn({ method: 'GET' })
  .handler(async () => listMoviesFromDb())

export const getMovie = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ movieId: z.string() }))
  .handler(async ({ data }) => getMovieById(data.movieId))

export const createMovie = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tmdbId: z.number() }))
  .handler(async ({ data }) => createMovieFromTmdb(data.tmdbId))

export const grabMovieRelease = createServerFn({ method: 'POST' })
  .inputValidator(grabReleaseInput)
  .handler(async ({ data }) => grabMovieReleaseImpl(data))
```

### `*.server.ts` — Server-Only Helpers

Business logic that runs exclusively on the server.

**Contains:**
- Database queries and mutations
- File system operations
- External API calls (TMDB, indexers, NZBGet)
- Node/Bun API usage

**Rules:**
- Never import in client code
- No `createServerFn` — those go in `*.functions.ts`
- Export named functions for each operation
- Can import from `*.ts` for types/schemas

**Example:**

```typescript
// movies.server.ts
import { readFile } from 'node:fs/promises'
import { eq, sql } from 'drizzle-orm'
import { db, schema } from '@/db'
import { fetchMovieDetails } from '@/services/tmdb'
import type { MoviePreview, GrabReleaseInput } from './movies'

export async function listMoviesFromDb(): Promise<MoviePreview[]> {
  return db.all<MoviePreview>(sql`
    SELECT id, title, year, poster_url as posterUrl
    FROM movies
  `)
}

export async function getMovieById(movieId: string) {
  const numId = parseInt(movieId, 10)
  if (Number.isNaN(numId)) throw new Error('Invalid movie ID')
  
  const movies = await db
    .select()
    .from(schema.movies)
    .where(eq(schema.movies.id, numId))
    .limit(1)
  
  if (!movies.length) throw new Error('Movie not found')
  return movies[0]
}

export async function createMovieFromTmdb(tmdbId: number) {
  const details = await fetchMovieDetails(tmdbId)
  const [movie] = await db.insert(schema.movies).values({
    tmdbId: details.tmdbId,
    title: details.title,
    year: details.year,
    // ...
  }).returning()
  return movie
}

export async function grabMovieReleaseImpl(data: GrabReleaseInput) {
  const nzbContent = await readFile(nzbPath)
  // ... queue to NZBGet, create DB records
}
```

### `*.queries.ts` — React Query Options

Query/mutation options for use with TanStack Query.

**Contains:**
- `queryOptions()` calls only
- `mutationOptions()` if needed
- Query key definitions

**Rules:**
- Import server functions from `*.functions.ts`
- No business logic
- Keep consistent query key patterns

**Example:**

```typescript
// movies.queries.ts
import { queryOptions } from '@tanstack/react-query'
import { getMovie, listMovies } from './movies.functions'

export const listMoviesQueryOptions = () =>
  queryOptions({
    queryKey: ['movies'],
    queryFn: () => listMovies(),
  })

export const getMovieQueryOptions = (movieId: string) =>
  queryOptions({
    queryKey: ['movies', movieId],
    queryFn: () => getMovie({ data: { movieId } }),
  })
```

## Import Rules

| From \ To | `*.ts` | `*.functions.ts` | `*.server.ts` | `*.queries.ts` |
|-----------|--------|------------------|---------------|----------------|
| Client code | ✅ | ✅ | ❌ | ✅ |
| `*.ts` | ✅ | ❌ | ❌ | ❌ |
| `*.functions.ts` | ✅ | ✅ | ✅ | ❌ |
| `*.server.ts` | ✅ | ❌ | ✅ | ❌ |
| `*.queries.ts` | ✅ | ✅ | ❌ | ✅ |

Key constraints:
- Client code never imports `*.server.ts` directly
- `*.ts` has no internal service dependencies
- `*.functions.ts` is the bridge between client and server

## Migration Notes

Current state has `createServerFn` in `*.server.ts` files. To migrate:

1. Create `*.functions.ts` with `createServerFn` wrappers
2. Move business logic from handlers to named functions in `*.server.ts`
3. Have `*.functions.ts` handlers call `*.server.ts` functions
4. Update `*.queries.ts` imports to point to `*.functions.ts`
5. Verify client code imports from correct files

### `*.internal.ts` Files

Legacy pattern — merge into `*.server.ts`. Example: `settings.internal.ts` logic moves to `settings.server.ts`.
