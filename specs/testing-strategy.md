# Testing Strategy

## Overview

Property-based testing first, colocated test files, Vitest + Playwright.

## Test Layers

| Layer | Tool | Location | Purpose |
|-------|------|----------|---------|
| Unit | Vitest + fast-check | `*.test.ts` colocated | Pure functions, property tests |
| Integration | Vitest | `*.test.ts` colocated | DB + API routes |
| E2E | Playwright | `e2e/*.spec.ts` | User flows, happy paths |

## File Structure

```
src/
├── services/
│   ├── tmdb.ts
│   └── tmdb.test.ts          # colocated
├── db/
│   ├── queries.ts
│   └── queries.test.ts       # colocated
├── routes/
│   └── api/
│       ├── movies.ts
│       └── movies.test.ts    # colocated
e2e/
├── search.spec.ts
├── add-movie.spec.ts
└── queue.spec.ts
test/
├── fixtures/
│   ├── http/                 # fast-forward cache (committed)
│   ├── seed.sql              # DB seed data
│   └── filesystem.ts         # memfs structure
└── helpers/
    ├── db.ts                 # setupTestDb()
    └── mocks.ts              # shared mocks
```

## Property-Based Testing

Use fast-check for input space coverage. Priority areas:

### DB Queries
```typescript
import { fc } from '@fast-check/vitest';

// Schema invariants hold for all valid inputs
test.prop([fc.string(), fc.integer({ min: 1900, max: 2030 })])(
  'movie insert preserves data',
  async (title, year) => {
    const id = await insertMovie({ title, year });
    const movie = await getMovie(id);
    expect(movie.title).toBe(title);
    expect(movie.year).toBe(year);
  }
);
```

### API Response Parsing
```typescript
// TMDB responses parse without throwing
test.prop([arbitraryTmdbMovieResponse])(
  'parseTmdbMovie handles all valid responses',
  (response) => {
    expect(() => parseTmdbMovie(response)).not.toThrow();
  }
);
```

### State Machines
```typescript
// Download queue state transitions are valid
test.prop([fc.array(arbitraryQueueEvent)])(
  'queue never enters invalid state',
  (events) => {
    const queue = createQueue();
    for (const event of events) {
      queue.dispatch(event);
      expect(isValidState(queue.state)).toBe(true);
    }
  }
);
```

### URL/Path Sanitization
```typescript
// Paths never escape sandbox
test.prop([fc.string()])(
  'sanitizePath blocks traversal',
  (input) => {
    const result = sanitizePath(input);
    expect(result).not.toContain('..');
    expect(result.startsWith('/')).toBe(false);
  }
);
```

## Database Testing

In-memory SQLite per test with Drizzle migrations.

```typescript
// test/helpers/db.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export async function setupTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  await migrate(db, { migrationsFolder: './drizzle' });
  return db;
}
```

## External API Mocking

Wrap `globalThis.fetch` with fast-forward.

```typescript
// src/lib/fetch.ts
import { createFastForward } from '@with-logic/fast-forward';

const mode = {
  development: 'ON',
  test: 'READ_ONLY',
  production: 'OFF',
}[process.env.NODE_ENV ?? 'production'];

export const ff = createFastForward({
  mode,
  cacheDir: 'test/fixtures/http',
});

// Wrap fetch for TMDB, indexers
globalThis.fetch = ff.wrap(globalThis.fetch);
```

Cache committed to git. `READ_ONLY` in tests = fail on cache miss = reproducible CI.

## Filesystem Testing

Use memfs for virtual filesystem operations.

```typescript
import { vol } from 'memfs';

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    '/media/movies/Inception (2010)/Inception.mkv': '',
    '/media/tv/Breaking Bad/S01E01.mkv': '',
  });
});
```

## NZBget Testing

Three modes controlled by `NZBGET_MODE` env var:

| Mode | When | Behavior |
|------|------|----------|
| `mock` | Default in tests | In-memory fake, no network |
| `stub` | Integration tests | Fake JSON-RPC server |
| `real` | Manual/nightly | Actual NZBget instance |

```typescript
// test/helpers/mocks.ts
export function createNzbgetClient() {
  const mode = process.env.NZBGET_MODE ?? 'mock';
  
  if (mode === 'mock') return new MockNzbgetClient();
  if (mode === 'stub') return new StubNzbgetClient();
  return new RealNzbgetClient();
}
```

## E2E Testing

Playwright for all user flows. Happy paths only.

### Setup
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:2828',
    reuseExistingServer: true,
  },
});
```

### User Flows to Cover
- Search movie/show
- View details
- Add to library
- Queue management
- Settings configuration
- Library browsing

### Example
```typescript
// e2e/add-movie.spec.ts
test('add movie from search', async ({ page }) => {
  await page.goto('/search');
  await page.fill('[data-testid="search-input"]', 'Inception');
  await page.click('[data-testid="search-submit"]');
  await page.click('[data-testid="movie-card"]:first-child');
  await page.click('[data-testid="add-to-library"]');
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
});
```

## Test Documentation

Lighter than Rust style. One-line comment explaining the "why" when non-obvious.

```typescript
// Prevents race condition when parallel requests add same movie
test('addMovie is idempotent', async () => { ... });

// TMDB returns null for deleted movies, must not throw
test('getMovie handles null response', async () => { ... });
```

Skip comments for self-explanatory tests:
```typescript
test('parseTmdbMovie extracts title', () => { ... }); // obvious, no comment needed
```

## Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:real": "NZBGET_MODE=real playwright test",
    "test:all": "vitest run && playwright test"
  }
}
```

## CI

- Run `test:all` on every push
- Don't block PRs on failure (advisory)
- No coverage thresholds (yet)

```yaml
# .github/workflows/test.yml
- run: bun test
  continue-on-error: true
- run: bun test:e2e
  continue-on-error: true
```

## Dependencies

```bash
bun add -d vitest @fast-check/vitest memfs playwright @playwright/test
```

Already have: `@with-logic/fast-forward`, `@testing-library/react`, `jsdom`
