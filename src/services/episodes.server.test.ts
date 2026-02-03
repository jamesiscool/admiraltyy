import { fc, test } from '@fast-check/vitest'
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

// Mock indexers
const mockSearchEpisodeReleases = vi.fn()
vi.mock('@/services/indexers.server', () => ({
	searchEpisodeReleases: (...args: unknown[]) => mockSearchEpisodeReleases(...args),
}))

// Mock downloads
const mockGrabRelease = vi.fn()
vi.mock('@/services/downloads.server', () => ({
	grabRelease: (...args: unknown[]) => mockGrabRelease(...args),
}))

// Import after mocks
import { findEpisodeReleases, grabEpisodeRelease } from './episodes.server'

// --- Test Setup ---

beforeEach(async () => {
	testDb = await setupTestDb()
	vi.clearAllMocks()
})

afterEach(() => {
	vi.clearAllMocks()
})

// --- Helper: insert test data ---

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
			tvdbId: 81189,
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

// --- findEpisodeReleases Tests ---

describe('findEpisodeReleases', () => {
	it('throws for invalid episode ID format', async () => {
		await expect(findEpisodeReleases('abc')).rejects.toThrow('Invalid episode ID')
	})

	it('throws for non-existent episode', async () => {
		await expect(findEpisodeReleases('999')).rejects.toThrow('Episode not found')
	})

	it('throws when episode has no season', async () => {
		// Insert episode directly without season reference
		const [episode] = testDb
			.insert(realSchema.episodes)
			.values({
				seasonId: null,
				episodeNumber: 1,
				title: 'Orphan Episode',
				monitored: true,
			})
			.returning()
			.all()

		await expect(findEpisodeReleases(String(episode.id))).rejects.toThrow('Episode has no season')
	})

	it('throws when season has no series', async () => {
		// Insert season directly without series reference
		const [season] = testDb
			.insert(realSchema.seasons)
			.values({
				seriesId: null,
				seasonNumber: 1,
				monitored: true,
			})
			.returning()
			.all()

		const episode = insertTestEpisode(season.id, 1, 'Orphan Episode')

		await expect(findEpisodeReleases(String(episode.id))).rejects.toThrow('Season has no series')
	})

	it('searches releases with episode metadata', async () => {
		const series = insertTestSeries({ tmdbId: 1396, tvdbId: 81189, title: 'Breaking Bad' })
		const season = insertTestSeason(series.id, 1)
		const episode = insertTestEpisode(season.id, 1, 'Pilot')

		mockSearchEpisodeReleases.mockResolvedValue([{ guid: 'release1', title: 'Breaking.Bad.S01E01.720p' }])

		const releases = await findEpisodeReleases(String(episode.id))

		expect(mockSearchEpisodeReleases).toHaveBeenCalledWith({
			tmdbId: 1396,
			tvdbId: 81189,
			season: 1,
			episode: 1,
			title: 'Breaking Bad',
		})
		expect(releases).toEqual([{ guid: 'release1', title: 'Breaking.Bad.S01E01.720p' }])
	})

	it('handles missing tvdbId', async () => {
		const series = insertTestSeries({ tmdbId: 1396, tvdbId: null, title: 'Breaking Bad' })
		const season = insertTestSeason(series.id, 2)
		const episode = insertTestEpisode(season.id, 5, 'Episode 5')

		mockSearchEpisodeReleases.mockResolvedValue([])

		await findEpisodeReleases(String(episode.id))

		expect(mockSearchEpisodeReleases).toHaveBeenCalledWith({
			tmdbId: 1396,
			tvdbId: undefined,
			season: 2,
			episode: 5,
			title: 'Breaking Bad',
		})
	})

	it('returns empty array when no releases found', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const episode = insertTestEpisode(season.id, 1, 'Pilot')

		mockSearchEpisodeReleases.mockResolvedValue([])

		const releases = await findEpisodeReleases(String(episode.id))

		expect(releases).toEqual([])
	})

	test.prop([fc.integer({ min: 1, max: 999999 })])('parses valid numeric episode IDs', async (id) => {
		// Verify it doesn't throw "Invalid episode ID" - will throw "Episode not found" instead
		await expect(findEpisodeReleases(String(id))).rejects.toThrow('Episode not found')
	})
})

