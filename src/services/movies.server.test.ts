import { fc, test } from '@fast-check/vitest'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as realSchema from '@/db/schema'
import { setupTestDb, type TestDb } from '../../test/helpers/db'

// --- Mock Setup ---

// Module-level testDb that mocks reference
let testDb: TestDb

// Mock @/db to use test database with real schema
vi.mock('@/db', async () => {
	const schema = await vi.importActual<typeof realSchema>('@/db/schema')
	return {
		get db() {
			return testDb
		},
		schema,
	}
})

// Mock TMDB
const mockFetchMovieDetails = vi.fn()
vi.mock('@/services/tmdb', () => ({
	fetchMovieDetails: (...args: unknown[]) => mockFetchMovieDetails(...args),
}))

// Mock indexers
const mockSearchMovieReleases = vi.fn()
vi.mock('@/services/indexers.server', () => ({
	searchMovieReleases: (...args: unknown[]) => mockSearchMovieReleases(...args),
}))

// Mock downloads
const mockGrabRelease = vi.fn()
vi.mock('@/services/downloads.server', () => ({
	grabRelease: (...args: unknown[]) => mockGrabRelease(...args),
}))

// Import after mocks are set up
import type { MovieDetails } from '@/services/tmdb'
import { createMovieFromTmdb, deleteMovie, findMovieReleases, getMovieById, grabMovieRelease, insertMovieFromTmdb, listMoviesFromDb, movieExistsByTmdbId, updateMovie } from './movies.server'

// --- Test Setup ---

beforeEach(async () => {
	testDb = await setupTestDb()
	vi.clearAllMocks()
})

afterEach(() => {
	vi.clearAllMocks()
})

// --- Helper: sample movie details ---

function sampleMovieDetails(overrides?: Partial<MovieDetails>): MovieDetails {
	return {
		tmdbId: 550,
		imdbId: 'tt0137523',
		title: 'Fight Club',
		year: 1999,
		posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
		backdropUrl: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
		synopsis: 'An insomniac office worker...',
		runtimeMins: 139,
		genres: ['Drama', 'Thriller'],
		cinemaReleaseDate: '1999-10-15',
		digitalReleaseDate: '2000-06-06',
		contentRating: 'R',
		alternateTitles: ['El Club de la Pelea', 'Clube da Luta'],
		...overrides,
	}
}

// --- insertMovieFromTmdb Tests ---

describe('insertMovieFromTmdb', () => {
	it('inserts movie with all fields', async () => {
		const details = sampleMovieDetails()

		const movie = await insertMovieFromTmdb(details, '1080p')

		expect(movie.id).toBeTypeOf('number')
		expect(movie.tmdbId).toBe(550)
		expect(movie.title).toBe('Fight Club')
		expect(movie.year).toBe(1999)
		expect(movie.resolution).toBe('1080p')
		expect(movie.monitored).toBe(true)
		expect(movie.genres).toBe('["Drama","Thriller"]')
		expect(movie.alternateTitles).toBe('["El Club de la Pelea","Clube da Luta"]')
	})

	it('defaults resolution to 1080p', async () => {
		const details = sampleMovieDetails()

		const movie = await insertMovieFromTmdb(details)

		expect(movie.resolution).toBe('1080p')
	})

	test.prop([fc.integer({ min: 1, max: 999999 }), fc.string({ minLength: 1, maxLength: 100 }), fc.integer({ min: 1900, max: 2030 })])('preserves tmdbId, title, year', async (tmdbId, title, year) => {
		const details = sampleMovieDetails({ tmdbId, title, year })

		const movie = await insertMovieFromTmdb(details)

		expect(movie.tmdbId).toBe(tmdbId)
		expect(movie.title).toBe(title)
		expect(movie.year).toBe(year)
	})
})

// --- movieExistsByTmdbId Tests ---

describe('movieExistsByTmdbId', () => {
	it('returns false for non-existent movie', async () => {
		const exists = await movieExistsByTmdbId(999999)
		expect(exists).toBe(false)
	})

	it('returns true for existing movie', async () => {
		const details = sampleMovieDetails({ tmdbId: 12345 })
		await insertMovieFromTmdb(details)

		const exists = await movieExistsByTmdbId(12345)
		expect(exists).toBe(true)
	})
})

// --- createMovieFromTmdb Tests ---

