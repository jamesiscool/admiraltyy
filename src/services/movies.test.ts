import { eq, sql } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import fc from 'fast-check'
import { beforeEach, describe, expect, it } from 'vitest'
import type * as schemaTypes from '@/db/schema'
import * as schema from '@/db/schema'
import { setupTestDb, type TestDb } from '../../test/helpers'

// Define MovieDetails inline to avoid importing tmdb.ts which pulls in env
interface MovieDetails {
	tmdbId: number
	imdbId?: string
	title: string
	year: number
	posterUrl?: string
	backdropUrl?: string
	synopsis?: string
	runtimeMins?: number
	genres: string[]
	cinemaReleaseDate?: string
	digitalReleaseDate?: string
	contentRating?: string
	alternateTitles: string[]
}

// Pure function for movie insertion - copied from movies.ts to avoid import chain
async function insertMovieFromTmdb(database: BunSQLiteDatabase<typeof schema>, details: MovieDetails, resolution?: '480p' | '720p' | '1080p' | '2160p') {
	const now = new Date().toISOString()

	const result = await database
		.insert(schema.movies)
		.values({
			tmdbId: details.tmdbId,
			imdbId: details.imdbId,
			title: details.title,
			year: details.year,
			posterUrl: details.posterUrl,
			backdropUrl: details.backdropUrl,
			synopsis: details.synopsis,
			runtimeMins: details.runtimeMins,
			genres: JSON.stringify(details.genres),
			cinemaReleaseDate: details.cinemaReleaseDate,
			digitalReleaseDate: details.digitalReleaseDate,
			contentRating: details.contentRating,
			alternateTitles: JSON.stringify(details.alternateTitles),
			dateAdded: now,
			monitored: true,
			resolution: resolution ?? '1080p',
			lastInfoSync: now,
		})
		.returning()

	return result[0]
}

// Check if movie exists by TMDB ID
async function movieExistsByTmdbId(database: BunSQLiteDatabase<typeof schema>, tmdbId: number): Promise<boolean> {
	const existing = await database.select().from(schema.movies).where(eq(schema.movies.tmdbId, tmdbId))
	return existing.length > 0
}

// Arbitrary for movie details matching the MovieDetails interface
const arbMovieDetails = fc.record({
	tmdbId: fc.integer({ min: 1, max: 999999 }),
	imdbId: fc.option(fc.stringMatching(/^tt\d{7,8}$/), { nil: undefined }),
	title: fc.string({ minLength: 1, maxLength: 100 }),
	year: fc.integer({ min: 1900, max: 2030 }),
	posterUrl: fc.option(fc.webUrl(), { nil: undefined }),
	backdropUrl: fc.option(fc.webUrl(), { nil: undefined }),
	synopsis: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
	runtimeMins: fc.option(fc.integer({ min: 1, max: 600 }), { nil: undefined }),
	genres: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
	cinemaReleaseDate: fc.option(
		fc
			.tuple(fc.integer({ min: 1900, max: 2030 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
			.map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`),
		{ nil: undefined },
	),
	digitalReleaseDate: fc.option(
		fc
			.tuple(fc.integer({ min: 1900, max: 2030 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
			.map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`),
		{ nil: undefined },
	),
	contentRating: fc.option(fc.constantFrom('G', 'PG', 'PG-13', 'R', 'NC-17'), { nil: undefined }),
	alternateTitles: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 5 }),
})

