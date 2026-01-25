import { and, eq, isNull } from 'drizzle-orm'
import fc from 'fast-check'
import { beforeEach, describe, expect, it } from 'vitest'
import * as schema from '@/db/schema'
import { setupTestDb, type TestDb } from '../../test/helpers'

// Helper to create test data
const createTestMovie = (db: TestDb, id: number, title = `Movie ${id}`) => {
	db.insert(schema.movies)
		.values({
			id,
			tmdbId: 1000 + id,
			title,
			year: 2020,
			dateAdded: new Date().toISOString(),
		})
		.run()
	return id
}

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

const createTestSeason = (db: TestDb, id: number, seriesId: number | null, seasonNumber = 1) => {
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

const createTestEpisode = (db: TestDb, id: number, seasonId: number | null, episodeNumber = 1) => {
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

const createTestFile = (db: TestDb, id: number, opts: { movieId?: number | null; seriesId?: number | null; episodeId?: number | null } = {}) => {
	db.insert(schema.files)
		.values({
			id,
			movieId: opts.movieId ?? null,
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

const createTestRelease = (db: TestDb, id: number, opts: { movieId?: number | null; episodeId?: number | null } = {}) => {
	db.insert(schema.releases)
		.values({
			id,
			movieId: opts.movieId ?? null,
			episodeId: opts.episodeId ?? null,
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

const createTestDownload = (db: TestDb, id: number, releaseId: number | null) => {
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

describe('Relationship Integrity - Orphan Detection', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	describe('Seasons without parent series', () => {
		it('detects orphan seasons with null seriesId', async () => {
			// Create orphan season (null seriesId)
			createTestSeason(db, 1, null)

			const orphanSeasons = db.select().from(schema.seasons).where(isNull(schema.seasons.seriesId)).all()

			expect(orphanSeasons).toHaveLength(1)
		})

		it('detects orphan seasons after series deletion', async () => {
			createTestSeries(db, 1)
			createTestSeason(db, 1, 1)

			// Directly delete series without cascade (simulating incomplete deletion)
			db.delete(schema.series).where(eq(schema.series.id, 1)).run()

			// Season still exists but references non-existent series
			const seasons = db.select().from(schema.seasons).all()
			expect(seasons).toHaveLength(1)

			// Verify the FK points to nothing
			const seriesExists = db.select().from(schema.series).where(eq(schema.series.id, 1)).all()
			expect(seriesExists).toHaveLength(0)
		})
	})

	describe('Episodes without parent season', () => {
		it('detects orphan episodes with null seasonId', async () => {
			createTestEpisode(db, 1, null)

			const orphanEpisodes = db.select().from(schema.episodes).where(isNull(schema.episodes.seasonId)).all()

			expect(orphanEpisodes).toHaveLength(1)
		})

		it('detects orphan episodes after season deletion', async () => {
			createTestSeries(db, 1)
			createTestSeason(db, 1, 1)
			createTestEpisode(db, 1, 1)

			// Delete season without cascade
			db.delete(schema.seasons).where(eq(schema.seasons.id, 1)).run()

			const episodes = db.select().from(schema.episodes).all()
			expect(episodes).toHaveLength(1)

			const seasonExists = db.select().from(schema.seasons).where(eq(schema.seasons.id, 1)).all()
			expect(seasonExists).toHaveLength(0)
		})
	})

	describe('Files without parent entity', () => {
		it('detects files with all null FKs', async () => {
			createTestFile(db, 1, {})

			const orphanFiles = db
				.select()
				.from(schema.files)
				.where(and(isNull(schema.files.movieId), isNull(schema.files.seriesId), isNull(schema.files.episodeId)))
				.all()

			expect(orphanFiles).toHaveLength(1)
		})

		it('detects movie files after movie deletion', async () => {
			createTestMovie(db, 1)
			createTestFile(db, 1, { movieId: 1 })

			db.delete(schema.movies).where(eq(schema.movies.id, 1)).run()

			const files = db.select().from(schema.files).all()
			expect(files).toHaveLength(1)
			expect(files[0].movieId).toBe(1)

			const movieExists = db.select().from(schema.movies).where(eq(schema.movies.id, 1)).all()
			expect(movieExists).toHaveLength(0)
		})
	})

	describe('Releases without parent entity', () => {
		it('detects releases with all null FKs', async () => {
			createTestRelease(db, 1, {})

			const orphanReleases = db
				.select()
				.from(schema.releases)
				.where(and(isNull(schema.releases.movieId), isNull(schema.releases.episodeId)))
				.all()

			expect(orphanReleases).toHaveLength(1)
		})
	})

	describe('Downloads without parent release', () => {
		it('detects downloads with null releaseId', async () => {
			createTestDownload(db, 1, null)

			const orphanDownloads = db.select().from(schema.downloads).where(isNull(schema.downloads.releaseId)).all()

			expect(orphanDownloads).toHaveLength(1)
		})

		it('detects downloads after release deletion', async () => {
			createTestMovie(db, 1)
			createTestRelease(db, 1, { movieId: 1 })
			createTestDownload(db, 1, 1)

			db.delete(schema.releases).where(eq(schema.releases.id, 1)).run()

			const downloads = db.select().from(schema.downloads).all()
			expect(downloads).toHaveLength(1)

			const releaseExists = db.select().from(schema.releases).where(eq(schema.releases.id, 1)).all()
			expect(releaseExists).toHaveLength(0)
		})
	})
})

describe('Relationship Integrity - FK Exclusivity', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	describe('Files belong to exactly one parent type', () => {
		it('allows file with only movieId', async () => {
			createTestMovie(db, 1)
			createTestFile(db, 1, { movieId: 1 })

			const file = db.select().from(schema.files).where(eq(schema.files.id, 1)).all()[0]
			expect(file.movieId).toBe(1)
			expect(file.seriesId).toBeNull()
			expect(file.episodeId).toBeNull()
		})

		it('allows file with only episodeId', async () => {
			createTestSeries(db, 1)
			createTestSeason(db, 1, 1)
			createTestEpisode(db, 1, 1)
			createTestFile(db, 1, { episodeId: 1 })

			const file = db.select().from(schema.files).where(eq(schema.files.id, 1)).all()[0]
			expect(file.movieId).toBeNull()
			expect(file.episodeId).toBe(1)
		})

		it('file can have both seriesId and episodeId (valid for TV)', async () => {
			createTestSeries(db, 1)
			createTestSeason(db, 1, 1)
			createTestEpisode(db, 1, 1)
			createTestFile(db, 1, { seriesId: 1, episodeId: 1 })

			const file = db.select().from(schema.files).where(eq(schema.files.id, 1)).all()[0]
			expect(file.seriesId).toBe(1)
			expect(file.episodeId).toBe(1)
		})
	})

	describe('Releases belong to exactly one parent type', () => {
		it('allows release with only movieId', async () => {
			createTestMovie(db, 1)
			createTestRelease(db, 1, { movieId: 1 })

			const release = db.select().from(schema.releases).where(eq(schema.releases.id, 1)).all()[0]
			expect(release.movieId).toBe(1)
			expect(release.episodeId).toBeNull()
		})

		it('allows release with only episodeId', async () => {
			createTestSeries(db, 1)
			createTestSeason(db, 1, 1)
			createTestEpisode(db, 1, 1)
			createTestRelease(db, 1, { episodeId: 1 })

			const release = db.select().from(schema.releases).where(eq(schema.releases.id, 1)).all()[0]
			expect(release.movieId).toBeNull()
			expect(release.episodeId).toBe(1)
		})
	})
})

describe('Relationship Integrity - Chain Validation', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('validates complete series->season->episode chain', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1)
		createTestEpisode(db, 1, 1)

		// Verify chain
		const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, 1)).all()[0]
		expect(episode.seasonId).not.toBeNull()
		const season = db
			.select()
			.from(schema.seasons)
			.where(eq(schema.seasons.id, Number(episode.seasonId)))
			.all()[0]
		expect(season.seriesId).not.toBeNull()
		const series = db
			.select()
			.from(schema.series)
			.where(eq(schema.series.id, Number(season.seriesId)))
			.all()[0]

		expect(episode.seasonId).toBe(season.id)
		expect(season.seriesId).toBe(series.id)
	})

	it('validates complete release->download chain', async () => {
		createTestMovie(db, 1)
		createTestRelease(db, 1, { movieId: 1 })
		createTestDownload(db, 1, 1)

		const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).all()[0]
		expect(download.releaseId).not.toBeNull()
		const release = db
			.select()
			.from(schema.releases)
			.where(eq(schema.releases.id, Number(download.releaseId)))
			.all()[0]
		expect(release.movieId).not.toBeNull()
		const movie = db
			.select()
			.from(schema.movies)
			.where(eq(schema.movies.id, Number(release.movieId)))
			.all()[0]

		expect(download.releaseId).toBe(release.id)
		expect(release.movieId).toBe(movie.id)
	})

	it('validates complete file->movie chain', async () => {
		createTestMovie(db, 1)
		createTestFile(db, 1, { movieId: 1 })

		const file = db.select().from(schema.files).where(eq(schema.files.id, 1)).all()[0]
		expect(file.movieId).not.toBeNull()
		const movie = db
			.select()
			.from(schema.movies)
			.where(eq(schema.movies.id, Number(file.movieId)))
			.all()[0]

		expect(file.movieId).toBe(movie.id)
	})

	it('validates complete file->episode chain', async () => {
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1)
		createTestEpisode(db, 1, 1)
		createTestFile(db, 1, { episodeId: 1 })

		const file = db.select().from(schema.files).where(eq(schema.files.id, 1)).all()[0]
		expect(file.episodeId).not.toBeNull()
		const episode = db
			.select()
			.from(schema.episodes)
			.where(eq(schema.episodes.id, Number(file.episodeId)))
			.all()[0]
		expect(episode.seasonId).not.toBeNull()
		const season = db
			.select()
			.from(schema.seasons)
			.where(eq(schema.seasons.id, Number(episode.seasonId)))
			.all()[0]
		expect(season.seriesId).not.toBeNull()
		const series = db
			.select()
			.from(schema.series)
			.where(eq(schema.series.id, Number(season.seriesId)))
			.all()[0]

		expect(file.episodeId).toBe(episode.id)
		expect(episode.seasonId).toBe(season.id)
		expect(season.seriesId).toBe(series.id)
	})
})