describe('createMovieFromTmdb', () => {
	it('creates movie by fetching from TMDB', async () => {
		const details = sampleMovieDetails({ tmdbId: 550 })
		mockFetchMovieDetails.mockResolvedValue(details)

		const movie = await createMovieFromTmdb(550, '720p')

		expect(mockFetchMovieDetails).toHaveBeenCalledWith(550)
		expect(movie.tmdbId).toBe(550)
		expect(movie.resolution).toBe('720p')
	})

	it('throws if movie already exists', async () => {
		const details = sampleMovieDetails({ tmdbId: 550 })
		await insertMovieFromTmdb(details)

		await expect(createMovieFromTmdb(550)).rejects.toThrow('Movie already exists')
	})
})

// --- listMoviesFromDb Tests ---

describe('listMoviesFromDb', () => {
	it('returns empty array when no movies', async () => {
		const movies = await listMoviesFromDb()
		expect(movies).toEqual([])
	})

	it('returns movies with preview fields', async () => {
		const details = sampleMovieDetails()
		await insertMovieFromTmdb(details)

		const movies = await listMoviesFromDb()

		expect(movies).toHaveLength(1)
		expect(movies[0]).toMatchObject({
			title: 'Fight Club',
			year: 1999,
			resolution: '1080p',
		})
		// Raw SQL returns SQLite integer for boolean
		expect(movies[0].monitored).toBeTruthy()
	})

	it('aggregates file sizes', async () => {
		const details = sampleMovieDetails()
		const movie = await insertMovieFromTmdb(details)

		// Add files
		testDb
			.insert(realSchema.files)
			.values([
				{ movieId: movie.id, path: '/media/file1.mkv', size: 1000, quality: '1080p', dateImported: new Date().toISOString() },
				{ movieId: movie.id, path: '/media/file2.mkv', size: 500, quality: '1080p', dateImported: new Date().toISOString() },
			])
			.run()

		const movies = await listMoviesFromDb()

		expect(movies[0].sizeBytes).toBe(1500)
	})
})

// --- getMovieById Tests ---

describe('getMovieById', () => {
	it('throws for invalid ID format', async () => {
		await expect(getMovieById('abc')).rejects.toThrow('Invalid movie ID')
	})

	it('throws for non-existent movie', async () => {
		await expect(getMovieById('999')).rejects.toThrow('Movie not found')
	})

	it('returns movie with files', async () => {
		const details = sampleMovieDetails()
		const inserted = await insertMovieFromTmdb(details)

		// Add file
		testDb.insert(realSchema.files).values({ movieId: inserted.id, path: '/media/movie.mkv', size: 2000, quality: '1080p', dateImported: new Date().toISOString() }).run()

		const movie = await getMovieById(String(inserted.id))

		expect(movie.id).toBe(inserted.id)
		expect(movie.title).toBe('Fight Club')
		expect(movie.files).toHaveLength(1)
		expect(movie.files[0].size).toBe(2000)
		expect(movie.sizeBytes).toBe(2000)
	})

	it('excludes deleted files', async () => {
		const details = sampleMovieDetails()
		const inserted = await insertMovieFromTmdb(details)

		// Add active and deleted files
		testDb
			.insert(realSchema.files)
			.values([
				{ movieId: inserted.id, path: '/media/active.mkv', size: 1000, quality: '1080p', dateImported: new Date().toISOString(), isDeleted: false },
				{ movieId: inserted.id, path: '/media/deleted.mkv', size: 500, quality: '1080p', dateImported: new Date().toISOString(), isDeleted: true },
			])
			.run()

		const movie = await getMovieById(String(inserted.id))

		expect(movie.files).toHaveLength(1)
		expect(movie.files[0].path).toBe('/media/active.mkv')
		expect(movie.sizeBytes).toBe(1000)
	})
})

// --- updateMovie Tests ---

describe('updateMovie', () => {
	it('throws for invalid ID', async () => {
		await expect(updateMovie('abc', {})).rejects.toThrow('Invalid movie ID')
	})

	it('throws for non-existent movie', async () => {
		await expect(updateMovie('999', {})).rejects.toThrow('Movie not found')
	})

	it('updates monitored status', async () => {
		const details = sampleMovieDetails()
		const inserted = await insertMovieFromTmdb(details)

		const updated = await updateMovie(String(inserted.id), { monitored: false })

		expect(updated.monitored).toBe(false)
	})

	it('returns unchanged movie when no updates', async () => {
		const details = sampleMovieDetails()
		const inserted = await insertMovieFromTmdb(details)

		const unchanged = await updateMovie(String(inserted.id), {})

		expect(unchanged.monitored).toBe(true)
	})
})

// --- findMovieReleases Tests ---

