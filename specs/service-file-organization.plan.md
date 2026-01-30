# Service File Organization — Migration Plan

## Tasks

### movies ✅ Complete
- [x] Create `movies.functions.ts` — extract `createServerFn` from `movies.server.ts`
- [x] Refactor `movies.server.ts` — export named helpers, remove `createServerFn`
- [x] Update `movies.queries.ts` — import from `movies.functions.ts`

### series ✅ Complete
- [x] Create `series.functions.ts` — extract `createServerFn` from `series.server.ts`
- [x] Refactor `series.server.ts` — export named helpers, remove `createServerFn`
- [x] Update `series.queries.ts` — import from `series.functions.ts`

### search ✅ Complete
- [x] Create `search.functions.ts` — extract `createServerFn` from `search.server.ts`
- [x] Refactor `search.server.ts` — export named helpers, remove `createServerFn`
- [x] Update `search.queries.ts` — import from `search.functions.ts`

### settings ✅ Complete
- [x] Merge `settings.internal.ts` into `settings.server.ts`
- [x] Create `settings.functions.ts` — extract `createServerFn` from `settings.server.ts`
- [x] Refactor `settings.server.ts` — export named helpers, remove `createServerFn`
- [x] Update `settings.queries.ts` — import from `settings.functions.ts`
- [x] Delete `settings.internal.ts`

### nzbget ✅ Complete
- [x] Create `nzbget.functions.ts` — extract `createServerFn` from `activity.server.ts`
- [x] Refactor `nzbget.server.ts` — inline DB helpers from `nzbget.queries.ts`
- [x] Update `nzbget.queries.ts` — React Query options importing from `nzbget.functions.ts`
- [x] Update `activity.server.ts` — remove nzbget functions
- [x] Update `activity.queries.ts` — remove nzbget query options
- [x] Update `activity/index.tsx` — import from `nzbget.functions.ts`

### activity ✅ Complete
- [x] Create `activity.ts` — extract types/interfaces from `activity.server.ts`
- [x] Create `activity.functions.ts` — extract `createServerFn` from `activity.server.ts`
- [x] Refactor `activity.server.ts` — export named helpers, remove `createServerFn`
- [x] Update `activity.queries.ts` — import from `activity.functions.ts`

### episodes ✅ Complete
- [x] Create `episodes.ts` — extract types/interfaces from `episodes.server.ts`
- [x] Create `episodes.functions.ts` — extract `createServerFn` from `episodes.server.ts`
- [x] Refactor `episodes.server.ts` — export named helpers, remove `createServerFn`
- [x] Create `episodes.queries.ts` — add queryOptions (skipped, no queries exist yet)

### tasks ✅ Complete
- [x] Create `tasks.ts` — extract types/interfaces from `tasks.server.ts`
- [x] Create `tasks.functions.ts` — extract `createServerFn` from `tasks.server.ts`
- [x] Refactor `tasks.server.ts` — export named helpers, remove `createServerFn`
- [x] Create `tasks.queries.ts` — add queryOptions (skipped, no queries exist — mutations only)

### fileImport ✅ Complete
- [x] Create `fileImport.ts` — extract types/interfaces from `fileImport.server.ts`
- [x] Create `fileImport.functions.ts` — extract `createServerFn` from `fileImport.server.ts` (skipped, no createServerFn exists)
- [x] Refactor `fileImport.server.ts` — import types from `fileImport.ts`

### Standalone Services (no changes needed)
- `tmdb.ts` — external API wrapper, client-safe
- `tmdb-mappers.ts` — pure mapping functions
- `indexers.ts` — server-only, no createServerFn exposure needed
- `fileScan.ts` — server-only utilities
- `logs.ts` — server-only logging