describe('Relationship Integrity - Property Based', () => {
	const arbPositiveInt = fc.integer({ min: 1, max: 1000 })

	it('orphan count matches records with null parent FK', async () => {
		await fc.assert(
			fc.asyncProperty(arbPositiveInt, arbPositiveInt, async (orphanCount, validCount) => {
				const db = await setupTestDb()

				// Create valid seasons (with series)
				for (let i = 1; i <= Math.min(validCount, 10); i++) {
					createTestSeries(db, i)
					createTestSeason(db, i, i)
				}

				// Create orphan seasons (null seriesId)
				for (let i = 1; i <= Math.min(orphanCount, 10); i++) {
					db.insert(schema.seasons)
						.values({
							id: 1000 + i,
							seriesId: null,
							seasonNumber: i,
						})
						.run()
				}

				const orphans = db.select().from(schema.seasons).where(isNull(schema.seasons.seriesId)).all()

				expect(orphans.length).toBe(Math.min(orphanCount, 10))
			}),
			{ numRuns: 20 },
		)
	})

	it('deleting parent always leaves orphan if no cascade', async () => {
		await fc.assert(
			fc.asyncProperty(arbPositiveInt, async (childCount) => {
				const db = await setupTestDb()
				const count = Math.min(childCount, 5)

				createTestSeries(db, 1)

				// Create multiple seasons for the series
				for (let i = 1; i <= count; i++) {
					createTestSeason(db, i, 1, i)
				}

				// Delete series without cascade
				db.delete(schema.series).where(eq(schema.series.id, 1)).run()

				// All seasons become orphans
				const allSeasons = db.select().from(schema.seasons).all()
				const orphanSeasons = db.select().from(schema.seasons).where(eq(schema.seasons.seriesId, 1)).all()

				expect(allSeasons.length).toBe(count)
				expect(orphanSeasons.length).toBe(count) // FK value still there, points to nothing
			}),
			{ numRuns: 20 },
		)
	})
})