// --- grabEpisodeRelease Tests ---

describe('grabEpisodeRelease', () => {
	it('throws for invalid episode ID format', async () => {
		await expect(
			grabEpisodeRelease({
				episodeId: 'abc',
				guid: 'guid1',
				title: 'Test',
				downloadUrl: 'http://example.com/nzb',
				size: 1000,
				publishDate: '2024-01-01',
				indexerId: 'idx1',
				indexerName: 'Test Indexer',
			}),
		).rejects.toThrow('Invalid episode ID')
	})

	it('calls grabRelease with episode context', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const episode = insertTestEpisode(season.id, 1, 'Pilot')

		mockGrabRelease.mockResolvedValue({ release: {}, download: {} })

		await grabEpisodeRelease({
			episodeId: String(episode.id),
			guid: 'guid1',
			title: 'Breaking.Bad.S01E01.1080p.BluRay',
			downloadUrl: 'http://example.com/nzb',
			infoUrl: 'http://example.com/info',
			size: 1500000000,
			publishDate: '2024-01-01',
			indexerId: 'nzbgeek',
			indexerName: 'NZBgeek',
		})

		expect(mockGrabRelease).toHaveBeenCalledWith(
			{
				guid: 'guid1',
				title: 'Breaking.Bad.S01E01.1080p.BluRay',
				downloadUrl: 'http://example.com/nzb',
				infoUrl: 'http://example.com/info',
				size: 1500000000,
				publishDate: '2024-01-01',
				indexerId: 'nzbgeek',
				indexerName: 'NZBgeek',
			},
			{ episodeId: episode.id, category: 'tv' },
		)
	})

	it('passes through optional infoUrl', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const episode = insertTestEpisode(season.id, 1, 'Pilot')

		mockGrabRelease.mockResolvedValue({ release: {}, download: {} })

		await grabEpisodeRelease({
			episodeId: String(episode.id),
			guid: 'guid2',
			title: 'Breaking.Bad.S01E01.720p',
			downloadUrl: 'http://example.com/nzb',
			size: 1000000000,
			publishDate: '2024-02-01',
			indexerId: 'idx1',
			indexerName: 'Test',
		})

		expect(mockGrabRelease).toHaveBeenCalledWith(
			expect.objectContaining({
				infoUrl: undefined,
			}),
			expect.any(Object),
		)
	})

	it('returns result from grabRelease', async () => {
		const series = insertTestSeries()
		const season = insertTestSeason(series.id, 1)
		const episode = insertTestEpisode(season.id, 1, 'Pilot')

		const mockResult = {
			release: { id: 1, title: 'Test' },
			download: { id: 1, status: 'queued' },
		}
		mockGrabRelease.mockResolvedValue(mockResult)

		const result = await grabEpisodeRelease({
			episodeId: String(episode.id),
			guid: 'guid1',
			title: 'Test',
			downloadUrl: 'http://example.com/nzb',
			size: 1000,
			publishDate: '2024-01-01',
			indexerId: 'idx1',
			indexerName: 'Test',
		})

		expect(result).toEqual(mockResult)
	})

	test.prop([fc.integer({ min: 1, max: 999999 }), fc.string({ minLength: 1, maxLength: 50 }), fc.integer({ min: 1 })])('preserves episodeId, title, size in call', async (episodeId, title, size) => {
		mockGrabRelease.mockResolvedValue({ release: {}, download: {} })

		await grabEpisodeRelease({
			episodeId: String(episodeId),
			guid: 'guid',
			title,
			downloadUrl: 'http://example.com/nzb',
			size,
			publishDate: '2024-01-01',
			indexerId: 'idx',
			indexerName: 'Test',
		})

		// Verify numeric ID was parsed and passed correctly
		expect(mockGrabRelease).toHaveBeenCalledWith(expect.objectContaining({ title, size }), expect.objectContaining({ episodeId, category: 'tv' }))
	})
})
