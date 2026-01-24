import { Database } from 'bun:sqlite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from '@/db/schema'

export type TestDb = ReturnType<typeof drizzle<typeof schema>>

// Create in-memory SQLite database with schema tables
export function setupTestDb(): TestDb {
	const sqlite = new Database(':memory:')
	const db = drizzle(sqlite, { schema })

	// Create tables directly (no migrations, just DDL)
	db.run(sql`
		CREATE TABLE IF NOT EXISTS movies (
			id INTEGER PRIMARY KEY,
			tmdb_id INTEGER NOT NULL,
			imdb_id TEXT,
			title TEXT NOT NULL,
			year INTEGER NOT NULL,
			poster_url TEXT,
			backdrop_url TEXT,
			synopsis TEXT,
			runtime_mins INTEGER,
			genres TEXT,
			cinema_release_date TEXT,
			digital_release_date TEXT,
			content_rating TEXT,
			date_added TEXT NOT NULL,
			monitored INTEGER DEFAULT 1,
			resolution TEXT DEFAULT '1080p',
			last_search_time TEXT,
			last_info_sync TEXT,
			rt_id TEXT,
			rt_vanity TEXT,
			alternate_titles TEXT
		)
	`)

	db.run(sql`
		CREATE TABLE IF NOT EXISTS series (
			id INTEGER PRIMARY KEY,
			tvdb_id INTEGER,
			tmdb_id INTEGER NOT NULL,
			imdb_id TEXT,
			title TEXT NOT NULL,
			year INTEGER NOT NULL,
			status TEXT NOT NULL,
			network TEXT,
			overview TEXT,
			poster_url TEXT,
			backdrop_url TEXT,
			genres TEXT,
			runtime_mins INTEGER,
			content_rating TEXT,
			monitored INTEGER DEFAULT 1,
			resolution TEXT DEFAULT '1080p',
			date_added TEXT NOT NULL,
			next_airing TEXT,
			last_info_sync TEXT,
			rt_id TEXT,
			rt_vanity TEXT,
			alternate_titles TEXT,
			use_year_in_folder INTEGER DEFAULT 0
		)
	`)

	db.run(sql`
		CREATE TABLE IF NOT EXISTS seasons (
			id INTEGER PRIMARY KEY,
			series_id INTEGER REFERENCES series(id),
			season_number INTEGER NOT NULL,
			monitored INTEGER DEFAULT 1
		)
	`)

	db.run(sql`
		CREATE TABLE IF NOT EXISTS episodes (
			id INTEGER PRIMARY KEY,
			season_id INTEGER REFERENCES seasons(id),
			episode_number INTEGER NOT NULL,
			title TEXT NOT NULL,
			air_date TEXT,
			monitored INTEGER DEFAULT 1,
			runtime_mins INTEGER,
			last_search_time TEXT
		)
	`)

	db.run(sql`
		CREATE TABLE IF NOT EXISTS files (
			id INTEGER PRIMARY KEY,
			movie_id INTEGER REFERENCES movies(id),
			series_id INTEGER REFERENCES series(id),
			episode_id INTEGER REFERENCES episodes(id),
			path TEXT NOT NULL,
			size INTEGER NOT NULL,
			quality TEXT NOT NULL,
			source TEXT,
			codec TEXT,
			date_imported TEXT NOT NULL,
			is_deleted INTEGER DEFAULT 0
		)
	`)

	db.run(sql`
		CREATE TABLE IF NOT EXISTS releases (
			id INTEGER PRIMARY KEY,
			movie_id INTEGER REFERENCES movies(id),
			episode_id INTEGER REFERENCES episodes(id),
			guid TEXT NOT NULL,
			title TEXT NOT NULL,
			download_url TEXT NOT NULL,
			info_url TEXT,
			size INTEGER NOT NULL,
			publish_date TEXT NOT NULL,
			indexer_id TEXT NOT NULL,
			indexer_name TEXT NOT NULL,
			nzb_path TEXT,
			grabbed_at TEXT NOT NULL
		)
	`)

	db.run(sql`
		CREATE TABLE IF NOT EXISTS downloads (
			id INTEGER PRIMARY KEY,
			release_id INTEGER REFERENCES releases(id),
			nzb_id INTEGER,
			title TEXT NOT NULL,
			status TEXT NOT NULL,
			error_message TEXT,
			progress REAL DEFAULT 0,
			speed TEXT,
			eta TEXT,
			size INTEGER,
			par_status TEXT,
			unpack_status TEXT,
			final_dir TEXT,
			downloaded_size_mb INTEGER,
			download_time_sec INTEGER,
			queued_at TEXT NOT NULL,
			completed_at TEXT
		)
	`)

	db.run(sql`
		CREATE TABLE IF NOT EXISTS indexers (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			api_key TEXT NOT NULL,
			enabled INTEGER DEFAULT 1,
			supports_search INTEGER DEFAULT 1,
			supports_tv_search INTEGER DEFAULT 1,
			supports_movie_search INTEGER DEFAULT 1
		)
	`)

	db.run(sql`
		CREATE TABLE IF NOT EXISTS usenet_servers (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			host TEXT NOT NULL,
			port INTEGER NOT NULL,
			username TEXT,
			password TEXT,
			ssl INTEGER DEFAULT 1,
			priority INTEGER DEFAULT 0,
			connections INTEGER DEFAULT 10,
			enabled INTEGER DEFAULT 1
		)
	`)

	return db
}

// Seed test data helper
export async function seedTestData(db: TestDb): Promise<void> {
	// Sample movie
	db.insert(schema.movies)
		.values({
			tmdbId: 27205,
			title: 'Inception',
			year: 2010,
			dateAdded: new Date().toISOString(),
			monitored: true,
			resolution: '1080p',
		})
		.run()

	// Sample series
	db.insert(schema.series)
		.values({
			tmdbId: 1396,
			title: 'Breaking Bad',
			year: 2008,
			status: 'ended',
			dateAdded: new Date().toISOString(),
			monitored: true,
			resolution: '1080p',
		})
		.run()
}