describe('insertMovieFromTmdb', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('inserts movie with all fields', async () => {
		const details: MovieDetails = {
			tmdbId: 27205,
			imdbId: 'tt1375666',
			title: 'Inception',
			year: 2010,
			posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
			backdropUrl: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
			synopsis: 'A thief who steals corporate secrets through dream-sharing technology.',
			runtimeMins: 148,
			genres: ['Action', 'Science Fiction', 'Adventure'],
			cinemaReleaseDate: '2010-07-16',
			digitalReleaseDate: '2010-12-07',
			contentRating: 'PG-13',
			alternateTitles: ['Origin', 'Eredet'],
		}

		const movie = await insertMovieFromTmdb(db, details)

		expect(movie.tmdbId).toBe(27205)
		expect(movie.imdbId).toBe('tt1375666')
		expect(movie.title).toBe('Inception')
		expect(movie.year).toBe(2010)
		expect(movie.posterUrl).toBe('https://image.tmdb.org/t/p/w500/poster.jpg')
		expect(movie.backdropUrl).toBe('https://image.tmdb.org/t/p/w780/backdrop.jpg')
		expect(movie.synopsis).toBe('A thief who steals corporate secrets through dream-sharing technology.')
		expect(movie.runtimeMins).toBe(148)
		expect(movie.genres).toBe(JSON.stringify(['Action', 'Science Fiction', 'Adventure']))
		expect(movie.cinemaReleaseDate).toBe('2010-07-16')
		expect(movie.digitalReleaseDate).toBe('2010-12-07')
		expect(movie.contentRating).toBe('PG-13')
		expect(movie.alternateTitles).toBe(JSON.stringify(['Origin', 'Eredet']))
		expect(movie.monitored).toBe(true)
		expect(movie.resolution).toBe('1080p')
		expect(movie.dateAdded).toBeDefined()
		expect(movie.lastInfoSync).toBeDefined()
	})

	it('inserts movie with custom resolution', async () => {
		const details: MovieDetails = {
			tmdbId: 550,
			title: 'Fight Club',
			year: 1999,
			genres: ['Drama'],
			alternateTitles: [],
		}

		const movie = await insertMovieFromTmdb(db, details, '2160p')

		expect(movie.resolution).toBe('2160p')
	})

	it('inserts movie with minimal fields', async () => {
		const details: MovieDetails = {
			tmdbId: 1,
			title: 'Minimal Movie',
			year: 2020,
			genres: [],
			alternateTitles: [],
		}

		const movie = await insertMovieFromTmdb(db, details)

		expect(movie.tmdbId).toBe(1)
		expect(movie.title).toBe('Minimal Movie')
		expect(movie.year).toBe(2020)
		expect(movie.imdbId).toBeNull()
		expect(movie.posterUrl).toBeNull()
		expect(movie.synopsis).toBeNull()
	})

	it('movie is persisted in database', async () => {
		const details: MovieDetails = {
			tmdbId: 123,
			title: 'Test Movie',
			year: 2023,
			genres: [],
			alternateTitles: [],
		}

		await insertMovieFromTmdb(db, details)

		const movies = db.select().from(schema.movies).all()
		expect(movies).toHaveLength(1)
		expect(movies[0].title).toBe('Test Movie')
	})
})

describe('movieExistsByTmdbId', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('returns false for non-existent movie', async () => {
		const exists = await movieExistsByTmdbId(db, 99999)
		expect(exists).toBe(false)
	})

	it('returns true for existing movie', async () => {
		db.insert(schema.movies)
			.values({
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: new Date().toISOString(),
			})
			.run()

		const exists = await movieExistsByTmdbId(db, 27205)
		expect(exists).toBe(true)
	})
})

describe('duplicate movie detection', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('allows inserting multiple different movies', async () => {
		const movie1: MovieDetails = {
			tmdbId: 1,
			title: 'Movie 1',
			year: 2020,
			genres: [],
			alternateTitles: [],
		}
		const movie2: MovieDetails = {
			tmdbId: 2,
			title: 'Movie 2',
			year: 2021,
			genres: [],
			alternateTitles: [],
		}

		await insertMovieFromTmdb(db, movie1)
		await insertMovieFromTmdb(db, movie2)

		const movies = db.select().from(schema.movies).all()
		expect(movies).toHaveLength(2)
	})

	it('movieExistsByTmdbId detects duplicates correctly', async () => {
		const details: MovieDetails = {
			tmdbId: 123,
			title: 'Original Movie',
			year: 2020,
			genres: [],
			alternateTitles: [],
		}

		await insertMovieFromTmdb(db, details)

		expect(await movieExistsByTmdbId(db, 123)).toBe(true)
		expect(await movieExistsByTmdbId(db, 456)).toBe(false)
	})
})

