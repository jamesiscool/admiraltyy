# Testing Strategy

## Overview

Property-based testing first, colocated test files, boundary interception (no DI mocks).

## Principles

**No dependency injection for testing.** Production code should not contain:
- `*Deps` interfaces
- `*Core` functions that take injected dependencies
- Conditional logic for test vs prod implementations

Instead: intercept at boundaries (network, filesystem, database).

## Test Layers

| Layer | Tool | Location | Purpose |
|-------|------|----------|---------|
| Unit | Vitest + fast-check | `*.test.ts` colocated | Pure functions, property tests |
| Integration | Vitest | `*.test.ts` colocated | DB + server functions |
| E2E | Playwright | `e2e/*.spec.ts` | User flows |

## File Structure

```
src/
├── services/
│   ├── movies.ts              # types, schemas, query options
│   ├── movies.functions.ts    # createServerFn wrappers
│   ├── movies.server.ts       # server-only logic
│   └── movies.server.test.ts  # colocated tests
├── db/
│   └── index.ts
e2e/
├── search.spec.ts
├── add-movie.spec.ts
└── queue.spec.ts
test/
├── fixtures/
│   ├── http/                  # fast-forward cache (committed)
│   └── seed.sql               # DB seed data
└── helpers/
    └── db.ts                  # setupTestDb()
```

## Boundary Interception

### Database — Real SQLite

In-memory SQLite with real migrations. No mocking.

```typescript
// test/helpers/db.ts
import Database from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'

export function setupTestDb() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, { migrationsFolder: './drizzle' })
  return db
}
```

### HTTP (TMDB, Indexers, NZBget) — fast-forward

Wrap `globalThis.fetch` to record/replay HTTP interactions. Works for all HTTP-based services including NZBget's JSON-RPC.

```typescript
// src/lib/fetch.ts
import { createFastForward } from '@with-logic/fast-forward'

const mode = {
  development: 'ON',
  test: 'READ_ONLY',
  production: 'OFF',
}[process.env.NODE_ENV ?? 'production']

export const ff = createFastForward({
  mode,
  cacheDir: 'test/fixtures/http',
})

globalThis.fetch = ff.wrap(globalThis.fetch)
```

- `ON` (dev): record new requests, replay cached
- `READ_ONLY` (test): replay only, fail on cache miss
- `OFF` (prod): passthrough

Cache committed to git. Tests are reproducible in CI.

### Filesystem — memfs

Virtual filesystem for file operations.

```typescript
import { vol } from 'memfs'

beforeEach(() => {
  vol.reset()
  vol.fromJSON({
    '/media/movies/Inception (2010)/Inception.mkv': '',
    '/media/tv/Breaking Bad/S01E01.mkv': '',
  })
})
```

## Property-Based Testing

Use fast-check for input space coverage.

### DB Invariants
```typescript
import { fc } from '@fast-check/vitest'

test.prop([fc.string(), fc.integer({ min: 1900, max: 2030 })])(
  'movie insert preserves data',
  async (title, year) => {
    const id = await insertMovie({ title, year })
    const movie = await getMovie(id)
    expect(movie.title).toBe(title)
    expect(movie.year).toBe(year)
  }
)
```

### API Response Parsing
```typescript
test.prop([arbitraryTmdbMovieResponse])(
  'parseTmdbMovie handles all valid responses',
  (response) => {
    expect(() => parseTmdbMovie(response)).not.toThrow()
  }
)
```

### Path Sanitization
```typescript
test.prop([fc.string()])(
  'sanitizePath blocks traversal',
  (input) => {
    const result = sanitizePath(input)
    expect(result).not.toContain('..')
  }
)
```

## E2E Testing

Playwright for user flows.

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:2828',
    reuseExistingServer: true,
  },
})
```

### Flows to Cover
- Search movie/show
- Add to library
- Queue management
- Settings configuration

## Test Documentation

One-line comment for non-obvious tests only.

```typescript
// Prevents race when parallel requests add same movie
test('addMovie is idempotent', async () => { ... })

// No comment needed - self-explanatory
test('parseTmdbMovie extracts title', () => { ... })
```

## Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```