describe('Relationship Integrity - Multi-level Orphans', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('series deletion creates cascading orphans if not handled', async () => {
		// Create full hierarchy
		createTestSeries(db, 1)
		createTestSeason(db, 1, 1)
		createTestEpisode(db, 1, 1)
		createTestFile(db, 1, { episodeId: 1 })
		createTestRelease(db, 1, { episodeId: 1 })
		createTestDownload(db, 1, 1)

		// Delete only series (no cascade)
		db.delete(schema.series).where(eq(schema.series.id, 1)).run()

		// Verify everything else remains
		expect(db.select().from(schema.series).all()).toHaveLength(0)
		expect(db.select().from(schema.seasons).all()).toHaveLength(1)
		expect(db.select().from(schema.episodes).all()).toHaveLength(1)
		expect(db.select().from(schema.files).all()).toHaveLength(1)
		expect(db.select().from(schema.releases).all()).toHaveLength(1)
		expect(db.select().from(schema.downloads).all()).toHaveLength(1)

		// Season is orphaned (seriesId points to nothing)
		const season = db.select().from(schema.seasons).all()[0]
		expect(season.seriesId).toBe(1)
		const seriesExists = db.select().from(schema.series).where(eq(schema.series.id, 1)).all()
		expect(seriesExists).toHaveLength(0)
	})

	it('movie deletion creates orphaned files and releases if not handled', async () => {
		createTestMovie(db, 1)
		createTestFile(db, 1, { movieId: 1 })
		createTestFile(db, 2, { movieId: 1 })
		createTestRelease(db, 1, { movieId: 1 })
		createTestDownload(db, 1, 1)

		// Delete only movie (no cascade)
		db.delete(schema.movies).where(eq(schema.movies.id, 1)).run()

		expect(db.select().from(schema.movies).all()).toHaveLength(0)
		expect(db.select().from(schema.files).all()).toHaveLength(2)
		expect(db.select().from(schema.releases).all()).toHaveLength(1)
		expect(db.select().from(schema.downloads).all()).toHaveLength(1)

		// Files and releases point to non-existent movie
		const files = db.select().from(schema.files).all()
		expect(files.every((f) => f.movieId === 1)).toBe(true)
	})
})

