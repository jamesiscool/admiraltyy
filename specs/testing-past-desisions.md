## Testing Strategy Decisions Summary

### 1. Test Framework & Structure

| Layer | Tool | Notes |
|-------|------|-------|
| Unit tests | Vitest | Property-based with fast-check for pure functions |
| Integration | Vitest | DB + API routes |
| E2E | Playwright | UI flows, mock backends |

---

### 2. Database Testing

**Decision:** In-memory SQLite per test with Drizzle migrations

- Use `:memory:` databases for speed and isolation
- Run `migrate()` to apply schema (acceptable overhead for small schema)
- Squash migrations to single file (no legacy DBs to migrate)
- Seed data via SQL fixtures or TypeScript insert helpers

---

### 3. External API Caching (TMDB, Indexers)

**Decision:** Wrap `globalThis.fetch` with [fast-forward](https://github.com/with-logic/fast-forward)

| `NODE_ENV` | Mode | Behavior |
|------------|------|----------|
| `development` | `ON` | Read cache if available, fetch + store if not |
| `test` | `READ_ONLY` | Cache only, fail on miss |
| Other | `OFF` | No caching |

- Cache directory: `test/fixtures/http/`
- Committed to git for reproducible CI
- No separate `FF_MODE` or `CI` env vars — just `NODE_ENV`

---

### 4. NZBget Testing

**Decision:** Mock at API level for most tests

- **Unit/Integration:** Mock NZBget RPC responses (fake JSON-RPC server or MSW-style mocks)
- **E2E:** Mock NZBget — test your app, not NZBget
- **Optional Tier 2:** One smoke test with real NZBget (nightly/pre-release)

---

### 5. File System Testing

**Decision:** Use [memfs](https://github.com/nicosantangelo/memfs) for virtual filesystem

- Fast, in-memory file operations
- No disk cleanup needed
- Can mock file sizes by buffer content or mocking `statSync`

---

### 6. Fixtures Strategy

| Type | Location | Committed? |
|------|----------|------------|
| HTTP cache | `test/fixtures/http/` | ✅ Yes |
| DB seed data | `test/fixtures/seed.sql` or `.ts` | ✅ Yes |
| Filesystem structure | `test/fixtures/filesystem.ts` | ✅ Yes |

---

### 7. Bun/undici Limitations

- Bun doesn't fully support undici's `MockAgent` or `dispatcher` pattern
- ofetch's `dispatcher` option is ignored by Bun's native fetch
- **Solution:** Wrap at function level (fast-forward) instead of HTTP transport level

---

### Key Files to Create

```
test/
├── fixtures/
│   ├── http/                 # Fast-forward cache (committed)
│   ├── seed.sql              # DB seed data
│   └── filesystem.ts         # memfs structure
├── helpers/
│   ├── db.ts                 # setupTestDb()
│   └── mocks.ts              # API mocks
└── setup.ts                  # Global vitest setup

src/server/lib/
└── fetchCache.ts             # Fast-forward fetch wrapper
```