describe('property-based tests', () => {
	it('insertMovieFromTmdb preserves all details fields', async () => {
		await fc.assert(
			fc.asyncProperty(arbMovieDetails, async (details) => {
				const db = await setupTestDb()
				const movie = await insertMovieFromTmdb(db, details)

				expect(movie.tmdbId).toBe(details.tmdbId)
				expect(movie.title).toBe(details.title)
				expect(movie.year).toBe(details.year)
				expect(movie.imdbId).toBe(details.imdbId ?? null)
				expect(movie.posterUrl).toBe(details.posterUrl ?? null)
				expect(movie.backdropUrl).toBe(details.backdropUrl ?? null)
				expect(movie.synopsis).toBe(details.synopsis ?? null)
				expect(movie.runtimeMins).toBe(details.runtimeMins ?? null)
				expect(movie.cinemaReleaseDate).toBe(details.cinemaReleaseDate ?? null)
				expect(movie.digitalReleaseDate).toBe(details.digitalReleaseDate ?? null)
				expect(movie.contentRating).toBe(details.contentRating ?? null)
			}),
		)
	})

	it('insertMovieFromTmdb always sets default resolution to 1080p', async () => {
		await fc.assert(
			fc.asyncProperty(arbMovieDetails, async (details) => {
				const db = await setupTestDb()
				const movie = await insertMovieFromTmdb(db, details)
				expect(movie.resolution).toBe('1080p')
			}),
		)
	})

	it('insertMovieFromTmdb respects custom resolution', async () => {
		const arbResolution = fc.constantFrom('480p', '720p', '1080p', '2160p') as fc.Arbitrary<'480p' | '720p' | '1080p' | '2160p'>

		await fc.assert(
			fc.asyncProperty(arbMovieDetails, arbResolution, async (details, resolution) => {
				const db = await setupTestDb()
				const movie = await insertMovieFromTmdb(db, details, resolution)
				expect(movie.resolution).toBe(resolution)
			}),
		)
	})

	it('insertMovieFromTmdb sets monitored to true', async () => {
		await fc.assert(
			fc.asyncProperty(arbMovieDetails, async (details) => {
				const db = await setupTestDb()
				const movie = await insertMovieFromTmdb(db, details)
				expect(movie.monitored).toBe(true)
			}),
		)
	})

	it('insertMovieFromTmdb serializes genres as JSON', async () => {
		await fc.assert(
			fc.asyncProperty(arbMovieDetails, async (details) => {
				const db = await setupTestDb()
				const movie = await insertMovieFromTmdb(db, details)
				expect(movie.genres).toBe(JSON.stringify(details.genres))
			}),
		)
	})

	it('insertMovieFromTmdb serializes alternateTitles as JSON', async () => {
		await fc.assert(
			fc.asyncProperty(arbMovieDetails, async (details) => {
				const db = await setupTestDb()
				const movie = await insertMovieFromTmdb(db, details)
				expect(movie.alternateTitles).toBe(JSON.stringify(details.alternateTitles))
			}),
		)
	})

	it('inserted movie can be retrieved from db', async () => {
		await fc.assert(
			fc.asyncProperty(arbMovieDetails, async (details) => {
				const db = await setupTestDb()
				await insertMovieFromTmdb(db, details)

				const movies = db.select().from(schema.movies).all()
				expect(movies).toHaveLength(1)
				expect(movies[0].tmdbId).toBe(details.tmdbId)
			}),
		)
	})
})

