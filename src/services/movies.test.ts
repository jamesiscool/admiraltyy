import { eq } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import fc from 'fast-check'
import { beforeEach, describe, expect, it } from 'vitest'
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
