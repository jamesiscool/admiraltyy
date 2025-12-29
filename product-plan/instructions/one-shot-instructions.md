# Complete Implementation Guide

This guide contains all milestones for implementing Admiraltyy from scratch.

---

## Milestone 1: Foundation

### Project Setup

1. Initialize a Bun project with TypeScript
2. Set up the frontend (React + Vite + Tailwind CSS v4)
3. Set up the backend (Hono API framework)
4. Configure the database (SQLite or PostgreSQL)

### Dependencies

**Frontend:**
- react, react-dom
- @tanstack/react-query (data fetching)
- lucide-react (icons)
- tailwindcss v4

**Backend:**
- hono
- drizzle-orm (or your preferred ORM)
- zod (validation)

### Database Schema

Create tables for all entities in the data model:
- `movies` — Tracked movies with TMDB metadata
- `series` — Tracked TV series with TVDB metadata
- `seasons` — Seasons within series
- `episodes` — Episodes within seasons
- `files` — Downloaded media files
- `releases` — NZB releases from indexers
- `downloads` — Download queue and history
- `indexers` — Configured Usenet indexers
- `settings` — Global settings (quality, languages, formats, auth)

### API Structure

```
/api
├── /movies
│   ├── GET /          # List all movies
│   ├── POST /         # Add a movie
│   ├── GET /:id       # Get movie details
│   ├── PATCH /:id     # Update movie
│   ├── DELETE /:id    # Remove movie
│   └── POST /:id/search  # Search for releases
├── /series
│   ├── GET /          # List all series
│   ├── POST /         # Add a series
│   ├── GET /:id       # Get series details
│   ├── PATCH /:id     # Update series
│   ├── DELETE /:id    # Remove series
│   └── POST /:id/search  # Search for releases
├── /activity
│   ├── GET /queue     # Current download queue
│   ├── GET /history   # Download history
│   ├── POST /queue/:id/pause    # Pause download
│   ├── POST /queue/:id/resume   # Resume download
│   └── DELETE /queue/:id        # Cancel download
├── /settings
│   ├── GET /          # Get all settings
│   ├── PATCH /        # Update settings
│   ├── GET /indexers  # List indexers
│   ├── POST /indexers # Add indexer
│   └── ...
└── /search
    ├── GET /movies?q=  # Search TMDB
    └── GET /series?q=  # Search TVDB
```

---

## Milestone 2: Application Shell

### Components to Implement

1. **AppShell** — Main layout wrapper
2. **MainNav** — Top navigation bar with logo, nav items, user menu
3. **UserMenu** — Avatar dropdown with logout

### Requirements

- Sticky top navigation (64px height)
- Logo on the left, nav items center-left, user menu right
- Mobile hamburger menu below md breakpoint
- Support light and dark mode
- Navigation items: Dashboard, Movies, TV, Activity, Settings

### Routing

Set up client-side routing:
- `/` → Dashboard
- `/movies` → Movies list
- `/movies/:id` → Movie detail
- `/tv` → TV series list
- `/tv/:id` → Series detail
- `/activity` → Activity (queue/history)
- `/settings` → Settings

---

## Milestone 3: Dashboard

### Components

1. **Dashboard** — Main dashboard view
2. **WantedMovieCard** — Movie poster card with hover actions
3. **WantedSeriesCard** — Series poster card with next episode info
4. **ViewAllCard** — Overflow card linking to full list
5. **DownloadsTable** — Recent downloads table

### Features

- Wanted Movies grid (max 2 rows, "View all" overflow)
- Upcoming TV grid (max 2 rows, "View all" overflow)
- Recent Downloads table (10 items max)
- Humanized dates ("tomorrow", "Wednesday", etc.)
- Card hover actions: auto-search, manual search, delete
- Clickable download rows navigate to movie/series

### API Endpoints Used

- `GET /api/movies?wanted=true` — Wanted movies
- `GET /api/series?wanted=true` — Series with wanted episodes
- `GET /api/activity/history?limit=10` — Recent downloads

---

## Milestone 4: Movies

### Components

1. **MoviesList** — Grid view with search, filters, sort
2. **MovieCard** — Poster card with status badge and hover actions
3. **MovieDetail** — Full movie page with synopsis, cast, file info
4. **AddMovie** — TMDB search modal/page

### Features

- Responsive poster grid
- Search by title
- Filter by: status (wanted/downloaded), quality, monitored, year
- Sort by: title, release date, date added, file size
- Card hover: auto-search, manual search, delete, three-dot menu
- Detail page: synopsis, cast, quality info, file path, release dates
- Toggle monitoring, edit quality preference
- Add Movie: search TMDB, select quality, add to library

