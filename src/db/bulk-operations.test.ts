import { eq, inArray } from 'drizzle-orm'
import fc from 'fast-check'
import { beforeEach, describe, expect, it } from 'vitest'
import * as schema from '@/db/schema'
import { setupTestDb, type TestDb } from '../../test/helpers'

// Helper to create test data
const createTestSeries = (db: TestDb, id: number, title = `Series ${id}`) => {
	db.insert(schema.series)
		.values({
			id,
			tmdbId: 2000 + id,
			title,
			year: 2020,
			status: 'continuing',
			dateAdded: new Date().toISOString(),
		})
		.run()
	return id
}

const createTestSeason = (db: TestDb, id: number, seriesId: number, seasonNumber = 1) => {
	db.insert(schema.seasons)
		.values({
			id,
			seriesId,
			seasonNumber,
			monitored: true,
		})
		.run()
	return id
}

const createTestEpisode = (db: TestDb, id: number, seasonId: number, episodeNumber = 1) => {
	db.insert(schema.episodes)
		.values({
			id,
			seasonId,
			episodeNumber,
			title: `Episode ${id}`,
			monitored: true,
		})
		.run()
	return id
}

const createTestFile = (db: TestDb, id: number, opts: { seriesId?: number; episodeId?: number } = {}) => {
	db.insert(schema.files)
		.values({
			id,
			seriesId: opts.seriesId ?? null,
			episodeId: opts.episodeId ?? null,
			path: `/media/file${id}.mkv`,
			size: 1000000000,
			quality: '1080p',
			dateImported: new Date().toISOString(),
		})
		.run()
	return id
}

const createTestRelease = (db: TestDb, id: number, episodeId: number) => {
	db.insert(schema.releases)
		.values({
			id,
			episodeId,
			guid: `guid-${id}`,
			title: `Release ${id}`,
			downloadUrl: `https://example.com/nzb/${id}`,
			size: 1000000000,
			publishDate: '2023-01-01',
			indexerId: 'idx-1',
			indexerName: 'TestIndexer',
			grabbedAt: new Date().toISOString(),
		})
		.run()
	return id
}

const createTestDownload = (db: TestDb, id: number, releaseId: number) => {
	db.insert(schema.downloads)
		.values({
			id,
			releaseId,
			nzbId: 100 + id,
			title: `Download ${id}`,
			status: 'queued',
			queuedAt: new Date().toISOString(),
		})
		.run()
	return id
}