// Pure function for movie deletion - copied from movies.ts to avoid env import chain
async function deleteMovieCore(database: BunSQLiteDatabase<typeof schemaTypes>, movieId: number) {
	const movie = await database.select().from(schema.movies).where(eq(schema.movies.id, movieId))
	if (!movie.length) {
		throw new Error('Movie not found')
	}

	// Delete associated files from db
	await database.delete(schema.files).where(eq(schema.files.movieId, movieId))

	// Get releases for this movie to delete their downloads
	const movieReleases = await database.select().from(schema.releases).where(eq(schema.releases.movieId, movieId))
	for (const release of movieReleases) {
		await database.delete(schema.downloads).where(eq(schema.downloads.releaseId, release.id))
	}

	// Delete releases
	await database.delete(schema.releases).where(eq(schema.releases.movieId, movieId))

	// Delete movie
	await database.delete(schema.movies).where(eq(schema.movies.id, movieId))

	return { success: true }
}

describe('deleteMovieCore - cascade delete', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('deletes movie with no associated records', async () => {
		// Insert movie
		db.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: new Date().toISOString(),
			})
			.run()

		// Delete movie
		const result = await deleteMovieCore(db, 1)

		expect(result.success).toBe(true)
		expect(db.select().from(schema.movies).all()).toHaveLength(0)
	})

	it('deletes associated files when movie is deleted', async () => {
		// Insert movie
		db.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: new Date().toISOString(),
			})
			.run()

		// Insert associated files
		db.insert(schema.files)
			.values([
				{ id: 1, movieId: 1, path: '/movies/Inception/Inception.mkv', size: 8500000000, quality: '1080p', dateImported: new Date().toISOString() },
				{ id: 2, movieId: 1, path: '/movies/Inception/Inception.srt', size: 50000, quality: '1080p', dateImported: new Date().toISOString() },
			])
			.run()

		// Delete movie
		await deleteMovieCore(db, 1)

		// Verify files are deleted
		expect(db.select().from(schema.files).all()).toHaveLength(0)
	})

	it('deletes associated releases when movie is deleted', async () => {
		// Insert movie
		db.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: new Date().toISOString(),
			})
			.run()

		// Insert associated releases
		db.insert(schema.releases)
			.values([
				{
					id: 1,
					movieId: 1,
					guid: 'guid-1',
					title: 'Inception.2010.1080p',
					downloadUrl: 'https://example.com/nzb/1',
					size: 8500000000,
					publishDate: '2023-01-01',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: new Date().toISOString(),
				},
				{
					id: 2,
					movieId: 1,
					guid: 'guid-2',
					title: 'Inception.2010.720p',
					downloadUrl: 'https://example.com/nzb/2',
					size: 4500000000,
					publishDate: '2023-01-02',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: new Date().toISOString(),
				},
			])
			.run()

		// Delete movie
		await deleteMovieCore(db, 1)

		// Verify releases are deleted
		expect(db.select().from(schema.releases).all()).toHaveLength(0)
	})

	it('deletes associated downloads when movie is deleted', async () => {
		// Insert movie
		db.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: new Date().toISOString(),
			})
			.run()

		// Insert release
		db.insert(schema.releases)
			.values({
				id: 1,
				movieId: 1,
				guid: 'guid-1',
				title: 'Inception.2010.1080p',
				downloadUrl: 'https://example.com/nzb/1',
				size: 8500000000,
				publishDate: '2023-01-01',
				indexerId: 'idx-1',
				indexerName: 'TestIndexer',
				grabbedAt: new Date().toISOString(),
			})
			.run()

		// Insert download
		db.insert(schema.downloads)
			.values({
				id: 1,
				releaseId: 1,
				nzbId: 100,
				title: 'Inception.2010.1080p',
				status: 'queued',
				size: 8500000000,
				queuedAt: new Date().toISOString(),
			})
			.run()

		// Delete movie
		await deleteMovieCore(db, 1)

		// Verify downloads are deleted
		expect(db.select().from(schema.downloads).all()).toHaveLength(0)
	})

	it('cascade deletes all related records: files, releases, downloads', async () => {
		const now = new Date().toISOString()

		// Insert movie
		db.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: now,
			})
			.run()

		// Insert files
		db.insert(schema.files)
			.values([
				{ id: 1, movieId: 1, path: '/movies/Inception/Inception.mkv', size: 8500000000, quality: '1080p', dateImported: now },
				{ id: 2, movieId: 1, path: '/movies/Inception/Inception.srt', size: 50000, quality: '1080p', dateImported: now },
			])
			.run()

		// Insert releases
		db.insert(schema.releases)
			.values([
				{
					id: 1,
					movieId: 1,
					guid: 'guid-1',
					title: 'Inception.2010.1080p',
					downloadUrl: 'https://example.com/nzb/1',
					size: 8500000000,
					publishDate: '2023-01-01',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: now,
				},
				{
					id: 2,
					movieId: 1,
					guid: 'guid-2',
					title: 'Inception.2010.720p',
					downloadUrl: 'https://example.com/nzb/2',
					size: 4500000000,
					publishDate: '2023-01-02',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: now,
				},
			])
			.run()

		// Insert downloads for each release
		db.insert(schema.downloads)
			.values([
				{ id: 1, releaseId: 1, nzbId: 100, title: 'Inception.2010.1080p', status: 'completed', size: 8500000000, queuedAt: now },
				{ id: 2, releaseId: 2, nzbId: 101, title: 'Inception.2010.720p', status: 'failed', size: 4500000000, queuedAt: now },
			])
			.run()

		// Verify initial state
		expect(db.select().from(schema.movies).all()).toHaveLength(1)
		expect(db.select().from(schema.files).all()).toHaveLength(2)
		expect(db.select().from(schema.releases).all()).toHaveLength(2)
		expect(db.select().from(schema.downloads).all()).toHaveLength(2)

		// Delete movie
		await deleteMovieCore(db, 1)

		// Verify everything is deleted
		expect(db.select().from(schema.movies).all()).toHaveLength(0)
		expect(db.select().from(schema.files).all()).toHaveLength(0)
		expect(db.select().from(schema.releases).all()).toHaveLength(0)
		expect(db.select().from(schema.downloads).all()).toHaveLength(0)
	})

	it('only deletes records for the specified movie', async () => {
		const now = new Date().toISOString()

		// Insert two movies
		db.insert(schema.movies)
			.values([
				{ id: 1, tmdbId: 27205, title: 'Inception', year: 2010, dateAdded: now },
				{ id: 2, tmdbId: 550, title: 'Fight Club', year: 1999, dateAdded: now },
			])
			.run()

		// Insert files for both movies
		db.insert(schema.files)
			.values([
				{ id: 1, movieId: 1, path: '/movies/Inception/Inception.mkv', size: 8500000000, quality: '1080p', dateImported: now },
				{ id: 2, movieId: 2, path: '/movies/FightClub/FightClub.mkv', size: 7500000000, quality: '1080p', dateImported: now },
			])
			.run()

		// Insert releases for both movies
		db.insert(schema.releases)
			.values([
				{
					id: 1,
					movieId: 1,
					guid: 'guid-1',
					title: 'Inception.2010.1080p',
					downloadUrl: 'https://example.com/nzb/1',
					size: 8500000000,
					publishDate: '2023-01-01',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: now,
				},
				{
					id: 2,
					movieId: 2,
					guid: 'guid-2',
					title: 'FightClub.1999.1080p',
					downloadUrl: 'https://example.com/nzb/2',
					size: 7500000000,
					publishDate: '2023-01-02',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: now,
				},
			])
			.run()

		// Insert downloads for both releases
		db.insert(schema.downloads)
			.values([
				{ id: 1, releaseId: 1, nzbId: 100, title: 'Inception.2010.1080p', status: 'completed', size: 8500000000, queuedAt: now },
				{ id: 2, releaseId: 2, nzbId: 101, title: 'FightClub.1999.1080p', status: 'completed', size: 7500000000, queuedAt: now },
			])
			.run()

		// Delete only movie 1 (Inception)
		await deleteMovieCore(db, 1)

		// Verify movie 1 and its records are deleted
		expect(db.select().from(schema.movies).where(eq(schema.movies.id, 1)).all()).toHaveLength(0)

		// Verify movie 2 and its records remain
		expect(db.select().from(schema.movies).where(eq(schema.movies.id, 2)).all()).toHaveLength(1)
		expect(db.select().from(schema.files).where(eq(schema.files.movieId, 2)).all()).toHaveLength(1)
		expect(db.select().from(schema.releases).where(eq(schema.releases.movieId, 2)).all()).toHaveLength(1)
		expect(db.select().from(schema.downloads).where(eq(schema.downloads.releaseId, 2)).all()).toHaveLength(1)
	})

	it('throws error for non-existent movie', async () => {
		await expect(deleteMovieCore(db, 999)).rejects.toThrow('Movie not found')
	})

	it('handles movie with multiple download attempts per release', async () => {
		const now = new Date().toISOString()

		// Insert movie
		db.insert(schema.movies).values({ id: 1, tmdbId: 27205, title: 'Inception', year: 2010, dateAdded: now }).run()

		// Insert release
		db.insert(schema.releases)
			.values({
				id: 1,
				movieId: 1,
				guid: 'guid-1',
				title: 'Inception.2010.1080p',
				downloadUrl: 'https://example.com/nzb/1',
				size: 8500000000,
				publishDate: '2023-01-01',
				indexerId: 'idx-1',
				indexerName: 'TestIndexer',
				grabbedAt: now,
			})
			.run()

		// Insert multiple download attempts for the same release
		db.insert(schema.downloads)
			.values([
				{ id: 1, releaseId: 1, nzbId: 100, title: 'Inception.2010.1080p', status: 'failed', size: 8500000000, queuedAt: now },
				{ id: 2, releaseId: 1, nzbId: 101, title: 'Inception.2010.1080p', status: 'failed', size: 8500000000, queuedAt: now },
				{ id: 3, releaseId: 1, nzbId: 102, title: 'Inception.2010.1080p', status: 'completed', size: 8500000000, queuedAt: now },
			])
			.run()

		// Delete movie
		await deleteMovieCore(db, 1)

		// Verify all downloads are deleted
		expect(db.select().from(schema.downloads).all()).toHaveLength(0)
	})
})

