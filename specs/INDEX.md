# Admiraltyy Specifications

Technical documentation for Admiraltyy, a unified Usenet media automation platform.

## Core Architecture

| Spec | Code | Purpose |
|------|------|---------|
| [architecture.md](./architecture.md) | [src/](../src/) | Folder structure, TanStack patterns, data flow |

## Domain Systems

| Spec | Code | Purpose |
|------|------|---------|
| [download-system.md](./download-system.md) | [services/nzbget/](../src/services/nzbget/) | NZBGet integration, download lifecycle |
| [indexer-system.md](./indexer-system.md) | [services/indexers.ts](../src/services/indexers.ts) | Newznab protocol, search |
| [release-scoring.md](./release-scoring.md) | [services/search.ts](../src/services/search.ts) | Quality rules, release ranking |
| [file-management.md](./file-management.md) | [services/fileScan.ts](../src/services/fileScan.ts) | Library scanning, import |
| [task-system.md](./task-system.md) | [services/tasks.ts](../src/services/tasks.ts) | Background job scheduling |

## Integrations

| Spec | Code | Purpose |
|------|------|---------|
| [tmdb-integration.md](./tmdb-integration.md) | [services/tmdb.ts](../src/services/tmdb.ts) | TMDB/TVDB API usage |

## Testing

| Spec | Code | Purpose |
|------|------|---------|
| [testing-strategy.md](./testing-strategy.md) | [test/](../test/) | Test layers, patterns, tooling |
| [filesystem-size-stub.md](./filesystem-size-stub.md) | [test/fixtures/filesystem.ts](../test/fixtures/filesystem.ts) | Stub file sizes in memfs |