describe('Bulk Operations - Delete Multiple Seasons', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('deletes multiple seasons using inArray', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1, 1)
		createTestSeason(db, 2, 1, 2)
		createTestSeason(db, 3, 1, 3)
		createTestSeason(db, 4, 1, 4)

		// Verify 4 seasons exist
		const beforeSeasons = db.select().from(schema.seasons).all()
		expect(beforeSeasons).toHaveLength(4)

		// Delete seasons 1, 2, 3 in bulk
		db.delete(schema.seasons)
			.where(inArray(schema.seasons.id, [1, 2, 3]))
			.run()

		// Verify only season 4 remains
		const afterSeasons = db.select().from(schema.seasons).all()
		expect(afterSeasons).toHaveLength(1)
		expect(afterSeasons[0].id).toBe(4)
	})

	it('bulk season deletion cascades to episodes', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1, 1)
		createTestSeason(db, 2, 1, 2)
		// Season 1 episodes
		createTestEpisode(db, 1, 1, 1)
		createTestEpisode(db, 2, 1, 2)
		// Season 2 episodes
		createTestEpisode(db, 3, 2, 1)
		createTestEpisode(db, 4, 2, 2)

		// Get episode IDs for seasons to delete
		const seasonIds = [1]
		const episodesData = db.select().from(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds)).all()
		const episodeIds = episodesData.map((e) => e.id)

		// Delete episodes first
		db.delete(schema.episodes).where(inArray(schema.episodes.id, episodeIds)).run()

		// Then delete seasons
		db.delete(schema.seasons).where(inArray(schema.seasons.id, seasonIds)).run()

		// Verify season 2 and its episodes remain
		const remainingSeasons = db.select().from(schema.seasons).all()
		expect(remainingSeasons).toHaveLength(1)
		expect(remainingSeasons[0].seasonNumber).toBe(2)

		const remainingEpisodes = db.select().from(schema.episodes).all()
		expect(remainingEpisodes).toHaveLength(2)
		expect(remainingEpisodes.every((e) => e.seasonId === 2)).toBe(true)
	})

	it('bulk deletion removes files for all affected episodes', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1, 1)
		createTestSeason(db, 2, 1, 2)
		createTestEpisode(db, 1, 1, 1)
		createTestEpisode(db, 2, 1, 2)
		createTestEpisode(db, 3, 2, 1)
		// Files for episodes
		createTestFile(db, 1, { seriesId: 1, episodeId: 1 })
		createTestFile(db, 2, { seriesId: 1, episodeId: 2 })
		createTestFile(db, 3, { seriesId: 1, episodeId: 3 })

		// Delete files for season 1 episodes
		const seasonIds = [1]
		const episodesData = db.select().from(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds)).all()
		const episodeIds = episodesData.map((e) => e.id)

		db.delete(schema.files).where(inArray(schema.files.episodeId, episodeIds)).run()

		// Verify only season 2 episode file remains
		const remainingFiles = db.select().from(schema.files).all()
		expect(remainingFiles).toHaveLength(1)
		expect(remainingFiles[0].episodeId).toBe(3)
	})

	it('bulk deletion handles releases and downloads chain', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1, 1)
		createTestSeason(db, 2, 1, 2)
		createTestEpisode(db, 1, 1, 1)
		createTestEpisode(db, 2, 1, 2)
		createTestEpisode(db, 3, 2, 1)
		// Releases and downloads
		createTestRelease(db, 1, 1)
		createTestDownload(db, 1, 1)
		createTestRelease(db, 2, 2)
		createTestDownload(db, 2, 2)
		createTestRelease(db, 3, 3)
		createTestDownload(db, 3, 3)

		// Get episodes for season 1
		const seasonIds = [1]
		const episodesData = db.select().from(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds)).all()
		const episodeIds = episodesData.map((e) => e.id)

		// Get releases for these episodes
		const releasesData = db.select().from(schema.releases).where(inArray(schema.releases.episodeId, episodeIds)).all()
		const releaseIds = releasesData.map((r) => r.id)

		// Delete in correct order: downloads -> releases -> episodes -> seasons
		db.delete(schema.downloads).where(inArray(schema.downloads.releaseId, releaseIds)).run()
		db.delete(schema.releases).where(inArray(schema.releases.id, releaseIds)).run()
		db.delete(schema.episodes).where(inArray(schema.episodes.id, episodeIds)).run()
		db.delete(schema.seasons).where(inArray(schema.seasons.id, seasonIds)).run()

		// Verify season 2 data remains intact
		expect(db.select().from(schema.seasons).all()).toHaveLength(1)
		expect(db.select().from(schema.episodes).all()).toHaveLength(1)
		expect(db.select().from(schema.releases).all()).toHaveLength(1)
		expect(db.select().from(schema.downloads).all()).toHaveLength(1)
	})

	it('empty array in inArray deletes nothing', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1, 1)
		createTestSeason(db, 2, 1, 2)

		// Attempting to delete with empty array should not throw
		// Note: drizzle-orm requires non-empty array for inArray, so we guard against this
		const seasonIdsToDelete: number[] = []
		if (seasonIdsToDelete.length > 0) {
			db.delete(schema.seasons).where(inArray(schema.seasons.id, seasonIdsToDelete)).run()
		}

		// All seasons remain
		const seasons = db.select().from(schema.seasons).all()
		expect(seasons).toHaveLength(2)
	})
})

