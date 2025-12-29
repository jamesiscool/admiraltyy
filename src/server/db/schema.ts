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