// MoviePreview type matching the actual listMovies return type
interface MoviePreview {
	id: number
	title: string
	year: number
	posterUrl: string | null
	resolution: '480p' | '720p' | '1080p' | '2160p' | null
	monitored: boolean | null
	dateAdded: string
	cinemaReleaseDate: string | null
	sizeBytes: number
}

// Pure function matching listMovies query - testable with any db
async function listMoviesCore(database: TestDb): Promise<MoviePreview[]> {
	return database.all<MoviePreview>(sql`
		SELECT
			m.id,
			m.title,
			m.year,
			m.poster_url as posterUrl,
			m.resolution,
			m.monitored,
			m.date_added as dateAdded,
			m.cinema_release_date as cinemaReleaseDate,
			COALESCE(file_stats.size_bytes, 0) as sizeBytes
		FROM movies m
		LEFT JOIN (
			SELECT movie_id, SUM(size) as size_bytes
			FROM files
			WHERE is_deleted = 0 AND movie_id IS NOT NULL
			GROUP BY movie_id
		) file_stats ON file_stats.movie_id = m.id
	`)
}

describe('listMovies - file size aggregation', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('returns empty array when no movies exist', async () => {
		const movies = await listMoviesCore(db)
		expect(movies).toHaveLength(0)
	})

	it('returns movie with sizeBytes 0 when no files exist', async () => {
		const now = new Date().toISOString()
		db.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: now,
				resolution: '1080p',
			})
			.run()

		const movies = await listMoviesCore(db)

		expect(movies).toHaveLength(1)
		expect(movies[0].title).toBe('Inception')
		expect(movies[0].sizeBytes).toBe(0)
	})

	it('aggregates single file size for movie', async () => {
		const now = new Date().toISOString()

		db.insert(schema.movies).values({ id: 1, tmdbId: 27205, title: 'Inception', year: 2010, dateAdded: now }).run()

		db.insert(schema.files)
			.values({
				id: 1,
				movieId: 1,
				path: '/movies/Inception/Inception.mkv',
				size: 8500000000,
				quality: '1080p',
				dateImported: now,
				isDeleted: false,
			})
			.run()

		const movies = await listMoviesCore(db)

		expect(movies).toHaveLength(1)
		expect(movies[0].sizeBytes).toBe(8500000000)
	})

	it('aggregates multiple file sizes for same movie', async () => {
		const now = new Date().toISOString()

		db.insert(schema.movies).values({ id: 1, tmdbId: 27205, title: 'Inception', year: 2010, dateAdded: now }).run()

		db.insert(schema.files)
			.values([
				{ id: 1, movieId: 1, path: '/movies/Inception/Inception.mkv', size: 8500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, movieId: 1, path: '/movies/Inception/Inception.srt', size: 50000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 3, movieId: 1, path: '/movies/Inception/Inception.eng.srt', size: 48000, quality: '1080p', dateImported: now, isDeleted: false },
			])
			.run()

		const movies = await listMoviesCore(db)

		expect(movies).toHaveLength(1)
		expect(movies[0].sizeBytes).toBe(8500000000 + 50000 + 48000)
	})

	it('excludes deleted files from size calculation', async () => {
		const now = new Date().toISOString()

		db.insert(schema.movies).values({ id: 1, tmdbId: 27205, title: 'Inception', year: 2010, dateAdded: now }).run()

		db.insert(schema.files)
			.values([
				{ id: 1, movieId: 1, path: '/movies/Inception/Inception.mkv', size: 8500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, movieId: 1, path: '/movies/Inception/Inception.old.mkv', size: 4000000000, quality: '720p', dateImported: now, isDeleted: true },
			])
			.run()

		const movies = await listMoviesCore(db)

		expect(movies).toHaveLength(1)
		expect(movies[0].sizeBytes).toBe(8500000000) // Only non-deleted file
	})

	it('correctly aggregates sizes for multiple movies', async () => {
		const now = new Date().toISOString()

		db.insert(schema.movies)
			.values([
				{ id: 1, tmdbId: 27205, title: 'Inception', year: 2010, dateAdded: now },
				{ id: 2, tmdbId: 550, title: 'Fight Club', year: 1999, dateAdded: now },
				{ id: 3, tmdbId: 680, title: 'Pulp Fiction', year: 1994, dateAdded: now },
			])
			.run()

		db.insert(schema.files)
			.values([
				{ id: 1, movieId: 1, path: '/movies/Inception/Inception.mkv', size: 8500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, movieId: 2, path: '/movies/FightClub/FightClub.mkv', size: 7500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 3, movieId: 2, path: '/movies/FightClub/FightClub.srt', size: 45000, quality: '1080p', dateImported: now, isDeleted: false },
				// No files for Pulp Fiction
			])
			.run()

		const movies = await listMoviesCore(db)

		expect(movies).toHaveLength(3)

		const inception = movies.find((m) => m.title === 'Inception')
		const fightClub = movies.find((m) => m.title === 'Fight Club')
		const pulpFiction = movies.find((m) => m.title === 'Pulp Fiction')

		expect(inception?.sizeBytes).toBe(8500000000)
		expect(fightClub?.sizeBytes).toBe(7500000000 + 45000)
		expect(pulpFiction?.sizeBytes).toBe(0)
	})

	it('returns correct metadata alongside size', async () => {
		const now = new Date().toISOString()
		const releaseDate = '2010-07-16'

		db.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				posterUrl: 'https://image.tmdb.org/poster.jpg',
				resolution: '2160p',
				monitored: true,
				dateAdded: now,
				cinemaReleaseDate: releaseDate,
			})
			.run()

		db.insert(schema.files).values({ id: 1, movieId: 1, path: '/movies/Inception.mkv', size: 15000000000, quality: '2160p', dateImported: now, isDeleted: false }).run()

		const movies = await listMoviesCore(db)

		expect(movies).toHaveLength(1)
		expect(movies[0]).toMatchObject({
			id: 1,
			title: 'Inception',
			year: 2010,
			posterUrl: 'https://image.tmdb.org/poster.jpg',
			resolution: '2160p',
			// SQLite returns booleans as integers in raw SQL queries
			monitored: 1,
			cinemaReleaseDate: releaseDate,
			sizeBytes: 15000000000,
		})
	})
})

