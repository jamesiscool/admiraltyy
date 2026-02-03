import { fc, test } from '@fast-check/vitest'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as realSchema from '@/db/schema'
import { setupTestDb, type TestDb } from '../../test/helpers/db'

// --- Mock Setup ---

let testDb: TestDb

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
const mockFetchSeriesPreview = vi.fn()
const mockFetchSeriesWithEpisodes = vi.fn()
const mockCheckNeedsYearDisambiguation = vi.fn()
vi.mock('@/services/tmdb', () => ({
	fetchSeriesPreview: (...args: unknown[]) => mockFetchSeriesPreview(...args),
	fetchSeriesWithEpisodes: (...args: unknown[]) => mockFetchSeriesWithEpisodes(...args),
	checkNeedsYearDisambiguation: (...args: unknown[]) => mockCheckNeedsYearDisambiguation(...args),
}))

// Import after mocks
import { createSeries, deleteSeries, getSeriesById, getSeriesPreviewFromTmdb, listSeriesFromDb, updateEpisode, updateSeason, updateSeries } from './series.server'

// --- Test Setup ---

beforeEach(async () => {
	testDb = await setupTestDb()
	vi.clearAllMocks()
})

afterEach(() => {
	vi.clearAllMocks()
})

// --- Helper: insert series directly ---

function insertTestSeries(overrides?: Partial<realSchema.SeriesInsert>) {
	const now = new Date().toISOString()
	const [series] = testDb
		.insert(realSchema.series)
		.values({
			tmdbId: 1396,
			title: 'Breaking Bad',
			year: 2008,
			status: 'ended',
			dateAdded: now,
			monitored: true,
			resolution: '1080p',
			...overrides,
		})
		.returning()
		.all()
	return series
}

function insertTestSeason(seriesId: number, seasonNumber: number, monitored = true) {
	const [season] = testDb.insert(realSchema.seasons).values({ seriesId, seasonNumber, monitored }).returning().all()
	return season
}

function insertTestEpisode(seasonId: number, episodeNumber: number, title: string, monitored = true) {
	const [episode] = testDb.insert(realSchema.episodes).values({ seasonId, episodeNumber, title, monitored }).returning().all()
	return episode
}

function insertTestFile(opts: { seriesId?: number; episodeId?: number; path: string; size: number }) {
	testDb
		.insert(realSchema.files)
		.values({
			...opts,
			quality: '1080p',
			dateImported: new Date().toISOString(),
			isDeleted: false,
		})
		.run()
}

// --- listSeriesFromDb Tests ---

describe('listSeriesFromDb', () => {
	it('returns empty array when no series', async () => {
		const result = await listSeriesFromDb()
		expect(result).toEqual([])
	})

	it('returns series with preview fields', async () => {
		insertTestSeries({ title: 'Breaking Bad', year: 2008 })

		const result = await listSeriesFromDb()

		expect(result).toHaveLength(1)
		expect(result[0]).toMatchObject({
			title: 'Breaking Bad',
			year: 2008,
			status: 'ended',
			resolution: '1080p',
		})
	})

	it('computes sizeBytes from files', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const ep = insertTestEpisode(season.id, 1, 'Pilot')

		insertTestFile({ seriesId: series.id, episodeId: ep.id, path: '/media/s01e01.mkv', size: 1000 })
		insertTestFile({ seriesId: series.id, episodeId: ep.id, path: '/media/s01e01.srt', size: 50 })

		const result = await listSeriesFromDb()

		expect(result[0].sizeBytes).toBe(1050)
	})

	it('computes episode counts', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const ep1 = insertTestEpisode(season.id, 1, 'Pilot')
		insertTestEpisode(season.id, 2, 'Episode 2')

		// Only ep1 has a file
		insertTestFile({ seriesId: series.id, episodeId: ep1.id, path: '/media/s01e01.mkv', size: 1000 })

		const result = await listSeriesFromDb()

		expect(result[0].episodeCount).toBe(2)
		expect(result[0].missingEpisodeCount).toBe(1)
	})

	it('excludes deleted files from size calculation', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const ep = insertTestEpisode(season.id, 1, 'Pilot')

		// Active file
		insertTestFile({ seriesId: series.id, episodeId: ep.id, path: '/media/active.mkv', size: 1000 })

		// Deleted file
		testDb
			.insert(realSchema.files)
			.values({
				seriesId: series.id,
				episodeId: ep.id,
				path: '/media/deleted.mkv',
				size: 500,
				quality: '720p',
				dateImported: new Date().toISOString(),
				isDeleted: true,
			})
			.run()

		const result = await listSeriesFromDb()

		expect(result[0].sizeBytes).toBe(1000)
	})
})

// --- getSeriesById Tests ---

