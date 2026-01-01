# Milestone 1: Foundation

Set up the project foundation including dependencies, database, and API structure.

## Project Initialization

### 1. Create the Project

```bash
mkdir admiraltyy
cd admiraltyy
bun init
```

### 2. Install Frontend Dependencies

```bash
bun add react react-dom
bun add -d @types/react @types/react-dom
bun add @tanstack/react-query
bun add lucide-react
bun add vite @vitejs/plugin-react
bun add tailwindcss@next @tailwindcss/vite
```

### 3. Install Backend Dependencies

```bash
bun add hono
bun add drizzle-orm better-sqlite3 # or postgres + pg
bun add -d drizzle-kit
bun add zod
```

## Project Structure

```
admiraltyy/
├── src/
│   ├── client/           # React frontend
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── server/           # Hono backend
│   │   ├── routes/
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   └── index.ts
│   └── shared/           # Shared types
│       └── types.ts
├── public/
├── drizzle/              # Migrations
├── package.json
├── vite.config.ts
├── drizzle.config.ts
└── tailwind.config.ts    # (Not needed in v4)
```

## Database Schema

Create the schema in `src/server/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Movies
export const movies = sqliteTable('movies', {
  id: text('id').primaryKey(),
  tmdbId: integer('tmdb_id').notNull(),
  title: text('title').notNull(),
  year: integer('year').notNull(),
  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),
  synopsis: text('synopsis'),
  runtime: integer('runtime'),
  genres: text('genres'), // JSON array
  cast: text('cast'), // JSON array
  cinemaReleaseDate: text('cinema_release_date'),
  digitalReleaseDate: text('digital_release_date'),
  dateAdded: text('date_added').notNull(),
  monitored: integer('monitored', { mode: 'boolean' }).default(true),
  qualityPreference: text('quality_preference').default('1080p'),
});

// Series
export const series = sqliteTable('series', {
  id: text('id').primaryKey(),
  tvdbId: integer('tvdb_id').notNull(),
  title: text('title').notNull(),
  year: integer('year').notNull(),
  status: text('status').notNull(), // continuing | ended
  network: text('network'),
  overview: text('overview'),
  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),
  genres: text('genres'), // JSON array
  runtime: integer('runtime'),
  monitored: integer('monitored', { mode: 'boolean' }).default(true),
  qualityPreference: text('quality_preference').default('1080p'),
  dateAdded: text('date_added').notNull(),
  nextAiring: text('next_airing'),
});

// Seasons
export const seasons = sqliteTable('seasons', {
  id: text('id').primaryKey(),
  seriesId: text('series_id').references(() => series.id),
  seasonNumber: integer('season_number').notNull(),
  monitored: integer('monitored', { mode: 'boolean' }).default(true),
});

// Episodes
export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey(),
  seasonId: text('season_id').references(() => seasons.id),
  episodeNumber: integer('episode_number').notNull(),
  title: text('title').notNull(),
  airDate: text('air_date'),
  monitored: integer('monitored', { mode: 'boolean' }).default(true),
  runtime: integer('runtime'),
});

// Files
export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  movieId: text('movie_id').references(() => movies.id),
  episodeId: text('episode_id').references(() => episodes.id),
  path: text('path').notNull(),
  size: integer('size').notNull(),
  quality: text('quality').notNull(),
  source: text('source'),
  codec: text('codec'),
  dateImported: text('date_imported').notNull(),
});

// Downloads
export const downloads = sqliteTable('downloads', {
  id: text('id').primaryKey(),
  movieId: text('movie_id').references(() => movies.id),
  episodeId: text('episode_id').references(() => episodes.id),
  title: text('title').notNull(),
  progress: real('progress').default(0),
  speed: text('speed'),
  eta: text('eta'),
  size: text('size'),
  status: text('status').notNull(), // downloading | paused | queued | unpacking | verifying | completed | failed
  quality: text('quality'),
  dateDownloaded: text('date_downloaded').notNull(),
  errorMessage: text('error_message'),
});

// Indexers
export const indexers = sqliteTable('indexers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  apiKey: text('api_key').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  supportsSearch: integer('supports_search', { mode: 'boolean' }).default(true),
  supportsTvSearch: integer('supports_tv_search', { mode: 'boolean' }).default(true),
  supportsMovieSearch: integer('supports_movie_search', { mode: 'boolean' }).default(true),
});

// Servers
export const servers = sqliteTable('servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  username: text('username'),
  password: text('password'),
  ssl: integer('ssl', { mode: 'boolean' }).default(true),
  priority: integer('priority').default(0),
  connections: integer('connections').default(10),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
});

// Settings
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON stringified
});
```

## API Setup

Create the Hono server in `src/server/index.ts`:

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { moviesRoutes } from './routes/movies';
import { seriesRoutes } from './routes/series';
import { activityRoutes } from './routes/activity';
import { settingsRoutes } from './routes/settings';
import { searchRoutes } from './routes/search';

const app = new Hono();

app.use('*', cors());

// API routes
app.route('/api/movies', moviesRoutes);
app.route('/api/series', seriesRoutes);
app.route('/api/activity', activityRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/search', searchRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
```

## Vite Configuration

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

## CSS Setup (Tailwind v4)

Create `src/client/index.css`:

```css
@import "tailwindcss";

/* Design tokens */
:root {
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

## Verification

After setup, verify:
- [ ] `bun run dev` starts the frontend
- [ ] `bun run server` starts the API
- [ ] Database migrations run successfully
- [ ] API health check returns `{ status: 'ok' }`