### API Endpoints

- `GET /api/movies` — List with filters
- `GET /api/movies/:id` — Movie detail
- `POST /api/movies` — Add movie
- `PATCH /api/movies/:id` — Update movie
- `DELETE /api/movies/:id` — Delete movie
- `POST /api/movies/:id/search` — Trigger search
- `GET /api/search/movies?q=` — Search TMDB

---

## Milestone 5: TV

### Components

1. **TvList** — Grid view with search, filters, sort
2. **TvSeriesCard** — Poster card with status colors and hover actions
3. **TVDetail** — Series page with seasons and episode tables
4. **SeasonTable** — Episodes table for one season
5. **EpisodeRow** — Single episode row with status and actions
6. **AddTV** — TVDB search modal/page

### Features

- Responsive poster grid with status-based coloring:
  - Green: Complete (all episodes downloaded)
  - Blue: Continuing (future episodes monitored)
  - Yellow/glow: Missing (episodes past air date, no file)
- Season tables ordered by most recent first
- Monitoring toggles at series, season, and episode level
- Monitoring inheritance behavior (see spec)
- Episode status: downloaded, missing, airing

### API Endpoints

- `GET /api/series` — List with filters
- `GET /api/series/:id` — Series with seasons/episodes
- `POST /api/series` — Add series
- `PATCH /api/series/:id` — Update series
- `DELETE /api/series/:id` — Delete series
- `PATCH /api/series/:id/seasons/:seasonId` — Update season
- `PATCH /api/series/:id/episodes/:episodeId` — Update episode
- `GET /api/search/series?q=` — Search TVDB

---

## Milestone 6: Activity

### Components

1. **Activity** — Tab container (Queue/History)
2. **AlertBanner** — Dismissible error/warning banner
3. **QueueTable** — Active downloads with progress
4. **HistoryTable** — Past downloads with status

### Features

- Two tabs: Queue and History
- Alert banner for connectivity issues (dismissible)
- Queue table columns: Title, Progress, Speed, ETA, Size, Status, Actions
- Queue actions: Pause/Resume, Cancel, Force Start, Reorder
- History table: Title, Date, Status, Size, Quality
- History filters: status (completed/failed/removed)
- Error tooltip on failed history items
- Single download limit with force-start exception

### API Endpoints

- `GET /api/activity/queue` — Current queue
- `GET /api/activity/history` — History with filters
- `POST /api/activity/queue/:id/pause` — Pause
- `POST /api/activity/queue/:id/resume` — Resume
- `POST /api/activity/queue/:id/force` — Force start
- `DELETE /api/activity/queue/:id` — Cancel
- `POST /api/activity/queue/reorder` — Reorder queue

---

## Milestone 7: Settings

### Components

1. **Settings** — Main scrolling page with sticky sidebar
2. **IndexerCard** — Indexer configuration card
3. **ServerCard** — Usenet server configuration card
4. **FolderSection** — Movie/TV folder paths
5. **QualitySection** — Quality tier size settings
6. **LanguagesSection** — Subtitle and audio language preferences
7. **FormatsSection** — Codec, HDR, and audio format priorities
8. **AuthSection** — Authentication and API key settings

### Sections

1. **Indexers** — Stacked cards, add/edit/test/delete
2. **Servers** — Stacked cards with drag-to-reorder, priority numbers
3. **Folders** — Movie folders and TV folders with default selection
4. **Quality** — Size ranges per tier (min/target/max GB/hour)
5. **Languages** — Reorderable subtitle/audio lists, toggles
6. **Formats** — Codec, HDR, audio format priority with match/exclude terms
7. **Authentication** — Auth method, credentials, API key management

### Features

- Sticky right sidebar for section navigation
- Test connection for indexers and servers
- Drag-to-reorder for servers, languages, formats
- Inline add/edit forms (expand from "Add" button)
- API key: view, copy, regenerate with confirmation

### API Endpoints

- `GET /api/settings` — All settings
- `PATCH /api/settings` — Update settings
- `GET /api/settings/indexers` — List indexers
- `POST /api/settings/indexers` — Add indexer
- `POST /api/settings/indexers/:id/test` — Test connection
- (Similar for servers, folders)
- `POST /api/settings/auth/regenerate-key` — New API key

---

## Testing Guidelines

For each section, refer to the `tests.md` file which includes:
- User flow tests (happy paths)
- Empty state handling
- Error handling
- Edge cases
- Accessibility requirements

Implement tests before building features (TDD approach).