describe('getSeriesById', () => {
	it('throws for invalid ID format', async () => {
		await expect(getSeriesById('abc')).rejects.toThrow('Invalid series ID')
	})

	it('throws for non-existent series', async () => {
		await expect(getSeriesById('999')).rejects.toThrow('Series not found')
	})

	it('returns series with nested seasons and episodes', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const ep = insertTestEpisode(season.id, 1, 'Pilot')

		insertTestFile({ seriesId: series.id, episodeId: ep.id, path: '/media/s01e01.mkv', size: 2000 })

		const result = await getSeriesById(String(series.id))

		expect(result.id).toBe(series.id)
		expect(result.title).toBe('Breaking Bad')
		expect(result.seasons).toHaveLength(1)
		expect(result.seasons[0].episodes).toHaveLength(1)
		expect(result.seasons[0].episodes[0].files).toHaveLength(1)
		expect(result.sizeBytes).toBe(2000)
	})

	it('computes episode and missing counts', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const ep1 = insertTestEpisode(season.id, 1, 'Pilot')
		insertTestEpisode(season.id, 2, 'Episode 2')

		insertTestFile({ seriesId: series.id, episodeId: ep1.id, path: '/media/s01e01.mkv', size: 1000 })

		const result = await getSeriesById(String(series.id))

		expect(result.episodeCount).toBe(2)
		expect(result.missingEpisodeCount).toBe(1)
	})

	test.prop([fc.integer({ min: 1, max: 999999 })])('parses valid numeric IDs', async (id) => {
		// Just verify it doesn't throw "Invalid series ID" - it will throw "Series not found"
		await expect(getSeriesById(String(id))).rejects.toThrow('Series not found')
	})
})

// --- getSeriesPreviewFromTmdb Tests ---

describe('getSeriesPreviewFromTmdb', () => {
	it('throws for invalid TMDB ID', async () => {
		await expect(getSeriesPreviewFromTmdb('abc')).rejects.toThrow('Invalid TMDB ID')
	})

	it('fetches preview from TMDB', async () => {
		const preview = { tmdbId: 1396, title: 'Breaking Bad', year: 2008 }
		mockFetchSeriesPreview.mockResolvedValue(preview)

		const result = await getSeriesPreviewFromTmdb('1396')

		expect(mockFetchSeriesPreview).toHaveBeenCalledWith(1396)
		expect(result).toEqual(preview)
	})
})

// --- createSeries Tests ---

describe('createSeries', () => {
	const mockSeriesDetails = {
		tmdbId: 1396,
		title: 'Breaking Bad',
		year: 2008,
		status: 'ended' as const,
		network: 'AMC',
		overview: 'A high school chemistry teacher...',
		posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
		backdropUrl: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
		genres: ['Drama', 'Crime'],
		runtimeMins: 47,
		contentRating: 'TV-MA',
		alternateTitles: ['BB'],
		seasons: [
			{ seasonNumber: 1, episodeCount: 7 },
			{ seasonNumber: 2, episodeCount: 13 },
		],
		seasonsWithEpisodes: [
			{
				seasonNumber: 1,
				episodes: [
					{ episodeNumber: 1, title: 'Pilot', airDate: '2008-01-20', runtimeMins: 58 },
					{ episodeNumber: 2, title: "Cat's in the Bag...", airDate: '2008-01-27', runtimeMins: 48 },
				],
			},
		],
	}

	beforeEach(() => {
		mockFetchSeriesWithEpisodes.mockResolvedValue(mockSeriesDetails)
		mockCheckNeedsYearDisambiguation.mockResolvedValue(false)
	})

	it('creates series from TMDB data', async () => {
		const result = await createSeries({ tmdbId: 1396, monitoredSeasons: [1] })

		expect(result.tmdbId).toBe(1396)
		expect(result.title).toBe('Breaking Bad')
		expect(result.year).toBe(2008)
		expect(result.monitored).toBe(true)
		expect(result.resolution).toBe('1080p')
	})

	it('respects resolution parameter', async () => {
		const result = await createSeries({ tmdbId: 1396, resolution: '720p', monitoredSeasons: [1] })

		expect(result.resolution).toBe('720p')
	})

	it('throws if series already exists', async () => {
		insertTestSeries({ tmdbId: 1396 })

		await expect(createSeries({ tmdbId: 1396, monitoredSeasons: [1] })).rejects.toThrow('Series already exists')
	})

	it('creates seasons with monitored flag', async () => {
		await createSeries({ tmdbId: 1396, monitoredSeasons: [1] })

		const seasons = testDb.select().from(realSchema.seasons).all()

		expect(seasons).toHaveLength(2)
		const s1 = seasons.find((s) => s.seasonNumber === 1)
		const s2 = seasons.find((s) => s.seasonNumber === 2)
		expect(s1?.monitored).toBe(true)
		expect(s2?.monitored).toBe(false)
	})

	it('creates episodes for monitored seasons', async () => {
		await createSeries({ tmdbId: 1396, monitoredSeasons: [1] })

		const episodes = testDb.select().from(realSchema.episodes).all()

		expect(episodes).toHaveLength(2)
		expect(episodes[0].title).toBe('Pilot')
		expect(episodes[1].title).toBe("Cat's in the Bag...")
	})

	it('sets useYearInFolder when disambiguation needed', async () => {
		mockCheckNeedsYearDisambiguation.mockResolvedValue(true)

		const result = await createSeries({ tmdbId: 1396, monitoredSeasons: [] })

		expect(result.useYearInFolder).toBe(true)
	})
})

