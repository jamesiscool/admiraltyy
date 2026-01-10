import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod'

// Enums
export const resolutions = ['480p', '720p', '1080p', '2160p'] as const
export type Resolution = (typeof resolutions)[number]

export const downloadStatuses = ['downloading', 'paused', 'queued', 'unpacking', 'verifying', 'completed', 'failed'] as const
export type DownloadStatus = (typeof downloadStatuses)[number]

export const seriesStatuses = ['continuing', 'ended'] as const
export type SeriesStatus = (typeof seriesStatuses)[number]

// Movies
export const movies = sqliteTable('movies', {
	id: integer('id').primaryKey(),
	tmdbId: integer('tmdb_id').notNull(),
	imdbId: text('imdb_id'),
	title: text('title').notNull(),
	year: integer('year').notNull(),
	posterUrl: text('poster_url'),
	backdropUrl: text('backdrop_url'),
	synopsis: text('synopsis'),
	runtimeMins: integer('runtime_mins'),
	genres: text('genres'), // JSON array
	cast: text('cast'), // JSON array
	cinemaReleaseDate: text('cinema_release_date'),
	digitalReleaseDate: text('digital_release_date'),
	contentRating: text('content_rating'),
	dateAdded: text('date_added').notNull(),
	monitored: integer('monitored', { mode: 'boolean' }).default(true),
	resolution: text('resolution', { enum: resolutions }).default('1080p'),
	lastSearchTime: text('last_search_time'),
	lastInfoSync: text('last_info_sync'),
	rtId: text('rt_id'),
	rtVanity: text('rt_vanity'),
	alternateTitles: text('alternate_titles'), // JSON array
})

export const selectMovieSchema = createSelectSchema(movies)
export const insertMovieSchema = createInsertSchema(movies)
export type Movie = z.infer<typeof selectMovieSchema>
export type MovieInsert = z.infer<typeof insertMovieSchema>

// Series
export const series = sqliteTable('series', {
	id: integer('id').primaryKey(),
	tvdbId: integer('tvdb_id'),
	tmdbId: integer('tmdb_id').notNull(),
	imdbId: text('imdb_id'),
	title: text('title').notNull(),
	year: integer('year').notNull(),
	status: text('status', { enum: seriesStatuses }).notNull(),
	network: text('network'),
	overview: text('overview'),
	posterUrl: text('poster_url'),
	backdropUrl: text('backdrop_url'),
	genres: text('genres'), // JSON array
	runtimeMins: integer('runtime_mins'),
	contentRating: text('content_rating'),
	monitored: integer('monitored', { mode: 'boolean' }).default(true),
	resolution: text('resolution', { enum: resolutions }).default('1080p'),
	dateAdded: text('date_added').notNull(),
	nextAiring: text('next_airing'),
	lastInfoSync: text('last_info_sync'),
	rtId: text('rt_id'),
	rtVanity: text('rt_vanity'),
	alternateTitles: text('alternate_titles'), // JSON array
})

export const selectSeriesSchema = createSelectSchema(series)
export const insertSeriesSchema = createInsertSchema(series)
export type Series = z.infer<typeof selectSeriesSchema>
export type SeriesInsert = z.infer<typeof insertSeriesSchema>

// Seasons
export const seasons = sqliteTable('seasons', {
	id: integer('id').primaryKey(),
	seriesId: integer('series_id').references(() => series.id),
	seasonNumber: integer('season_number').notNull(),
	monitored: integer('monitored', { mode: 'boolean' }).default(true),
})

export const selectSeasonSchema = createSelectSchema(seasons)
export const insertSeasonSchema = createInsertSchema(seasons)
export type Season = z.infer<typeof selectSeasonSchema>
export type SeasonInsert = z.infer<typeof insertSeasonSchema>

// Episodes
export const episodes = sqliteTable('episodes', {
	id: integer('id').primaryKey(),
	seasonId: integer('season_id').references(() => seasons.id),
	episodeNumber: integer('episode_number').notNull(),
	title: text('title').notNull(),
	airDate: text('air_date'),
	monitored: integer('monitored', { mode: 'boolean' }).default(true),
	runtimeMins: integer('runtime_mins'),
	lastSearchTime: text('last_search_time'),
})