describe('findMovieReleases', () => {
	it('throws for invalid ID', async () => {
		await expect(findMovieReleases('abc')).rejects.toThrow('Invalid movie ID')
	})

	it('throws for non-existent movie', async () => {
		await expect(findMovieReleases('999')).rejects.toThrow('Movie not found')
	})

	it('searches releases with movie metadata', async () => {
		const details = sampleMovieDetails({ tmdbId: 550, imdbId: 'tt0137523' })
		const inserted = await insertMovieFromTmdb(details)
		mockSearchMovieReleases.mockResolvedValue([{ guid: 'release1', title: 'Fight Club 1080p' }])

		const releases = await findMovieReleases(String(inserted.id))

		expect(mockSearchMovieReleases).toHaveBeenCalledWith({
			tmdbId: 550,
			imdbId: 'tt0137523',
			title: 'Fight Club',
			year: 1999,
		})
		expect(releases).toEqual([{ guid: 'release1', title: 'Fight Club 1080p' }])
	})
})

// --- grabMovieRelease Tests ---

describe('grabMovieRelease', () => {
	it('throws for invalid movie ID', async () => {
		await expect(
			grabMovieRelease({
				movieId: 'abc',
				guid: 'guid1',
				title: 'Test',
				downloadUrl: 'http://example.com/nzb',
				size: 1000,
				publishDate: '2024-01-01',
				indexerId: 'idx1',
				indexerName: 'Test Indexer',
			}),
		).rejects.toThrow('Invalid movie ID')
	})

	it('throws for non-existent movie', async () => {
		await expect(
			grabMovieRelease({
				movieId: '999',
				guid: 'guid1',
				title: 'Test',
				downloadUrl: 'http://example.com/nzb',
				size: 1000,
				publishDate: '2024-01-01',
				indexerId: 'idx1',
				indexerName: 'Test Indexer',
			}),
		).rejects.toThrow('Movie not found')
	})

	it('calls grabRelease with movie context', async () => {
		const details = sampleMovieDetails()
		const inserted = await insertMovieFromTmdb(details)
		mockGrabRelease.mockResolvedValue({ release: {}, download: {} })

		await grabMovieRelease({
			movieId: String(inserted.id),
			guid: 'guid1',
			title: 'Fight.Club.1999.1080p.BluRay',
			downloadUrl: 'http://example.com/nzb',
			infoUrl: 'http://example.com/info',
			size: 15000000000,
			publishDate: '2024-01-01',
			indexerId: 'nzbgeek',
			indexerName: 'NZBgeek',
		})

		expect(mockGrabRelease).toHaveBeenCalledWith(
			{
				guid: 'guid1',
				title: 'Fight.Club.1999.1080p.BluRay',
				downloadUrl: 'http://example.com/nzb',
				infoUrl: 'http://example.com/info',
				size: 15000000000,
				publishDate: '2024-01-01',
				indexerId: 'nzbgeek',
				indexerName: 'NZBgeek',
			},
			{ movieId: inserted.id, category: 'movies' },
		)
	})
})

// --- deleteMovie Tests ---

describe('deleteMovie', () => {
	it('throws for invalid ID', async () => {
		await expect(deleteMovie('abc')).rejects.toThrow('Invalid movie ID')
	})

	it('throws for non-existent movie', async () => {
		await expect(deleteMovie('999')).rejects.toThrow('Movie not found')
	})

	it('deletes movie and related records', async () => {
		const details = sampleMovieDetails()
		const inserted = await insertMovieFromTmdb(details)

		// Add file
		testDb.insert(realSchema.files).values({ movieId: inserted.id, path: '/media/movie.mkv', size: 2000, quality: '1080p', dateImported: new Date().toISOString() }).run()

		// Add release and download
		const [release] = testDb
			.insert(realSchema.releases)
			.values({
				movieId: inserted.id,
				guid: 'guid1',
				title: 'Test Release',
				downloadUrl: 'http://example.com/nzb',
				size: 1000,
				publishDate: '2024-01-01',
				indexerId: 'idx1',
				indexerName: 'Test',
				grabbedAt: new Date().toISOString(),
			})
			.returning()
			.all()

		testDb.insert(realSchema.downloads).values({ releaseId: release.id, title: 'Test', status: 'completed', queuedAt: new Date().toISOString() }).run()

		const result = await deleteMovie(String(inserted.id))

		expect(result).toEqual({ success: true })

		// Verify all related records deleted
		const movies = testDb.select().from(realSchema.movies).where(eq(realSchema.movies.id, inserted.id)).all()
		const files = testDb.select().from(realSchema.files).where(eq(realSchema.files.movieId, inserted.id)).all()
		const releases = testDb.select().from(realSchema.releases).where(eq(realSchema.releases.movieId, inserted.id)).all()

		expect(movies).toHaveLength(0)
		expect(files).toHaveLength(0)
		expect(releases).toHaveLength(0)
	})
})