describe('Bulk Operations - Batch Update', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('updates monitoring state for multiple seasons', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1, 1)
		createTestSeason(db, 2, 1, 2)
		createTestSeason(db, 3, 1, 3)

		// Bulk update monitoring for seasons 1 and 2
		db.update(schema.seasons)
			.set({ monitored: false })
			.where(inArray(schema.seasons.id, [1, 2]))
			.run()

		const seasons = db.select().from(schema.seasons).orderBy(schema.seasons.id).all()
		expect(seasons[0].monitored).toBe(false)
		expect(seasons[1].monitored).toBe(false)
		expect(seasons[2].monitored).toBe(true)
	})

	it('propagates monitoring state from season to episodes', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1, 1)
		createTestEpisode(db, 1, 1, 1)
		createTestEpisode(db, 2, 1, 2)
		createTestEpisode(db, 3, 1, 3)

		// Update season monitoring
		db.update(schema.seasons).set({ monitored: false }).where(eq(schema.seasons.id, 1)).run()

		// Also update all episodes in season
		db.update(schema.episodes).set({ monitored: false }).where(eq(schema.episodes.seasonId, 1)).run()

		const episodes = db.select().from(schema.episodes).all()
		expect(episodes.every((e) => e.monitored === false)).toBe(true)
	})

	it('bulk updates multiple episodes across seasons', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1, 1)
		createTestSeason(db, 2, 1, 2)
		createTestEpisode(db, 1, 1, 1)
		createTestEpisode(db, 2, 1, 2)
		createTestEpisode(db, 3, 2, 1)
		createTestEpisode(db, 4, 2, 2)

		// Disable monitoring for specific episodes
		db.update(schema.episodes)
			.set({ monitored: false })
			.where(inArray(schema.episodes.id, [1, 4]))
			.run()

		const episodes = db.select().from(schema.episodes).orderBy(schema.episodes.id).all()
		expect(episodes[0].monitored).toBe(false) // ep 1
		expect(episodes[1].monitored).toBe(true) // ep 2
		expect(episodes[2].monitored).toBe(true) // ep 3
		expect(episodes[3].monitored).toBe(false) // ep 4
	})
})

describe('Bulk Operations - Property Based', () => {
	const arbPositiveInt = fc.integer({ min: 1, max: 20 })

	it('bulk delete count matches input array length', async () => {
		await fc.assert(
			fc.asyncProperty(arbPositiveInt, async (seasonCount) => {
				const db = await setupTestDb()
				const count = Math.min(seasonCount, 10)

				createTestSeries(db, 1)

				// Create seasons
				for (let i = 1; i <= count; i++) {
					createTestSeason(db, i, 1, i)
				}

				// Delete half the seasons
				const toDelete = Math.floor(count / 2)
				const idsToDelete = Array.from({ length: toDelete }, (_, i) => i + 1)

				if (idsToDelete.length > 0) {
					db.delete(schema.seasons).where(inArray(schema.seasons.id, idsToDelete)).run()
				}

				const remaining = db.select().from(schema.seasons).all()
				expect(remaining.length).toBe(count - toDelete)
			}),
			{ numRuns: 20 },
		)
	})

	it('bulk operations preserve unrelated series data', async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 5 }), async (series1Seasons, series2Seasons) => {
				const db = await setupTestDb()

				createTestSeries(db, 1, 'Series 1')
				createTestSeries(db, 2, 'Series 2')

				// Create seasons for both series
				let seasonId = 1
				for (let i = 1; i <= series1Seasons; i++) {
					createTestSeason(db, seasonId++, 1, i)
				}
				for (let i = 1; i <= series2Seasons; i++) {
					createTestSeason(db, seasonId++, 2, i)
				}

				// Delete all seasons from series 1
				const series1SeasonIds = Array.from({ length: series1Seasons }, (_, i) => i + 1)
				if (series1SeasonIds.length > 0) {
					db.delete(schema.seasons).where(inArray(schema.seasons.id, series1SeasonIds)).run()
				}

				// Series 2 seasons should be intact
				const remainingSeasons = db.select().from(schema.seasons).all()
				expect(remainingSeasons.length).toBe(series2Seasons)
				expect(remainingSeasons.every((s) => s.seriesId === 2)).toBe(true)
			}),
			{ numRuns: 20 },
		)
	})
})