// --- updateSeries Tests ---

describe('updateSeries', () => {
	it('throws for invalid ID', async () => {
		await expect(updateSeries('abc', false)).rejects.toThrow('Invalid series ID')
	})

	it('throws for non-existent series', async () => {
		await expect(updateSeries('999', false)).rejects.toThrow('Series not found')
	})

	it('updates monitored status', async () => {
		const series = insertTestSeries({ monitored: true })

		const result = await updateSeries(String(series.id), false)

		expect(result.monitored).toBe(false)
	})
})

// --- updateSeason Tests ---

describe('updateSeason', () => {
	it('throws for invalid ID', async () => {
		await expect(updateSeason('abc', false)).rejects.toThrow('Invalid season ID')
	})

	it('throws for non-existent season', async () => {
		await expect(updateSeason('999', false)).rejects.toThrow('Season not found')
	})

	it('updates season monitored status', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1, true)

		const result = await updateSeason(String(season.id), false)

		expect(result.monitored).toBe(false)
	})

	it('cascades monitored to all episodes', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1, true)
		insertTestEpisode(season.id, 1, 'Pilot', true)
		insertTestEpisode(season.id, 2, 'Episode 2', true)

		await updateSeason(String(season.id), false)

		const episodes = testDb.select().from(realSchema.episodes).where(eq(realSchema.episodes.seasonId, season.id)).all()

		expect(episodes.every((e) => e.monitored === false)).toBe(true)
	})
})

// --- updateEpisode Tests ---

describe('updateEpisode', () => {
	it('throws for invalid ID', async () => {
		await expect(updateEpisode('abc', false)).rejects.toThrow('Invalid episode ID')
	})

	it('throws for non-existent episode', async () => {
		await expect(updateEpisode('999', false)).rejects.toThrow('Episode not found')
	})

	it('updates episode monitored status', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const episode = insertTestEpisode(season.id, 1, 'Pilot', true)

		const result = await updateEpisode(String(episode.id), false)

		expect(result.monitored).toBe(false)
	})
})

// --- deleteSeries Tests ---

describe('deleteSeries', () => {
	it('throws for invalid ID', async () => {
		await expect(deleteSeries('abc')).rejects.toThrow('Invalid series ID')
	})

	it('throws for non-existent series', async () => {
		await expect(deleteSeries('999')).rejects.toThrow('Series not found')
	})

	it('deletes series and all related records', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const episode = insertTestEpisode(season.id, 1, 'Pilot')

		insertTestFile({ seriesId: series.id, episodeId: episode.id, path: '/media/s01e01.mkv', size: 1000 })

		// Add release and download
		const [release] = testDb
			.insert(realSchema.releases)
			.values({
				episodeId: episode.id,
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

		testDb
			.insert(realSchema.downloads)
			.values({
				releaseId: release.id,
				title: 'Test',
				status: 'completed',
				queuedAt: new Date().toISOString(),
			})
			.run()

		const result = await deleteSeries(String(series.id))

		expect(result).toEqual({ success: true })

		// Verify all records deleted
		const seriesRecords = testDb.select().from(realSchema.series).where(eq(realSchema.series.id, series.id)).all()
		const seasonRecords = testDb.select().from(realSchema.seasons).where(eq(realSchema.seasons.seriesId, series.id)).all()
		const episodeRecords = testDb.select().from(realSchema.episodes).where(eq(realSchema.episodes.seasonId, season.id)).all()
		const fileRecords = testDb.select().from(realSchema.files).where(eq(realSchema.files.seriesId, series.id)).all()
		const releaseRecords = testDb.select().from(realSchema.releases).where(eq(realSchema.releases.episodeId, episode.id)).all()

		expect(seriesRecords).toHaveLength(0)
		expect(seasonRecords).toHaveLength(0)
		expect(episodeRecords).toHaveLength(0)
		expect(fileRecords).toHaveLength(0)
		expect(releaseRecords).toHaveLength(0)
	})

	it('handles series with no seasons', async () => {
		const series = insertTestSeries()

		const result = await deleteSeries(String(series.id))

		expect(result).toEqual({ success: true })
		const seriesRecords = testDb.select().from(realSchema.series).where(eq(realSchema.series.id, series.id)).all()
		expect(seriesRecords).toHaveLength(0)
	})
})