export const selectEpisodeSchema = createSelectSchema(episodes)
export const insertEpisodeSchema = createInsertSchema(episodes)
export type Episode = z.infer<typeof selectEpisodeSchema>
export type EpisodeInsert = z.infer<typeof insertEpisodeSchema>

// Files
export const files = sqliteTable('files', {
	id: integer('id').primaryKey(),
	movieId: integer('movie_id').references(() => movies.id),
	seriesId: integer('series_id').references(() => series.id),
	episodeId: integer('episode_id').references(() => episodes.id),
	path: text('path').notNull(),
	size: integer('size').notNull(),
	quality: text('quality').notNull(),
	source: text('source'),
	codec: text('codec'),
	dateImported: text('date_imported').notNull(),
	isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
})

export const selectFileSchema = createSelectSchema(files)
export const insertFileSchema = createInsertSchema(files)
export type File = z.infer<typeof selectFileSchema>
export type FileInsert = z.infer<typeof insertFileSchema>

// Downloads
export const downloads = sqliteTable('downloads', {
	id: integer('id').primaryKey(),
	movieId: integer('movie_id').references(() => movies.id),
	episodeId: integer('episode_id').references(() => episodes.id),
	title: text('title').notNull(),
	progress: real('progress').default(0),
	speed: text('speed'),
	eta: text('eta'),
	size: text('size'),
	status: text('status', { enum: downloadStatuses }).notNull(),
	quality: text('quality'),
	dateDownloaded: text('date_downloaded').notNull(),
	errorMessage: text('error_message'),
})

export const selectDownloadSchema = createSelectSchema(downloads)
export const insertDownloadSchema = createInsertSchema(downloads)
export type Download = z.infer<typeof selectDownloadSchema>
export type DownloadInsert = z.infer<typeof insertDownloadSchema>

// Releases (grabbed indexer results)
export const releases = sqliteTable('releases', {
	id: integer('id').primaryKey(),
	movieId: integer('movie_id').references(() => movies.id),
	episodeId: integer('episode_id').references(() => episodes.id),
	downloadId: integer('download_id').references(() => downloads.id),

	// From IndexerRelease
	guid: text('guid').notNull(),
	title: text('title').notNull(),
	downloadUrl: text('download_url').notNull(),
	infoUrl: text('info_url'),
	size: integer('size').notNull(),
	publishDate: text('publish_date').notNull(),
	indexerId: text('indexer_id').notNull(),
	indexerName: text('indexer_name').notNull(),

	// Grab metadata
	nzbPath: text('nzb_path'),
	grabbedAt: text('grabbed_at').notNull(),
})

export const selectReleaseSchema = createSelectSchema(releases)
export const insertReleaseSchema = createInsertSchema(releases)
export type Release = z.infer<typeof selectReleaseSchema>
export type ReleaseInsert = z.infer<typeof insertReleaseSchema>

// Indexers
export const indexers = sqliteTable('indexers', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	url: text('url').notNull(),
	apiKey: text('api_key').notNull(),
	enabled: integer('enabled', { mode: 'boolean' }).default(true),
	supportsSearch: integer('supports_search', { mode: 'boolean' }).default(true),
	supportsTvSearch: integer('supports_tv_search', { mode: 'boolean' }).default(true),
	supportsMovieSearch: integer('supports_movie_search', { mode: 'boolean' }).default(true),
})

export const selectIndexerSchema = createSelectSchema(indexers)
export const insertIndexerSchema = createInsertSchema(indexers)
export type Indexer = z.infer<typeof selectIndexerSchema>
export type IndexerInsert = z.infer<typeof insertIndexerSchema>

// Usenet Servers
export const usenetServers = sqliteTable('usenet_servers', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	host: text('host').notNull(),
	port: integer('port').notNull(),
	username: text('username'),
	password: text('password'),
	ssl: integer('ssl', { mode: 'boolean' }).default(true),
	priority: integer('priority').default(0),
	connections: integer('connections').default(10),
	enabled: integer('enabled', { mode: 'boolean' }).default(true),
})

export const selectUsenetServerSchema = createSelectSchema(usenetServers)
export const insertUsenetServerSchema = createInsertSchema(usenetServers)
export type UsenetServer = z.infer<typeof selectUsenetServerSchema>
export type UsenetServerInsert = z.infer<typeof insertUsenetServerSchema>