describe('Bulk Operations - Complex Hierarchies', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('full cascade delete for multiple seasons at once', async () => {
		createTestSeries(db, 1)
		// Create 3 seasons with 2 episodes each, each episode has file, release, download
		for (let s = 1; s <= 3; s++) {
			createTestSeason(db, s, 1, s)
			for (let e = 1; e <= 2; e++) {
				const epId = (s - 1) * 2 + e
				createTestEpisode(db, epId, s, e)
				createTestFile(db, epId, { seriesId: 1, episodeId: epId })
				createTestRelease(db, epId, epId)
				createTestDownload(db, epId, epId)
			}
		}

		// Verify initial counts
		expect(db.select().from(schema.seasons).all()).toHaveLength(3)
		expect(db.select().from(schema.episodes).all()).toHaveLength(6)
		expect(db.select().from(schema.files).all()).toHaveLength(6)
		expect(db.select().from(schema.releases).all()).toHaveLength(6)
		expect(db.select().from(schema.downloads).all()).toHaveLength(6)

		// Delete seasons 1 and 2 with full cascade
		const seasonIds = [1, 2]
		const episodesData = db.select().from(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds)).all()
		const episodeIds = episodesData.map((e) => e.id)

		const releasesData = db.select().from(schema.releases).where(inArray(schema.releases.episodeId, episodeIds)).all()
		const releaseIds = releasesData.map((r) => r.id)

		// Cascade delete
		db.delete(schema.downloads).where(inArray(schema.downloads.releaseId, releaseIds)).run()
		db.delete(schema.files).where(inArray(schema.files.episodeId, episodeIds)).run()
		db.delete(schema.releases).where(inArray(schema.releases.id, releaseIds)).run()
		db.delete(schema.episodes).where(inArray(schema.episodes.id, episodeIds)).run()
		db.delete(schema.seasons).where(inArray(schema.seasons.id, seasonIds)).run()

		// Verify only season 3 remains
		expect(db.select().from(schema.seasons).all()).toHaveLength(1)
		expect(db.select().from(schema.episodes).all()).toHaveLength(2)
		expect(db.select().from(schema.files).all()).toHaveLength(2)
		expect(db.select().from(schema.releases).all()).toHaveLength(2)
		expect(db.select().from(schema.downloads).all()).toHaveLength(2)

		// Verify remaining data belongs to season 3
		const remainingEpisodes = db.select().from(schema.episodes).all()
		expect(remainingEpisodes.every((e) => e.seasonId === 3)).toBe(true)
	})

	it('handles deleting seasons with mixed content states', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1, 1)
		createTestSeason(db, 2, 1, 2)
		createTestSeason(db, 3, 1, 3)

		// Season 1: has episodes but no files
		createTestEpisode(db, 1, 1, 1)
		createTestEpisode(db, 2, 1, 2)

		// Season 2: has episodes with files and downloads
		createTestEpisode(db, 3, 2, 1)
		createTestFile(db, 1, { seriesId: 1, episodeId: 3 })
		createTestRelease(db, 1, 3)
		createTestDownload(db, 1, 1)

		// Season 3: empty - no episodes

		// Delete all 3 seasons
		const seasonIds = [1, 2, 3]
		const episodesData = db.select().from(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds)).all()
		const episodeIds = episodesData.map((e) => e.id)

		if (episodeIds.length > 0) {
			const releasesData = db.select().from(schema.releases).where(inArray(schema.releases.episodeId, episodeIds)).all()
			const releaseIds = releasesData.map((r) => r.id)

			if (releaseIds.length > 0) {
				db.delete(schema.downloads).where(inArray(schema.downloads.releaseId, releaseIds)).run()
				db.delete(schema.releases).where(inArray(schema.releases.id, releaseIds)).run()
			}

			db.delete(schema.files).where(inArray(schema.files.episodeId, episodeIds)).run()
			db.delete(schema.episodes).where(inArray(schema.episodes.id, episodeIds)).run()
		}

		db.delete(schema.seasons).where(inArray(schema.seasons.id, seasonIds)).run()

		// All tables should be empty except series
		expect(db.select().from(schema.series).all()).toHaveLength(1)
		expect(db.select().from(schema.seasons).all()).toHaveLength(0)
		expect(db.select().from(schema.episodes).all()).toHaveLength(0)
		expect(db.select().from(schema.files).all()).toHaveLength(0)
		expect(db.select().from(schema.releases).all()).toHaveLength(0)
		expect(db.select().from(schema.downloads).all()).toHaveLength(0)
	})
})