describe('listMovies - property-based tests', () => {
	const arbMovieData = fc.record({
		tmdbId: fc.integer({ min: 1, max: 999999 }),
		title: fc.string({ minLength: 1, maxLength: 100 }),
		year: fc.integer({ min: 1900, max: 2030 }),
	})

	const arbFileSize = fc.integer({ min: 0, max: 50000000000 }) // Up to 50GB

	it('sizeBytes is always non-negative', async () => {
		await fc.assert(
			fc.asyncProperty(arbMovieData, async (movieData) => {
				const db = await setupTestDb()
				const now = new Date().toISOString()

				db.insert(schema.movies)
					.values({ ...movieData, id: 1, dateAdded: now })
					.run()

				const movies = await listMoviesCore(db)

				expect(movies[0].sizeBytes).toBeGreaterThanOrEqual(0)
			}),
		)
	})

	it('sizeBytes equals sum of non-deleted file sizes', async () => {
		await fc.assert(
			fc.asyncProperty(arbMovieData, fc.array(arbFileSize, { minLength: 0, maxLength: 5 }), async (movieData, fileSizes) => {
				const db = await setupTestDb()
				const now = new Date().toISOString()

				db.insert(schema.movies)
					.values({ ...movieData, id: 1, dateAdded: now })
					.run()

				for (let i = 0; i < fileSizes.length; i++) {
					db.insert(schema.files)
						.values({
							id: i + 1,
							movieId: 1,
							path: `/movies/file${i}.mkv`,
							size: fileSizes[i],
							quality: '1080p',
							dateImported: now,
							isDeleted: false,
						})
						.run()
				}

				const movies = await listMoviesCore(db)
				const expectedSize = fileSizes.reduce((sum, s) => sum + s, 0)

				expect(movies[0].sizeBytes).toBe(expectedSize)
			}),
		)
	})

	it('deleted files are excluded from sizeBytes', async () => {
		await fc.assert(
			fc.asyncProperty(arbMovieData, arbFileSize, arbFileSize, async (movieData, activeSize, deletedSize) => {
				const db = await setupTestDb()
				const now = new Date().toISOString()

				db.insert(schema.movies)
					.values({ ...movieData, id: 1, dateAdded: now })
					.run()

				db.insert(schema.files)
					.values([
						{ id: 1, movieId: 1, path: '/movies/active.mkv', size: activeSize, quality: '1080p', dateImported: now, isDeleted: false },
						{ id: 2, movieId: 1, path: '/movies/deleted.mkv', size: deletedSize, quality: '1080p', dateImported: now, isDeleted: true },
					])
					.run()

				const movies = await listMoviesCore(db)

				expect(movies[0].sizeBytes).toBe(activeSize)
			}),
		)
	})
})