describe('Relationship Integrity - Isolation', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('operations on one movie do not affect another', async () => {
		createTestMovie(db, 1, 'Movie 1')
		createTestMovie(db, 2, 'Movie 2')
		createTestFile(db, 1, { movieId: 1 })
		createTestFile(db, 2, { movieId: 2 })

		// Delete movie 1
		db.delete(schema.movies).where(eq(schema.movies.id, 1)).run()

		// Movie 2 and its file unaffected
		const movies = db.select().from(schema.movies).all()
		expect(movies).toHaveLength(1)
		expect(movies[0].title).toBe('Movie 2')

		const files = db.select().from(schema.files).where(eq(schema.files.movieId, 2)).all()
		expect(files).toHaveLength(1)
	})

	it('operations on one series do not affect another', async () => {
		createTestSeries(db, 1, 'Series 1')
		createTestSeries(db, 2, 'Series 2')
		createTestSeason(db, 1, 1)
		createTestSeason(db, 2, 2)
		createTestEpisode(db, 1, 1)
		createTestEpisode(db, 2, 2)

		// Delete series 1
		db.delete(schema.series).where(eq(schema.series.id, 1)).run()

		// Series 2 and children unaffected
		const series = db.select().from(schema.series).all()
		expect(series).toHaveLength(1)
		expect(series[0].title).toBe('Series 2')

		const seasons = db.select().from(schema.seasons).where(eq(schema.seasons.seriesId, 2)).all()
		expect(seasons).toHaveLength(1)

		const episodes = db.select().from(schema.episodes).where(eq(schema.episodes.seasonId, 2)).all()
		expect(episodes).toHaveLength(1)
	})

	it('multiple series can have seasons with same season number', async () => {
		createTestSeries(db, 1, 'Series 1')
		createTestSeries(db, 2, 'Series 2')
		createTestSeason(db, 1, 1, 1) // Series 1, Season 1
		createTestSeason(db, 2, 2, 1) // Series 2, Season 1

		const seasons = db.select().from(schema.seasons).all()
		expect(seasons).toHaveLength(2)
		expect(seasons.every((s) => s.seasonNumber === 1)).toBe(true)
		expect(seasons.map((s) => s.seriesId).sort()).toEqual([1, 2])
	})
})
