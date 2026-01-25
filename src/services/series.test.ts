import { eq, inArray, sql } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import fc from 'fast-check'
import { beforeEach, describe, expect, it } from 'vitest'
import type * as schemaTypes from '@/db/schema'
import * as schema from '@/db/schema'
import { setupTestDb, type TestDb } from '../../test/helpers'

// Define SeriesDetails inline to avoid importing tmdb.ts which pulls in env
interface SeasonPreview {
	seasonNumber: number
	episodeCount: number
	airDate?: string
	name?: string
}

interface EpisodePreview {
	episodeNumber: number
	seasonNumber: number
	title: string
	airDate?: string
	runtimeMins?: number
}

interface SeasonWithEpisodes extends SeasonPreview {
	episodes: EpisodePreview[]
}

interface SeriesWithEpisodes {
	tmdbId: number
	title: string
	year: number
	status: 'continuing' | 'ended'
	network?: string
	overview?: string
	posterUrl?: string
	backdropUrl?: string
	genres: string[]
	runtimeMins?: number
	contentRating?: string
	seasons: SeasonPreview[]
	alternateTitles: string[]
	seasonsWithEpisodes: SeasonWithEpisodes[]
}

// Pure function for series insertion - mirrors createSeries logic without TMDB/env dependencies
async function insertSeriesFromTmdb(
	database: BunSQLiteDatabase<typeof schema>,
	details: SeriesWithEpisodes,
	monitoredSeasons: number[],
	options?: {
		resolution?: '480p' | '720p' | '1080p' | '2160p'
		useYearInFolder?: boolean
	},
) {
	const now = new Date().toISOString()

	// Compute next airing date from episodes (earliest future air date)
	const today = new Date().toISOString().split('T')[0]
	let nextAiring: string | undefined
	for (const season of details.seasonsWithEpisodes) {
		for (const ep of season.episodes) {
			if (ep.airDate && ep.airDate > today) {
				if (!nextAiring || ep.airDate < nextAiring) {
					nextAiring = ep.airDate
				}
			}
		}
	}

	// Insert series
	const [insertedSeries] = await database
		.insert(schema.series)
		.values({
			tmdbId: details.tmdbId,
			title: details.title,
			year: details.year,
			status: details.status,
			network: details.network,
			overview: details.overview,
			posterUrl: details.posterUrl,
			backdropUrl: details.backdropUrl,
			genres: JSON.stringify(details.genres),
			runtimeMins: details.runtimeMins,
			contentRating: details.contentRating,
			alternateTitles: JSON.stringify(details.alternateTitles),
			monitored: true,
			resolution: options?.resolution ?? '1080p',
			dateAdded: now,
			nextAiring,
			lastInfoSync: now,
			useYearInFolder: options?.useYearInFolder ?? false,
		})
		.returning()

	// Insert all seasons (with monitored flag based on selection)
	const monitoredSet = new Set(monitoredSeasons)
	for (const season of details.seasons) {
		const [insertedSeason] = await database
			.insert(schema.seasons)
			.values({
				seriesId: insertedSeries.id,
				seasonNumber: season.seasonNumber,
				monitored: monitoredSet.has(season.seasonNumber),
			})
			.returning()

		// Insert episodes only for monitored seasons
		const seasonWithEps = details.seasonsWithEpisodes.find((s) => s.seasonNumber === season.seasonNumber)
		if (seasonWithEps) {
			for (const ep of seasonWithEps.episodes) {
				await database.insert(schema.episodes).values({
					seasonId: insertedSeason.id,
					episodeNumber: ep.episodeNumber,
					title: ep.title,
					airDate: ep.airDate,
					runtimeMins: ep.runtimeMins,
					monitored: true,
				})
			}
		}
	}

	return insertedSeries
}

// Check if series exists by TMDB ID
async function seriesExistsByTmdbId(database: BunSQLiteDatabase<typeof schema>, tmdbId: number): Promise<boolean> {
	const existing = await database.select().from(schema.series).where(eq(schema.series.tmdbId, tmdbId))
	return existing.length > 0
}

// Pure function for series deletion - mirrors deleteSeries logic without env dependencies
async function deleteSeriesCore(database: BunSQLiteDatabase<typeof schemaTypes>, seriesId: number) {
	const seriesRecord = await database.select().from(schema.series).where(eq(schema.series.id, seriesId))
	if (!seriesRecord.length) {
		throw new Error('Series not found')
	}

	// Get all seasons for this series
	const seasonsData = await database.select().from(schema.seasons).where(eq(schema.seasons.seriesId, seriesId))
	const seasonIds = seasonsData.map((s) => s.id)

	if (seasonIds.length > 0) {
		// Get all episodes for these seasons
		const episodesData = await database.select().from(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds))
		const episodeIds = episodesData.map((e) => e.id)

		if (episodeIds.length > 0) {
			// Delete associated files from db
			await database.delete(schema.files).where(inArray(schema.files.episodeId, episodeIds))

			// Get releases for these episodes to delete their downloads
			const episodeReleases = await database.select().from(schema.releases).where(inArray(schema.releases.episodeId, episodeIds))
			for (const release of episodeReleases) {
				await database.delete(schema.downloads).where(eq(schema.downloads.releaseId, release.id))
			}

			// Delete releases
			await database.delete(schema.releases).where(inArray(schema.releases.episodeId, episodeIds))

			// Delete episodes
			await database.delete(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds))
		}

		// Delete seasons
		await database.delete(schema.seasons).where(eq(schema.seasons.seriesId, seriesId))
	}

	// Delete series
	await database.delete(schema.series).where(eq(schema.series.id, seriesId))

	return { success: true }
}

// Arbitrary for episode preview
const arbEpisodePreview = (seasonNumber: number) =>
	fc.record({
		episodeNumber: fc.integer({ min: 1, max: 30 }),
		seasonNumber: fc.constant(seasonNumber),
		title: fc.string({ minLength: 1, maxLength: 100 }),
		airDate: fc.option(
			fc
				.tuple(fc.integer({ min: 2000, max: 2030 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
				.map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`),
			{ nil: undefined },
		),
		runtimeMins: fc.option(fc.integer({ min: 20, max: 90 }), { nil: undefined }),
	})

// Arbitrary for series details
const arbSeriesDetails = fc
	.record({
		tmdbId: fc.integer({ min: 1, max: 999999 }),
		title: fc.string({ minLength: 1, maxLength: 100 }),
		year: fc.integer({ min: 1950, max: 2030 }),
		status: fc.constantFrom('continuing', 'ended') as fc.Arbitrary<'continuing' | 'ended'>,
		network: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
		overview: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
		posterUrl: fc.option(fc.webUrl(), { nil: undefined }),
		backdropUrl: fc.option(fc.webUrl(), { nil: undefined }),
		genres: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
		runtimeMins: fc.option(fc.integer({ min: 20, max: 90 }), { nil: undefined }),
		contentRating: fc.option(fc.constantFrom('TV-G', 'TV-PG', 'TV-14', 'TV-MA'), { nil: undefined }),
		alternateTitles: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 5 }),
		seasonCount: fc.integer({ min: 1, max: 5 }),
	})
	.chain((base) => {
		const seasons: SeasonPreview[] = Array.from({ length: base.seasonCount }, (_, i) => ({
			seasonNumber: i + 1,
			episodeCount: 10,
			name: `Season ${i + 1}`,
		}))

		return fc
			.tuple(
				...seasons.map((s) =>
					fc.array(arbEpisodePreview(s.seasonNumber), { minLength: 1, maxLength: 10 }).map((episodes) => ({
						...s,
						episodes: episodes.map((ep, idx) => ({ ...ep, episodeNumber: idx + 1 })),
					})),
				),
			)
			.map((seasonsWithEpisodes) => ({
				tmdbId: base.tmdbId,
				title: base.title,
				year: base.year,
				status: base.status,
				network: base.network,
				overview: base.overview,
				posterUrl: base.posterUrl,
				backdropUrl: base.backdropUrl,
				genres: base.genres,
				runtimeMins: base.runtimeMins,
				contentRating: base.contentRating,
				alternateTitles: base.alternateTitles,
				seasons,
				seasonsWithEpisodes,
			}))
	})

describe('insertSeriesFromTmdb', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('inserts series with all fields', async () => {
		const details: SeriesWithEpisodes = {
			tmdbId: 1396,
			title: 'Breaking Bad',
			year: 2008,
			status: 'ended',
			network: 'AMC',
			overview: 'A high school chemistry teacher turned meth producer.',
			posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
			backdropUrl: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
			genres: ['Drama', 'Crime', 'Thriller'],
			runtimeMins: 45,
			contentRating: 'TV-MA',
			alternateTitles: ['Breaking Bad - A Química do Mal'],
			seasons: [
				{ seasonNumber: 1, episodeCount: 7, name: 'Season 1' },
				{ seasonNumber: 2, episodeCount: 13, name: 'Season 2' },
			],
			seasonsWithEpisodes: [
				{
					seasonNumber: 1,
					episodeCount: 7,
					name: 'Season 1',
					episodes: [
						{ episodeNumber: 1, seasonNumber: 1, title: 'Pilot', airDate: '2008-01-20', runtimeMins: 58 },
						{ episodeNumber: 2, seasonNumber: 1, title: "Cat's in the Bag...", airDate: '2008-01-27', runtimeMins: 48 },
					],
				},
				{
					seasonNumber: 2,
					episodeCount: 13,
					name: 'Season 2',
					episodes: [{ episodeNumber: 1, seasonNumber: 2, title: 'Seven Thirty-Seven', airDate: '2009-03-08', runtimeMins: 47 }],
				},
			],
		}

		const series = await insertSeriesFromTmdb(db, details, [1, 2])

		expect(series.tmdbId).toBe(1396)
		expect(series.title).toBe('Breaking Bad')
		expect(series.year).toBe(2008)
		expect(series.status).toBe('ended')
		expect(series.network).toBe('AMC')
		expect(series.overview).toBe('A high school chemistry teacher turned meth producer.')
		expect(series.posterUrl).toBe('https://image.tmdb.org/t/p/w500/poster.jpg')
		expect(series.backdropUrl).toBe('https://image.tmdb.org/t/p/w780/backdrop.jpg')
		expect(series.genres).toBe(JSON.stringify(['Drama', 'Crime', 'Thriller']))
		expect(series.runtimeMins).toBe(45)
		expect(series.contentRating).toBe('TV-MA')
		expect(series.alternateTitles).toBe(JSON.stringify(['Breaking Bad - A Química do Mal']))
		expect(series.monitored).toBe(true)
		expect(series.resolution).toBe('1080p')
		expect(series.dateAdded).toBeDefined()
		expect(series.lastInfoSync).toBeDefined()
	})

	it('inserts series with custom resolution', async () => {
		const details: SeriesWithEpisodes = {
			tmdbId: 1399,
			title: 'Game of Thrones',
			year: 2011,
			status: 'ended',
			genres: ['Drama', 'Fantasy'],
			alternateTitles: [],
			seasons: [{ seasonNumber: 1, episodeCount: 10 }],
			seasonsWithEpisodes: [
				{
					seasonNumber: 1,
					episodeCount: 10,
					episodes: [{ episodeNumber: 1, seasonNumber: 1, title: 'Winter Is Coming' }],
				},
			],
		}

		const series = await insertSeriesFromTmdb(db, details, [1], { resolution: '2160p' })

		expect(series.resolution).toBe('2160p')
	})

	it('inserts series with minimal fields', async () => {
		const details: SeriesWithEpisodes = {
			tmdbId: 1,
			title: 'Minimal Series',
			year: 2020,
			status: 'continuing',
			genres: [],
			alternateTitles: [],
			seasons: [],
			seasonsWithEpisodes: [],
		}

		const series = await insertSeriesFromTmdb(db, details, [])

		expect(series.tmdbId).toBe(1)
		expect(series.title).toBe('Minimal Series')
		expect(series.year).toBe(2020)
		expect(series.network).toBeNull()
		expect(series.posterUrl).toBeNull()
		expect(series.overview).toBeNull()
	})

	it('series is persisted in database', async () => {
		const details: SeriesWithEpisodes = {
			tmdbId: 123,
			title: 'Test Series',
			year: 2023,
			status: 'continuing',
			genres: [],
			alternateTitles: [],
			seasons: [],
			seasonsWithEpisodes: [],
		}

		await insertSeriesFromTmdb(db, details, [])

		const allSeries = db.select().from(schema.series).all()
		expect(allSeries).toHaveLength(1)
		expect(allSeries[0].title).toBe('Test Series')
	})

	it('inserts seasons with correct monitored flag', async () => {
		const details: SeriesWithEpisodes = {
			tmdbId: 1396,
			title: 'Breaking Bad',
			year: 2008,
			status: 'ended',
			genres: [],
			alternateTitles: [],
			seasons: [
				{ seasonNumber: 1, episodeCount: 7 },
				{ seasonNumber: 2, episodeCount: 13 },
				{ seasonNumber: 3, episodeCount: 13 },
			],
			seasonsWithEpisodes: [
				{
					seasonNumber: 1,
					episodeCount: 7,
					episodes: [{ episodeNumber: 1, seasonNumber: 1, title: 'Pilot' }],
				},
				{
					seasonNumber: 2,
					episodeCount: 13,
					episodes: [{ episodeNumber: 1, seasonNumber: 2, title: 'Seven Thirty-Seven' }],
				},
				// Season 3 not in seasonsWithEpisodes (not monitored)
			],
		}

		// Only monitor seasons 1 and 2
		await insertSeriesFromTmdb(db, details, [1, 2])

		const seasons = db.select().from(schema.seasons).all()
		expect(seasons).toHaveLength(3)

		const season1 = seasons.find((s) => s.seasonNumber === 1)
		const season2 = seasons.find((s) => s.seasonNumber === 2)
		const season3 = seasons.find((s) => s.seasonNumber === 3)

		expect(season1?.monitored).toBe(true)
		expect(season2?.monitored).toBe(true)
		expect(season3?.monitored).toBe(false)
	})

	it('inserts episodes only for seasons with episode data', async () => {
		// In the real flow, seasonsWithEpisodes only contains data for monitored seasons
		// because fetchSeriesWithEpisodes only fetches episodes for requested seasons
		const details: SeriesWithEpisodes = {
			tmdbId: 1396,
			title: 'Breaking Bad',
			year: 2008,
			status: 'ended',
			genres: [],
			alternateTitles: [],
			seasons: [
				{ seasonNumber: 1, episodeCount: 3 },
				{ seasonNumber: 2, episodeCount: 3 },
			],
			// Only season 1 has episode data (simulating only requesting season 1 from TMDB)
			seasonsWithEpisodes: [
				{
					seasonNumber: 1,
					episodeCount: 3,
					episodes: [
						{ episodeNumber: 1, seasonNumber: 1, title: 'S1E1' },
						{ episodeNumber: 2, seasonNumber: 1, title: 'S1E2' },
						{ episodeNumber: 3, seasonNumber: 1, title: 'S1E3' },
					],
				},
			],
		}

		// Only monitor season 1
		await insertSeriesFromTmdb(db, details, [1])

		const episodes = db.select().from(schema.episodes).all()
		// Only season 1 episodes should be inserted (3 episodes)
		expect(episodes).toHaveLength(3)
		expect(episodes.every((e) => e.title.startsWith('S1'))).toBe(true)

		// Verify both seasons were created but with different monitored status
		const seasons = db.select().from(schema.seasons).all()
		expect(seasons).toHaveLength(2)
		expect(seasons.find((s) => s.seasonNumber === 1)?.monitored).toBe(true)
		expect(seasons.find((s) => s.seasonNumber === 2)?.monitored).toBe(false)
	})

	it('sets useYearInFolder when specified', async () => {
		const details: SeriesWithEpisodes = {
			tmdbId: 123,
			title: 'Duplicate Name Show',
			year: 2020,
			status: 'continuing',
			genres: [],
			alternateTitles: [],
			seasons: [],
			seasonsWithEpisodes: [],
		}

		const series = await insertSeriesFromTmdb(db, details, [], { useYearInFolder: true })

		expect(series.useYearInFolder).toBe(true)
	})

	it('computes nextAiring from future episode air dates', async () => {
		const futureDate = '2030-12-25'
		const details: SeriesWithEpisodes = {
			tmdbId: 123,
			title: 'Future Show',
			year: 2020,
			status: 'continuing',
			genres: [],
			alternateTitles: [],
			seasons: [{ seasonNumber: 1, episodeCount: 2 }],
			seasonsWithEpisodes: [
				{
					seasonNumber: 1,
					episodeCount: 2,
					episodes: [
						{ episodeNumber: 1, seasonNumber: 1, title: 'Past Episode', airDate: '2020-01-01' },
						{ episodeNumber: 2, seasonNumber: 1, title: 'Future Episode', airDate: futureDate },
					],
				},
			],
		}

		const series = await insertSeriesFromTmdb(db, details, [1])

		expect(series.nextAiring).toBe(futureDate)
	})
})

describe('seriesExistsByTmdbId', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('returns false for non-existent series', async () => {
		const exists = await seriesExistsByTmdbId(db, 99999)
		expect(exists).toBe(false)
	})

	it('returns true for existing series', async () => {
		db.insert(schema.series)
			.values({
				tmdbId: 1396,
				title: 'Breaking Bad',
				year: 2008,
				status: 'ended',
				dateAdded: new Date().toISOString(),
			})
			.run()

		const exists = await seriesExistsByTmdbId(db, 1396)
		expect(exists).toBe(true)
	})
})

describe('duplicate series detection', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('allows inserting multiple different series', async () => {
		const series1: SeriesWithEpisodes = {
			tmdbId: 1,
			title: 'Series 1',
			year: 2020,
			status: 'continuing',
			genres: [],
			alternateTitles: [],
			seasons: [],
			seasonsWithEpisodes: [],
		}
		const series2: SeriesWithEpisodes = {
			tmdbId: 2,
			title: 'Series 2',
			year: 2021,
			status: 'ended',
			genres: [],
			alternateTitles: [],
			seasons: [],
			seasonsWithEpisodes: [],
		}

		await insertSeriesFromTmdb(db, series1, [])
		await insertSeriesFromTmdb(db, series2, [])

		const allSeries = db.select().from(schema.series).all()
		expect(allSeries).toHaveLength(2)
	})

	it('seriesExistsByTmdbId detects duplicates correctly', async () => {
		const details: SeriesWithEpisodes = {
			tmdbId: 123,
			title: 'Original Series',
			year: 2020,
			status: 'continuing',
			genres: [],
			alternateTitles: [],
			seasons: [],
			seasonsWithEpisodes: [],
		}

		await insertSeriesFromTmdb(db, details, [])

		expect(await seriesExistsByTmdbId(db, 123)).toBe(true)
		expect(await seriesExistsByTmdbId(db, 456)).toBe(false)
	})
})

describe('property-based tests', () => {
	it('insertSeriesFromTmdb preserves all details fields', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesDetails, async (details) => {
				const db = await setupTestDb()
				const series = await insertSeriesFromTmdb(db, details, [])

				expect(series.tmdbId).toBe(details.tmdbId)
				expect(series.title).toBe(details.title)
				expect(series.year).toBe(details.year)
				expect(series.status).toBe(details.status)
				expect(series.network).toBe(details.network ?? null)
				expect(series.posterUrl).toBe(details.posterUrl ?? null)
				expect(series.backdropUrl).toBe(details.backdropUrl ?? null)
				expect(series.overview).toBe(details.overview ?? null)
				expect(series.runtimeMins).toBe(details.runtimeMins ?? null)
				expect(series.contentRating).toBe(details.contentRating ?? null)
			}),
		)
	})

	it('insertSeriesFromTmdb always sets default resolution to 1080p', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesDetails, async (details) => {
				const db = await setupTestDb()
				const series = await insertSeriesFromTmdb(db, details, [])
				expect(series.resolution).toBe('1080p')
			}),
		)
	})

	it('insertSeriesFromTmdb respects custom resolution', async () => {
		const arbResolution = fc.constantFrom('480p', '720p', '1080p', '2160p') as fc.Arbitrary<'480p' | '720p' | '1080p' | '2160p'>

		await fc.assert(
			fc.asyncProperty(arbSeriesDetails, arbResolution, async (details, resolution) => {
				const db = await setupTestDb()
				const series = await insertSeriesFromTmdb(db, details, [], { resolution })
				expect(series.resolution).toBe(resolution)
			}),
		)
	})

	it('insertSeriesFromTmdb sets monitored to true', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesDetails, async (details) => {
				const db = await setupTestDb()
				const series = await insertSeriesFromTmdb(db, details, [])
				expect(series.monitored).toBe(true)
			}),
		)
	})

	it('insertSeriesFromTmdb serializes genres as JSON', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesDetails, async (details) => {
				const db = await setupTestDb()
				const series = await insertSeriesFromTmdb(db, details, [])
				expect(series.genres).toBe(JSON.stringify(details.genres))
			}),
		)
	})

	it('insertSeriesFromTmdb serializes alternateTitles as JSON', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesDetails, async (details) => {
				const db = await setupTestDb()
				const series = await insertSeriesFromTmdb(db, details, [])
				expect(series.alternateTitles).toBe(JSON.stringify(details.alternateTitles))
			}),
		)
	})

	it('inserted series can be retrieved from db', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesDetails, async (details) => {
				const db = await setupTestDb()
				await insertSeriesFromTmdb(db, details, [])

				const allSeries = db.select().from(schema.series).all()
				expect(allSeries).toHaveLength(1)
				expect(allSeries[0].tmdbId).toBe(details.tmdbId)
			}),
		)
	})

	it('inserts correct number of seasons', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesDetails, async (details) => {
				const db = await setupTestDb()
				await insertSeriesFromTmdb(db, details, [])

				const seasons = db.select().from(schema.seasons).all()
				expect(seasons).toHaveLength(details.seasons.length)
			}),
		)
	})

	it('monitored seasons get their episodes inserted', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesDetails, async (details) => {
				const db = await setupTestDb()
				// Monitor all seasons
				const monitoredSeasons = details.seasons.map((s) => s.seasonNumber)
				await insertSeriesFromTmdb(db, details, monitoredSeasons)

				const episodes = db.select().from(schema.episodes).all()
				const expectedEpisodeCount = details.seasonsWithEpisodes.reduce((sum, s) => sum + s.episodes.length, 0)
				expect(episodes).toHaveLength(expectedEpisodeCount)
			}),
		)
	})
})

describe('deleteSeriesCore - cascade delete', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('deletes series with no associated records', async () => {
		// Insert series
		db.insert(schema.series)
			.values({
				id: 1,
				tmdbId: 1396,
				title: 'Breaking Bad',
				year: 2008,
				status: 'ended',
				dateAdded: new Date().toISOString(),
			})
			.run()

		// Delete series
		const result = await deleteSeriesCore(db, 1)

		expect(result.success).toBe(true)
		expect(db.select().from(schema.series).all()).toHaveLength(0)
	})

	it('deletes seasons when series is deleted', async () => {
		const now = new Date().toISOString()

		// Insert series
		db.insert(schema.series)
			.values({
				id: 1,
				tmdbId: 1396,
				title: 'Breaking Bad',
				year: 2008,
				status: 'ended',
				dateAdded: now,
			})
			.run()

		// Insert seasons
		db.insert(schema.seasons)
			.values([
				{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
				{ id: 2, seriesId: 1, seasonNumber: 2, monitored: true },
			])
			.run()

		// Delete series
		await deleteSeriesCore(db, 1)

		// Verify seasons are deleted
		expect(db.select().from(schema.seasons).all()).toHaveLength(0)
	})

	it('deletes episodes when series is deleted', async () => {
		const now = new Date().toISOString()

		// Insert series
		db.insert(schema.series)
			.values({
				id: 1,
				tmdbId: 1396,
				title: 'Breaking Bad',
				year: 2008,
				status: 'ended',
				dateAdded: now,
			})
			.run()

		// Insert season
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()

		// Insert episodes
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot' },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Episode 2' },
			])
			.run()

		// Delete series
		await deleteSeriesCore(db, 1)

		// Verify episodes are deleted
		expect(db.select().from(schema.episodes).all()).toHaveLength(0)
	})

	it('deletes associated files when series is deleted', async () => {
		const now = new Date().toISOString()

		// Insert series
		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()

		// Insert season
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()

		// Insert episode
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot' }).run()

		// Insert files
		db.insert(schema.files)
			.values([
				{ id: 1, episodeId: 1, path: '/tv/Breaking Bad/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now },
				{ id: 2, episodeId: 1, path: '/tv/Breaking Bad/S01E01.srt', size: 50000, quality: '1080p', dateImported: now },
			])
			.run()

		// Delete series
		await deleteSeriesCore(db, 1)

		// Verify files are deleted
		expect(db.select().from(schema.files).all()).toHaveLength(0)
	})

	it('deletes associated releases when series is deleted', async () => {
		const now = new Date().toISOString()

		// Insert series
		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()

		// Insert season
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()

		// Insert episode
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot' }).run()

		// Insert releases
		db.insert(schema.releases)
			.values([
				{
					id: 1,
					episodeId: 1,
					guid: 'guid-1',
					title: 'Breaking.Bad.S01E01.1080p',
					downloadUrl: 'https://example.com/nzb/1',
					size: 1500000000,
					publishDate: '2023-01-01',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: now,
				},
			])
			.run()

		// Delete series
		await deleteSeriesCore(db, 1)

		// Verify releases are deleted
		expect(db.select().from(schema.releases).all()).toHaveLength(0)
	})

	it('deletes associated downloads when series is deleted', async () => {
		const now = new Date().toISOString()

		// Insert series
		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()

		// Insert season
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()

		// Insert episode
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot' }).run()

		// Insert release
		db.insert(schema.releases)
			.values({
				id: 1,
				episodeId: 1,
				guid: 'guid-1',
				title: 'Breaking.Bad.S01E01.1080p',
				downloadUrl: 'https://example.com/nzb/1',
				size: 1500000000,
				publishDate: '2023-01-01',
				indexerId: 'idx-1',
				indexerName: 'TestIndexer',
				grabbedAt: now,
			})
			.run()

		// Insert download
		db.insert(schema.downloads)
			.values({
				id: 1,
				releaseId: 1,
				nzbId: 100,
				title: 'Breaking.Bad.S01E01.1080p',
				status: 'queued',
				size: 1500000000,
				queuedAt: now,
			})
			.run()

		// Delete series
		await deleteSeriesCore(db, 1)

		// Verify downloads are deleted
		expect(db.select().from(schema.downloads).all()).toHaveLength(0)
	})

	it('cascade deletes all related records: seasons -> episodes -> files -> releases -> downloads', async () => {
		const now = new Date().toISOString()

		// Insert series
		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()

		// Insert seasons
		db.insert(schema.seasons)
			.values([
				{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
				{ id: 2, seriesId: 1, seasonNumber: 2, monitored: true },
			])
			.run()

		// Insert episodes
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'S01E01' },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'S01E02' },
				{ id: 3, seasonId: 2, episodeNumber: 1, title: 'S02E01' },
			])
			.run()

		// Insert files
		db.insert(schema.files)
			.values([
				{ id: 1, episodeId: 1, path: '/tv/Breaking Bad/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now },
				{ id: 2, episodeId: 2, path: '/tv/Breaking Bad/S01E02.mkv', size: 1500000000, quality: '1080p', dateImported: now },
				{ id: 3, episodeId: 3, path: '/tv/Breaking Bad/S02E01.mkv', size: 1500000000, quality: '1080p', dateImported: now },
			])
			.run()

		// Insert releases
		db.insert(schema.releases)
			.values([
				{
					id: 1,
					episodeId: 1,
					guid: 'guid-1',
					title: 'Breaking.Bad.S01E01',
					downloadUrl: 'https://example.com/1',
					size: 1500000000,
					publishDate: '2023-01-01',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: now,
				},
				{
					id: 2,
					episodeId: 2,
					guid: 'guid-2',
					title: 'Breaking.Bad.S01E02',
					downloadUrl: 'https://example.com/2',
					size: 1500000000,
					publishDate: '2023-01-02',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: now,
				},
			])
			.run()

		// Insert downloads
		db.insert(schema.downloads)
			.values([
				{ id: 1, releaseId: 1, nzbId: 100, title: 'Breaking.Bad.S01E01', status: 'completed', size: 1500000000, queuedAt: now },
				{ id: 2, releaseId: 2, nzbId: 101, title: 'Breaking.Bad.S01E02', status: 'completed', size: 1500000000, queuedAt: now },
			])
			.run()

		// Verify initial state
		expect(db.select().from(schema.series).all()).toHaveLength(1)
		expect(db.select().from(schema.seasons).all()).toHaveLength(2)
		expect(db.select().from(schema.episodes).all()).toHaveLength(3)
		expect(db.select().from(schema.files).all()).toHaveLength(3)
		expect(db.select().from(schema.releases).all()).toHaveLength(2)
		expect(db.select().from(schema.downloads).all()).toHaveLength(2)

		// Delete series
		await deleteSeriesCore(db, 1)

		// Verify everything is deleted
		expect(db.select().from(schema.series).all()).toHaveLength(0)
		expect(db.select().from(schema.seasons).all()).toHaveLength(0)
		expect(db.select().from(schema.episodes).all()).toHaveLength(0)
		expect(db.select().from(schema.files).all()).toHaveLength(0)
		expect(db.select().from(schema.releases).all()).toHaveLength(0)
		expect(db.select().from(schema.downloads).all()).toHaveLength(0)
	})

	it('only deletes records for the specified series', async () => {
		const now = new Date().toISOString()

		// Insert two series
		db.insert(schema.series)
			.values([
				{ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now },
				{ id: 2, tmdbId: 1399, title: 'Game of Thrones', year: 2011, status: 'ended', dateAdded: now },
			])
			.run()

		// Insert seasons for both
		db.insert(schema.seasons)
			.values([
				{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
				{ id: 2, seriesId: 2, seasonNumber: 1, monitored: true },
			])
			.run()

		// Insert episodes for both
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'BB Pilot' },
				{ id: 2, seasonId: 2, episodeNumber: 1, title: 'GOT Pilot' },
			])
			.run()

		// Insert files for both
		db.insert(schema.files)
			.values([
				{ id: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now },
				{ id: 2, episodeId: 2, path: '/tv/GOT/S01E01.mkv', size: 2000000000, quality: '1080p', dateImported: now },
			])
			.run()

		// Insert releases for both
		db.insert(schema.releases)
			.values([
				{
					id: 1,
					episodeId: 1,
					guid: 'guid-1',
					title: 'Breaking.Bad.S01E01',
					downloadUrl: 'https://example.com/1',
					size: 1500000000,
					publishDate: '2023-01-01',
					indexerId: 'idx-1',
					indexerName: 'TestIndexer',
					grabbedAt: now,
				},
				{
					id: 2,
					episodeId: 2,
					guid: 'guid-2',
					title: 'GOT.S01E01',
					downloadUrl: 'https://example.com/2',
					size: 2000000000,
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
				{ id: 1, releaseId: 1, nzbId: 100, title: 'Breaking.Bad.S01E01', status: 'completed', size: 1500000000, queuedAt: now },
				{ id: 2, releaseId: 2, nzbId: 101, title: 'GOT.S01E01', status: 'completed', size: 2000000000, queuedAt: now },
			])
			.run()

		// Delete only series 1 (Breaking Bad)
		await deleteSeriesCore(db, 1)

		// Verify series 1 and its records are deleted
		expect(db.select().from(schema.series).where(eq(schema.series.id, 1)).all()).toHaveLength(0)

		// Verify series 2 and its records remain
		expect(db.select().from(schema.series).where(eq(schema.series.id, 2)).all()).toHaveLength(1)
		expect(db.select().from(schema.seasons).where(eq(schema.seasons.seriesId, 2)).all()).toHaveLength(1)
		expect(db.select().from(schema.episodes).where(eq(schema.episodes.seasonId, 2)).all()).toHaveLength(1)
		expect(db.select().from(schema.files).where(eq(schema.files.episodeId, 2)).all()).toHaveLength(1)
		expect(db.select().from(schema.releases).where(eq(schema.releases.episodeId, 2)).all()).toHaveLength(1)
		expect(db.select().from(schema.downloads).where(eq(schema.downloads.releaseId, 2)).all()).toHaveLength(1)
	})

	it('throws error for non-existent series', async () => {
		await expect(deleteSeriesCore(db, 999)).rejects.toThrow('Series not found')
	})

	it('handles series with multiple download attempts per release', async () => {
		const now = new Date().toISOString()

		// Insert series
		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()

		// Insert season
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()

		// Insert episode
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot' }).run()

		// Insert release
		db.insert(schema.releases)
			.values({
				id: 1,
				episodeId: 1,
				guid: 'guid-1',
				title: 'Breaking.Bad.S01E01.1080p',
				downloadUrl: 'https://example.com/nzb/1',
				size: 1500000000,
				publishDate: '2023-01-01',
				indexerId: 'idx-1',
				indexerName: 'TestIndexer',
				grabbedAt: now,
			})
			.run()

		// Insert multiple download attempts for the same release
		db.insert(schema.downloads)
			.values([
				{ id: 1, releaseId: 1, nzbId: 100, title: 'Breaking.Bad.S01E01.1080p', status: 'failed', size: 1500000000, queuedAt: now },
				{ id: 2, releaseId: 1, nzbId: 101, title: 'Breaking.Bad.S01E01.1080p', status: 'failed', size: 1500000000, queuedAt: now },
				{ id: 3, releaseId: 1, nzbId: 102, title: 'Breaking.Bad.S01E01.1080p', status: 'completed', size: 1500000000, queuedAt: now },
			])
			.run()

		// Delete series
		await deleteSeriesCore(db, 1)

		// Verify all downloads are deleted
		expect(db.select().from(schema.downloads).all()).toHaveLength(0)
	})
})

// SeriesPreview type matching the actual listSeries return type
interface SeriesPreview {
	id: number
	title: string
	year: number
	status: 'continuing' | 'ended'
	posterUrl: string | null
	resolution: '480p' | '720p' | '1080p' | '2160p' | null
	monitored: boolean | null
	nextAiring: string | null
	dateAdded: string
	sizeBytes: number
	episodeCount: number
	missingEpisodeCount: number
}

// Pure function matching listSeries query - testable with any db
async function listSeriesCore(database: TestDb): Promise<SeriesPreview[]> {
	return database.all<SeriesPreview>(sql`
		SELECT
			s.id,
			s.title,
			s.year,
			s.status,
			s.poster_url as posterUrl,
			s.resolution,
			s.monitored,
			s.next_airing as nextAiring,
			s.date_added as dateAdded,
			COALESCE(file_stats.size_bytes, 0) as sizeBytes,
			COALESCE(ep_stats.episode_count, 0) as episodeCount,
			COALESCE(ep_stats.missing_episode_count, 0) as missingEpisodeCount
		FROM series s
		LEFT JOIN (
			SELECT series_id, SUM(size) as size_bytes
			FROM files
			WHERE is_deleted = 0 AND series_id IS NOT NULL
			GROUP BY series_id
		) file_stats ON file_stats.series_id = s.id
		LEFT JOIN (
			SELECT
				sea.series_id,
				COUNT(*) as episode_count,
				SUM(CASE WHEN ef.episode_id IS NULL THEN 1 ELSE 0 END) as missing_episode_count
			FROM episodes e
			INNER JOIN seasons sea ON e.season_id = sea.id
			LEFT JOIN (
				SELECT DISTINCT episode_id FROM files WHERE is_deleted = 0 AND episode_id IS NOT NULL
			) ef ON ef.episode_id = e.id
			WHERE e.monitored = 1
			GROUP BY sea.series_id
		) ep_stats ON ep_stats.series_id = s.id
	`)
}

describe('listSeries - episode count calculations', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('returns empty array when no series exist', async () => {
		const seriesList = await listSeriesCore(db)
		expect(seriesList).toHaveLength(0)
	})

	it('returns series with zero counts when no episodes exist', async () => {
		const now = new Date().toISOString()
		db.insert(schema.series)
			.values({
				id: 1,
				tmdbId: 1396,
				title: 'Breaking Bad',
				year: 2008,
				status: 'ended',
				dateAdded: now,
			})
			.run()

		const seriesList = await listSeriesCore(db)

		expect(seriesList).toHaveLength(1)
		expect(seriesList[0].title).toBe('Breaking Bad')
		expect(seriesList[0].episodeCount).toBe(0)
		expect(seriesList[0].missingEpisodeCount).toBe(0)
		expect(seriesList[0].sizeBytes).toBe(0)
	})

	it('counts only monitored episodes', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Episode 2', monitored: true },
				{ id: 3, seasonId: 1, episodeNumber: 3, title: 'Episode 3', monitored: false },
			])
			.run()

		const seriesList = await listSeriesCore(db)

		expect(seriesList[0].episodeCount).toBe(2) // Only monitored episodes
		expect(seriesList[0].missingEpisodeCount).toBe(2) // All monitored episodes are missing
	})

	it('calculates missing episodes correctly when some have files', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Episode 2', monitored: true },
				{ id: 3, seasonId: 1, episodeNumber: 3, title: 'Episode 3', monitored: true },
			])
			.run()
		// Only episode 1 has a file
		db.insert(schema.files).values({ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false }).run()

		const seriesList = await listSeriesCore(db)

		expect(seriesList[0].episodeCount).toBe(3)
		expect(seriesList[0].missingEpisodeCount).toBe(2) // Episodes 2 and 3 are missing
	})

	it('counts zero missing when all episodes have files', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Episode 2', monitored: true },
			])
			.run()
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 1, episodeId: 2, path: '/tv/BB/S01E02.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
			])
			.run()

		const seriesList = await listSeriesCore(db)

		expect(seriesList[0].episodeCount).toBe(2)
		expect(seriesList[0].missingEpisodeCount).toBe(0)
	})

	it('excludes deleted files when calculating missing episodes', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Episode 2', monitored: true },
			])
			.run()
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 1, episodeId: 2, path: '/tv/BB/S01E02.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: true }, // Deleted
			])
			.run()

		const seriesList = await listSeriesCore(db)

		expect(seriesList[0].episodeCount).toBe(2)
		expect(seriesList[0].missingEpisodeCount).toBe(1) // Episode 2's file is deleted
	})

	it('handles multiple seasons correctly', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons)
			.values([
				{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
				{ id: 2, seriesId: 1, seasonNumber: 2, monitored: true },
			])
			.run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'S01E01', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'S01E02', monitored: true },
				{ id: 3, seasonId: 2, episodeNumber: 1, title: 'S02E01', monitored: true },
				{ id: 4, seasonId: 2, episodeNumber: 2, title: 'S02E02', monitored: true },
			])
			.run()
		// Only S01E01 and S02E01 have files
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 1, episodeId: 3, path: '/tv/BB/S02E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
			])
			.run()

		const seriesList = await listSeriesCore(db)

		expect(seriesList[0].episodeCount).toBe(4) // All 4 monitored episodes
		expect(seriesList[0].missingEpisodeCount).toBe(2) // S01E02 and S02E02
	})

	it('handles multiple series independently', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series)
			.values([
				{ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now },
				{ id: 2, tmdbId: 1399, title: 'Game of Thrones', year: 2011, status: 'ended', dateAdded: now },
			])
			.run()
		db.insert(schema.seasons)
			.values([
				{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
				{ id: 2, seriesId: 2, seasonNumber: 1, monitored: true },
			])
			.run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'BB Pilot', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'BB E02', monitored: true },
				{ id: 3, seasonId: 2, episodeNumber: 1, title: 'GOT Pilot', monitored: true },
			])
			.run()
		// Only BB S01E01 has a file
		db.insert(schema.files).values({ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false }).run()

		const seriesList = await listSeriesCore(db)

		const bb = seriesList.find((s) => s.title === 'Breaking Bad')
		const got = seriesList.find((s) => s.title === 'Game of Thrones')

		expect(bb?.episodeCount).toBe(2)
		expect(bb?.missingEpisodeCount).toBe(1)
		expect(got?.episodeCount).toBe(1)
		expect(got?.missingEpisodeCount).toBe(1)
	})
})

describe('listSeries - file size aggregation', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('aggregates file sizes for series', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true }).run()
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.srt', size: 50000, quality: '1080p', dateImported: now, isDeleted: false },
			])
			.run()

		const seriesList = await listSeriesCore(db)

		expect(seriesList[0].sizeBytes).toBe(1500000000 + 50000)
	})

	it('excludes deleted files from size calculation', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true }).run()
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.old.mkv', size: 1000000000, quality: '720p', dateImported: now, isDeleted: true },
			])
			.run()

		const seriesList = await listSeriesCore(db)

		expect(seriesList[0].sizeBytes).toBe(1500000000)
	})
})

describe('listSeries - property-based tests', () => {
	const arbSeriesData = fc.record({
		tmdbId: fc.integer({ min: 1, max: 999999 }),
		title: fc.string({ minLength: 1, maxLength: 100 }),
		year: fc.integer({ min: 1950, max: 2030 }),
		status: fc.constantFrom('continuing', 'ended') as fc.Arbitrary<'continuing' | 'ended'>,
	})

	it('episodeCount is always non-negative', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesData, async (seriesData) => {
				const db = await setupTestDb()
				const now = new Date().toISOString()

				db.insert(schema.series)
					.values({ ...seriesData, id: 1, dateAdded: now })
					.run()

				const seriesList = await listSeriesCore(db)

				expect(seriesList[0].episodeCount).toBeGreaterThanOrEqual(0)
				expect(seriesList[0].missingEpisodeCount).toBeGreaterThanOrEqual(0)
			}),
		)
	})

	it('missingEpisodeCount is never greater than episodeCount', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesData, fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 10 }), async (seriesData, episodeCount, filesCount) => {
				const db = await setupTestDb()
				const now = new Date().toISOString()

				db.insert(schema.series)
					.values({ ...seriesData, id: 1, dateAdded: now })
					.run()
				db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()

				// Create episodes
				for (let i = 0; i < episodeCount; i++) {
					db.insert(schema.episodes)
						.values({ id: i + 1, seasonId: 1, episodeNumber: i + 1, title: `Ep ${i + 1}`, monitored: true })
						.run()
				}

				// Create files for some episodes (up to min of filesCount and episodeCount)
				const actualFilesCount = Math.min(filesCount, episodeCount)
				for (let i = 0; i < actualFilesCount; i++) {
					db.insert(schema.files)
						.values({
							id: i + 1,
							seriesId: 1,
							episodeId: i + 1,
							path: `/tv/S01E${i + 1}.mkv`,
							size: 1000000000,
							quality: '1080p',
							dateImported: now,
							isDeleted: false,
						})
						.run()
				}

				const seriesList = await listSeriesCore(db)

				expect(seriesList[0].missingEpisodeCount).toBeLessThanOrEqual(seriesList[0].episodeCount)
			}),
		)
	})

	it('sizeBytes equals sum of non-deleted file sizes', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesData, fc.array(fc.integer({ min: 0, max: 5000000000 }), { minLength: 0, maxLength: 5 }), async (seriesData, fileSizes) => {
				const db = await setupTestDb()
				const now = new Date().toISOString()

				db.insert(schema.series)
					.values({ ...seriesData, id: 1, dateAdded: now })
					.run()

				for (let i = 0; i < fileSizes.length; i++) {
					db.insert(schema.files)
						.values({
							id: i + 1,
							seriesId: 1,
							path: `/tv/file${i}.mkv`,
							size: fileSizes[i],
							quality: '1080p',
							dateImported: now,
							isDeleted: false,
						})
						.run()
				}

				const seriesList = await listSeriesCore(db)
				const expectedSize = fileSizes.reduce((sum, s) => sum + s, 0)

				expect(seriesList[0].sizeBytes).toBe(expectedSize)
			}),
		)
	})
})

// Types for findSeriesWithDetails tests
interface EpisodeDetails {
	id: number
	seasonId: number | null
	episodeNumber: number
	title: string
	airDate: string | null
	runtimeMins: number | null
	monitored: boolean | null
	files: schemaTypes.File[]
}

interface SeasonDetails {
	id: number
	seriesId: number | null
	seasonNumber: number
	monitored: boolean | null
	episodes: EpisodeDetails[]
}

interface SeriesDetails {
	id: number
	tvdbId: number | null
	tmdbId: number
	imdbId: string | null
	title: string
	year: number
	status: 'continuing' | 'ended'
	network: string | null
	overview: string | null
	posterUrl: string | null
	backdropUrl: string | null
	genres: string | null
	runtimeMins: number | null
	contentRating: string | null
	monitored: boolean | null
	resolution: '480p' | '720p' | '1080p' | '2160p' | null
	dateAdded: string
	nextAiring: string | null
	lastInfoSync: string | null
	rtId: string | null
	rtVanity: string | null
	alternateTitles: string | null
	useYearInFolder: boolean | null
	sizeBytes: number
	episodeCount: number
	missingEpisodeCount: number
	seasons: SeasonDetails[]
}

// Pure function matching findSeriesWithDetails logic - testable with any db
async function findSeriesWithDetailsCore(database: TestDb, seriesId: number): Promise<SeriesDetails | null> {
	// Get series with stats - using raw SQL like the actual implementation
	const seriesRows = await database.all<schemaTypes.Series & { sizeBytes: number; episodeCount: number; missingEpisodeCount: number }>(sql`
		SELECT
			s.id,
			s.tvdb_id as tvdbId,
			s.tmdb_id as tmdbId,
			s.imdb_id as imdbId,
			s.title,
			s.year,
			s.status,
			s.network,
			s.overview,
			s.poster_url as posterUrl,
			s.backdrop_url as backdropUrl,
			s.genres,
			s.runtime_mins as runtimeMins,
			s.content_rating as contentRating,
			s.monitored,
			s.resolution,
			s.date_added as dateAdded,
			s.next_airing as nextAiring,
			s.last_info_sync as lastInfoSync,
			s.rt_id as rtId,
			s.rt_vanity as rtVanity,
			s.alternate_titles as alternateTitles,
			s.use_year_in_folder as useYearInFolder,
			COALESCE(file_stats.size_bytes, 0) as sizeBytes,
			COALESCE(ep_stats.episode_count, 0) as episodeCount,
			COALESCE(ep_stats.missing_episode_count, 0) as missingEpisodeCount
		FROM series s
		LEFT JOIN (
			SELECT series_id, SUM(size) as size_bytes
			FROM files
			WHERE is_deleted = 0 AND series_id IS NOT NULL
			GROUP BY series_id
		) file_stats ON file_stats.series_id = s.id
		LEFT JOIN (
			SELECT
				sea.series_id,
				COUNT(*) as episode_count,
				SUM(CASE WHEN ef.episode_id IS NULL THEN 1 ELSE 0 END) as missing_episode_count
			FROM episodes e
			INNER JOIN seasons sea ON e.season_id = sea.id
			LEFT JOIN (
				SELECT DISTINCT episode_id FROM files WHERE is_deleted = 0 AND episode_id IS NOT NULL
			) ef ON ef.episode_id = e.id
			WHERE e.monitored = 1
			GROUP BY sea.series_id
		) ep_stats ON ep_stats.series_id = s.id
		WHERE s.id = ${seriesId}
	`)

	if (!seriesRows.length) return null
	const seriesRow = seriesRows[0]

	// Get seasons
	const seasonsData = await database.select().from(schema.seasons).where(eq(schema.seasons.seriesId, seriesId))

	// Get episodes for all seasons
	const seasonIds = seasonsData.map((s) => s.id)
	const episodesData = seasonIds.length > 0 ? await database.select().from(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds)) : []

	// Get files for all episodes
	const episodeIds = episodesData.map((e) => e.id)
	const filesData = episodeIds.length > 0 ? await database.select().from(schema.files).where(sql`${schema.files.episodeId} IN ${episodeIds} AND ${schema.files.isDeleted} = 0`) : []

	// Build file map: episodeId -> files[]
	const filesByEpisode = new Map<number, typeof filesData>()
	for (const file of filesData) {
		if (!file.episodeId) continue
		const existing = filesByEpisode.get(file.episodeId) ?? []
		existing.push(file)
		filesByEpisode.set(file.episodeId, existing)
	}

	// Build episode map: seasonId -> episodes[]
	const episodesBySeason = new Map<number, EpisodeDetails[]>()
	for (const episode of episodesData) {
		if (!episode.seasonId) continue
		const existing = episodesBySeason.get(episode.seasonId) ?? []
		existing.push({
			...episode,
			files: filesByEpisode.get(episode.id) ?? [],
		})
		episodesBySeason.set(episode.seasonId, existing)
	}

	// Build seasons with nested episodes
	const seasons: SeasonDetails[] = seasonsData.map((season) => ({
		...season,
		episodes: episodesBySeason.get(season.id) ?? [],
	}))

	return {
		...seriesRow,
		seasons,
	}
}

describe('findSeriesWithDetails - complex query with joins', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	it('returns null for non-existent series', async () => {
		const result = await findSeriesWithDetailsCore(db, 999)
		expect(result).toBeNull()
	})

	it('returns series with empty seasons array when no seasons exist', async () => {
		const now = new Date().toISOString()
		db.insert(schema.series)
			.values({
				id: 1,
				tmdbId: 1396,
				title: 'Breaking Bad',
				year: 2008,
				status: 'ended',
				dateAdded: now,
			})
			.run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result).not.toBeNull()
		expect(result!.title).toBe('Breaking Bad')
		expect(result!.seasons).toHaveLength(0)
		expect(result!.sizeBytes).toBe(0)
		expect(result!.episodeCount).toBe(0)
		expect(result!.missingEpisodeCount).toBe(0)
	})

	it('returns series with nested seasons and episodes', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons)
			.values([
				{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
				{ id: 2, seriesId: 1, seasonNumber: 2, monitored: true },
			])
			.run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Episode 2', monitored: true },
				{ id: 3, seasonId: 2, episodeNumber: 1, title: 'S02E01', monitored: true },
			])
			.run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result).not.toBeNull()
		expect(result!.seasons).toHaveLength(2)

		const season1 = result!.seasons.find((s) => s.seasonNumber === 1)
		const season2 = result!.seasons.find((s) => s.seasonNumber === 2)

		expect(season1?.episodes).toHaveLength(2)
		expect(season2?.episodes).toHaveLength(1)
		expect(season1?.episodes.map((e) => e.title)).toContain('Pilot')
		expect(season1?.episodes.map((e) => e.title)).toContain('Episode 2')
		expect(season2?.episodes[0].title).toBe('S02E01')
	})

	it('includes files nested within episodes', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true }).run()
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.srt', size: 50000, quality: '1080p', dateImported: now, isDeleted: false },
			])
			.run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result).not.toBeNull()
		const episode = result!.seasons[0].episodes[0]
		expect(episode.files).toHaveLength(2)
		expect(episode.files.map((f) => f.path)).toContain('/tv/BB/S01E01.mkv')
		expect(episode.files.map((f) => f.path)).toContain('/tv/BB/S01E01.srt')
	})

	it('excludes deleted files from episode file list', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true }).run()
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.old.mkv', size: 1000000000, quality: '720p', dateImported: now, isDeleted: true },
			])
			.run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result).not.toBeNull()
		const episode = result!.seasons[0].episodes[0]
		expect(episode.files).toHaveLength(1)
		expect(episode.files[0].path).toBe('/tv/BB/S01E01.mkv')
	})

	it('calculates sizeBytes correctly from all series files', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'S01E01', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'S01E02', monitored: true },
			])
			.run()
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 1, episodeId: 2, path: '/tv/BB/S01E02.mkv', size: 1600000000, quality: '1080p', dateImported: now, isDeleted: false },
			])
			.run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result!.sizeBytes).toBe(1500000000 + 1600000000)
	})

	it('excludes deleted files from sizeBytes calculation', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'S01E01', monitored: true }).run()
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.old.mkv', size: 1000000000, quality: '720p', dateImported: now, isDeleted: true },
			])
			.run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result!.sizeBytes).toBe(1500000000)
	})

	it('calculates episodeCount from monitored episodes only', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'S01E01', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'S01E02', monitored: true },
				{ id: 3, seasonId: 1, episodeNumber: 3, title: 'S01E03', monitored: false },
			])
			.run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result!.episodeCount).toBe(2) // Only monitored episodes
	})

	it('calculates missingEpisodeCount correctly', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'S01E01', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'S01E02', monitored: true },
				{ id: 3, seasonId: 1, episodeNumber: 3, title: 'S01E03', monitored: true },
			])
			.run()
		// Only episode 1 has a file
		db.insert(schema.files).values({ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false }).run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result!.episodeCount).toBe(3)
		expect(result!.missingEpisodeCount).toBe(2) // Episodes 2 and 3 are missing
	})

	it('returns all series fields correctly mapped', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series)
			.values({
				id: 1,
				tmdbId: 1396,
				tvdbId: 81189,
				imdbId: 'tt0903747',
				title: 'Breaking Bad',
				year: 2008,
				status: 'ended',
				network: 'AMC',
				overview: 'A chemistry teacher turned meth producer.',
				posterUrl: 'https://image.tmdb.org/poster.jpg',
				backdropUrl: 'https://image.tmdb.org/backdrop.jpg',
				genres: JSON.stringify(['Drama', 'Crime']),
				runtimeMins: 45,
				contentRating: 'TV-MA',
				monitored: true,
				resolution: '1080p',
				dateAdded: now,
				nextAiring: '2030-01-01',
				lastInfoSync: now,
				rtId: 'breaking_bad',
				rtVanity: 'breaking-bad',
				alternateTitles: JSON.stringify(['Breaking Bad - A Química do Mal']),
				useYearInFolder: true,
			})
			.run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result).not.toBeNull()
		expect(result!.tmdbId).toBe(1396)
		expect(result!.tvdbId).toBe(81189)
		expect(result!.imdbId).toBe('tt0903747')
		expect(result!.title).toBe('Breaking Bad')
		expect(result!.year).toBe(2008)
		expect(result!.status).toBe('ended')
		expect(result!.network).toBe('AMC')
		expect(result!.overview).toBe('A chemistry teacher turned meth producer.')
		expect(result!.posterUrl).toBe('https://image.tmdb.org/poster.jpg')
		expect(result!.backdropUrl).toBe('https://image.tmdb.org/backdrop.jpg')
		expect(result!.genres).toBe(JSON.stringify(['Drama', 'Crime']))
		expect(result!.runtimeMins).toBe(45)
		expect(result!.contentRating).toBe('TV-MA')
		expect(result!.monitored).toBeTruthy()
		expect(result!.resolution).toBe('1080p')
		expect(result!.nextAiring).toBe('2030-01-01')
		expect(result!.rtId).toBe('breaking_bad')
		expect(result!.rtVanity).toBe('breaking-bad')
		expect(result!.alternateTitles).toBe(JSON.stringify(['Breaking Bad - A Química do Mal']))
		expect(result!.useYearInFolder).toBeTruthy()
	})

	it('handles series with multiple seasons across multiple series', async () => {
		const now = new Date().toISOString()

		// Insert two series
		db.insert(schema.series)
			.values([
				{ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now },
				{ id: 2, tmdbId: 1399, title: 'Game of Thrones', year: 2011, status: 'ended', dateAdded: now },
			])
			.run()

		// Insert seasons for both
		db.insert(schema.seasons)
			.values([
				{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
				{ id: 2, seriesId: 2, seasonNumber: 1, monitored: true },
			])
			.run()

		// Insert episodes for both
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'BB Pilot', monitored: true },
				{ id: 2, seasonId: 2, episodeNumber: 1, title: 'GOT Pilot', monitored: true },
			])
			.run()

		// Insert files for both
		db.insert(schema.files)
			.values([
				{ id: 1, seriesId: 1, episodeId: 1, path: '/tv/BB/S01E01.mkv', size: 1500000000, quality: '1080p', dateImported: now, isDeleted: false },
				{ id: 2, seriesId: 2, episodeId: 2, path: '/tv/GOT/S01E01.mkv', size: 2000000000, quality: '1080p', dateImported: now, isDeleted: false },
			])
			.run()

		// Get series 1 (Breaking Bad)
		const result1 = await findSeriesWithDetailsCore(db, 1)

		expect(result1).not.toBeNull()
		expect(result1!.title).toBe('Breaking Bad')
		expect(result1!.seasons).toHaveLength(1)
		expect(result1!.seasons[0].episodes).toHaveLength(1)
		expect(result1!.seasons[0].episodes[0].title).toBe('BB Pilot')
		expect(result1!.seasons[0].episodes[0].files).toHaveLength(1)
		expect(result1!.sizeBytes).toBe(1500000000)

		// Get series 2 (Game of Thrones)
		const result2 = await findSeriesWithDetailsCore(db, 2)

		expect(result2).not.toBeNull()
		expect(result2!.title).toBe('Game of Thrones')
		expect(result2!.seasons).toHaveLength(1)
		expect(result2!.seasons[0].episodes).toHaveLength(1)
		expect(result2!.seasons[0].episodes[0].title).toBe('GOT Pilot')
		expect(result2!.seasons[0].episodes[0].files).toHaveLength(1)
		expect(result2!.sizeBytes).toBe(2000000000)
	})

	it('returns episodes with empty files array when no files exist', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
		db.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Pilot', monitored: true }).run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result).not.toBeNull()
		const episode = result!.seasons[0].episodes[0]
		expect(episode.files).toHaveLength(0)
	})

	it('handles episodes across multiple seasons correctly', async () => {
		const now = new Date().toISOString()

		db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Breaking Bad', year: 2008, status: 'ended', dateAdded: now }).run()
		db.insert(schema.seasons)
			.values([
				{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
				{ id: 2, seriesId: 1, seasonNumber: 2, monitored: true },
				{ id: 3, seriesId: 1, seasonNumber: 3, monitored: false },
			])
			.run()
		db.insert(schema.episodes)
			.values([
				{ id: 1, seasonId: 1, episodeNumber: 1, title: 'S01E01', monitored: true },
				{ id: 2, seasonId: 1, episodeNumber: 2, title: 'S01E02', monitored: true },
				{ id: 3, seasonId: 2, episodeNumber: 1, title: 'S02E01', monitored: true },
				{ id: 4, seasonId: 2, episodeNumber: 2, title: 'S02E02', monitored: true },
				{ id: 5, seasonId: 3, episodeNumber: 1, title: 'S03E01', monitored: true },
			])
			.run()

		const result = await findSeriesWithDetailsCore(db, 1)

		expect(result!.seasons).toHaveLength(3)

		const s1 = result!.seasons.find((s) => s.seasonNumber === 1)
		const s2 = result!.seasons.find((s) => s.seasonNumber === 2)
		const s3 = result!.seasons.find((s) => s.seasonNumber === 3)

		expect(s1?.episodes).toHaveLength(2)
		expect(s2?.episodes).toHaveLength(2)
		expect(s3?.episodes).toHaveLength(1)
		expect(s1?.monitored).toBe(true)
		expect(s2?.monitored).toBe(true)
		expect(s3?.monitored).toBe(false)
	})
})

describe('findSeriesWithDetails - property-based tests', () => {
	const arbSeriesData = fc.record({
		tmdbId: fc.integer({ min: 1, max: 999999 }),
		title: fc.string({ minLength: 1, maxLength: 100 }),
		year: fc.integer({ min: 1950, max: 2030 }),
		status: fc.constantFrom('continuing', 'ended') as fc.Arbitrary<'continuing' | 'ended'>,
	})

	it('returns consistent episode counts between top-level and nested data', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesData, fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 5 }), async (seriesData, seasonCount, episodesPerSeason) => {
				const db = await setupTestDb()
				const now = new Date().toISOString()

				db.insert(schema.series)
					.values({ ...seriesData, id: 1, dateAdded: now })
					.run()

				// Create seasons
				for (let s = 1; s <= seasonCount; s++) {
					db.insert(schema.seasons).values({ id: s, seriesId: 1, seasonNumber: s, monitored: true }).run()

					// Create episodes for this season
					for (let e = 1; e <= episodesPerSeason; e++) {
						const epId = (s - 1) * episodesPerSeason + e
						db.insert(schema.episodes)
							.values({ id: epId, seasonId: s, episodeNumber: e, title: `S${s}E${e}`, monitored: true })
							.run()
					}
				}

				const result = await findSeriesWithDetailsCore(db, 1)

				// Count episodes from nested structure
				const nestedEpisodeCount = result!.seasons.reduce((sum, season) => sum + season.episodes.length, 0)

				expect(result!.episodeCount).toBe(nestedEpisodeCount)
			}),
		)
	})

	it('sizeBytes equals sum of all non-deleted files', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesData, fc.array(fc.integer({ min: 0, max: 5000000000 }), { minLength: 0, maxLength: 10 }), async (seriesData, fileSizes) => {
				const db = await setupTestDb()
				const now = new Date().toISOString()

				db.insert(schema.series)
					.values({ ...seriesData, id: 1, dateAdded: now })
					.run()

				for (let i = 0; i < fileSizes.length; i++) {
					db.insert(schema.files)
						.values({
							id: i + 1,
							seriesId: 1,
							path: `/tv/file${i}.mkv`,
							size: fileSizes[i],
							quality: '1080p',
							dateImported: now,
							isDeleted: false,
						})
						.run()
				}

				const result = await findSeriesWithDetailsCore(db, 1)
				const expectedSize = fileSizes.reduce((sum, s) => sum + s, 0)

				expect(result!.sizeBytes).toBe(expectedSize)
			}),
		)
	})

	it('missingEpisodeCount is never greater than episodeCount', async () => {
		await fc.assert(
			fc.asyncProperty(arbSeriesData, fc.integer({ min: 1, max: 10 }), fc.integer({ min: 0, max: 10 }), async (seriesData, episodeCount, filesCount) => {
				const db = await setupTestDb()
				const now = new Date().toISOString()

				db.insert(schema.series)
					.values({ ...seriesData, id: 1, dateAdded: now })
					.run()
				db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()

				// Create episodes
				for (let i = 0; i < episodeCount; i++) {
					db.insert(schema.episodes)
						.values({ id: i + 1, seasonId: 1, episodeNumber: i + 1, title: `Ep ${i + 1}`, monitored: true })
						.run()
				}

				// Create files for some episodes
				const actualFilesCount = Math.min(filesCount, episodeCount)
				for (let i = 0; i < actualFilesCount; i++) {
					db.insert(schema.files)
						.values({
							id: i + 1,
							seriesId: 1,
							episodeId: i + 1,
							path: `/tv/S01E${i + 1}.mkv`,
							size: 1000000000,
							quality: '1080p',
							dateImported: now,
							isDeleted: false,
						})
						.run()
				}

				const result = await findSeriesWithDetailsCore(db, 1)

				expect(result!.missingEpisodeCount).toBeLessThanOrEqual(result!.episodeCount)
				expect(result!.missingEpisodeCount).toBe(episodeCount - actualFilesCount)
			}),
		)
	})
})

// --- Monitoring State Propagation Tests ---

// Pure function for updating season monitored status - mirrors updateSeason logic
async function updateSeasonCore(database: BunSQLiteDatabase<typeof schema>, seasonId: number, monitored: boolean): Promise<typeof schema.seasons.$inferSelect> {
	const existing = await database.select().from(schema.seasons).where(eq(schema.seasons.id, seasonId))
	if (!existing.length) {
		throw new Error('Season not found')
	}

	// Update season
	const [updated] = await database.update(schema.seasons).set({ monitored }).where(eq(schema.seasons.id, seasonId)).returning()

	// Also update all episodes in this season
	await database.update(schema.episodes).set({ monitored }).where(eq(schema.episodes.seasonId, seasonId))

	return updated
}

// Pure function for updating episode monitored status - mirrors updateEpisode logic
async function updateEpisodeCore(database: BunSQLiteDatabase<typeof schema>, episodeId: number, monitored: boolean): Promise<typeof schema.episodes.$inferSelect> {
	const existing = await database.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId))
	if (!existing.length) {
		throw new Error('Episode not found')
	}

	const [updated] = await database.update(schema.episodes).set({ monitored }).where(eq(schema.episodes.id, episodeId)).returning()

	return updated
}

describe('Season/Episode Monitoring State Propagation', () => {
	let db: TestDb

	beforeEach(async () => {
		db = await setupTestDb()
	})

	describe('updateSeasonCore', () => {
		it('propagates monitored=false from season to all its episodes', async () => {
			const now = new Date().toISOString()

			db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Test', year: 2020, status: 'ended', dateAdded: now }).run()
			db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
			db.insert(schema.episodes)
				.values([
					{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Ep1', monitored: true },
					{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Ep2', monitored: true },
					{ id: 3, seasonId: 1, episodeNumber: 3, title: 'Ep3', monitored: true },
				])
				.run()

			const updated = await updateSeasonCore(db, 1, false)
			expect(updated.monitored).toBe(false)

			const episodes = await db.select().from(schema.episodes).where(eq(schema.episodes.seasonId, 1))
			expect(episodes.every((e) => e.monitored === false)).toBe(true)
		})

		it('propagates monitored=true from season to all its episodes', async () => {
			const now = new Date().toISOString()

			db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Test', year: 2020, status: 'ended', dateAdded: now }).run()
			db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: false }).run()
			db.insert(schema.episodes)
				.values([
					{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Ep1', monitored: false },
					{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Ep2', monitored: false },
					{ id: 3, seasonId: 1, episodeNumber: 3, title: 'Ep3', monitored: false },
				])
				.run()

			const updated = await updateSeasonCore(db, 1, true)
			expect(updated.monitored).toBe(true)

			const episodes = await db.select().from(schema.episodes).where(eq(schema.episodes.seasonId, 1))
			expect(episodes.every((e) => e.monitored === true)).toBe(true)
		})

		it('does not affect episodes in other seasons', async () => {
			const now = new Date().toISOString()

			db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Test', year: 2020, status: 'ended', dateAdded: now }).run()
			db.insert(schema.seasons)
				.values([
					{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
					{ id: 2, seriesId: 1, seasonNumber: 2, monitored: true },
				])
				.run()
			db.insert(schema.episodes)
				.values([
					{ id: 1, seasonId: 1, episodeNumber: 1, title: 'S1E1', monitored: true },
					{ id: 2, seasonId: 1, episodeNumber: 2, title: 'S1E2', monitored: true },
					{ id: 3, seasonId: 2, episodeNumber: 1, title: 'S2E1', monitored: true },
					{ id: 4, seasonId: 2, episodeNumber: 2, title: 'S2E2', monitored: true },
				])
				.run()

			await updateSeasonCore(db, 1, false)

			const s1Episodes = await db.select().from(schema.episodes).where(eq(schema.episodes.seasonId, 1))
			const s2Episodes = await db.select().from(schema.episodes).where(eq(schema.episodes.seasonId, 2))

			expect(s1Episodes.every((e) => e.monitored === false)).toBe(true)
			expect(s2Episodes.every((e) => e.monitored === true)).toBe(true)
		})

		it('throws error for non-existent season', async () => {
			await expect(updateSeasonCore(db, 999, false)).rejects.toThrow('Season not found')
		})

		it('handles season with no episodes gracefully', async () => {
			const now = new Date().toISOString()

			db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Test', year: 2020, status: 'ended', dateAdded: now }).run()
			db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()

			const updated = await updateSeasonCore(db, 1, false)
			expect(updated.monitored).toBe(false)

			const episodes = await db.select().from(schema.episodes).where(eq(schema.episodes.seasonId, 1))
			expect(episodes.length).toBe(0)
		})

		it('season monitored state propagates to episodes consistently (property-based)', async () => {
			await fc.assert(
				fc.asyncProperty(fc.boolean(), async (newState) => {
					const localDb = await setupTestDb()
					const now = new Date().toISOString()

					localDb.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Test', year: 2020, status: 'ended', dateAdded: now }).run()
					localDb.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: !newState }).run()
					localDb
						.insert(schema.episodes)
						.values([
							{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Ep1', monitored: !newState },
							{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Ep2', monitored: !newState },
						])
						.run()

					await updateSeasonCore(localDb, 1, newState)

					const season = (await localDb.select().from(schema.seasons).where(eq(schema.seasons.id, 1)))[0]
					const episodes = await localDb.select().from(schema.episodes).where(eq(schema.episodes.seasonId, 1))

					expect(season.monitored).toBe(newState)
					expect(episodes.every((e) => e.monitored === newState)).toBe(true)
				}),
			)
		})
	})

	describe('updateEpisodeCore', () => {
		it('updates individual episode monitored state without affecting others', async () => {
			const now = new Date().toISOString()

			db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Test', year: 2020, status: 'ended', dateAdded: now }).run()
			db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
			db.insert(schema.episodes)
				.values([
					{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Ep1', monitored: true },
					{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Ep2', monitored: true },
				])
				.run()

			await updateEpisodeCore(db, 1, false)

			const ep1 = (await db.select().from(schema.episodes).where(eq(schema.episodes.id, 1)))[0]
			const ep2 = (await db.select().from(schema.episodes).where(eq(schema.episodes.id, 2)))[0]

			expect(ep1.monitored).toBe(false)
			expect(ep2.monitored).toBe(true)
		})

		it('throws error for non-existent episode', async () => {
			await expect(updateEpisodeCore(db, 999, false)).rejects.toThrow('Episode not found')
		})

		it('episode monitored state updates correctly (property-based)', async () => {
			await fc.assert(
				fc.asyncProperty(fc.boolean(), async (newState) => {
					const localDb = await setupTestDb()
					const now = new Date().toISOString()

					localDb.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Test', year: 2020, status: 'ended', dateAdded: now }).run()
					localDb.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: true }).run()
					localDb.insert(schema.episodes).values({ id: 1, seasonId: 1, episodeNumber: 1, title: 'Ep1', monitored: !newState }).run()

					const updated = await updateEpisodeCore(localDb, 1, newState)

					expect(updated.monitored).toBe(newState)
				}),
			)
		})
	})

	describe('monitoring state propagation integration', () => {
		it('unmonitoring season updates episode count calculations', async () => {
			const now = new Date().toISOString()

			db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Test', year: 2020, status: 'ended', dateAdded: now }).run()
			db.insert(schema.seasons)
				.values([
					{ id: 1, seriesId: 1, seasonNumber: 1, monitored: true },
					{ id: 2, seriesId: 1, seasonNumber: 2, monitored: true },
				])
				.run()
			db.insert(schema.episodes)
				.values([
					{ id: 1, seasonId: 1, episodeNumber: 1, title: 'S1E1', monitored: true },
					{ id: 2, seasonId: 1, episodeNumber: 2, title: 'S1E2', monitored: true },
					{ id: 3, seasonId: 2, episodeNumber: 1, title: 'S2E1', monitored: true },
					{ id: 4, seasonId: 2, episodeNumber: 2, title: 'S2E2', monitored: true },
				])
				.run()

			// Before: all 4 episodes monitored -> 4 missing
			const beforeStats = await listSeriesCore(db)
			expect(beforeStats[0].episodeCount).toBe(4)
			expect(beforeStats[0].missingEpisodeCount).toBe(4)

			// Unmonitor season 1
			await updateSeasonCore(db, 1, false)

			// After: only 2 episodes monitored (season 2) -> 2 missing
			const afterStats = await listSeriesCore(db)
			expect(afterStats[0].episodeCount).toBe(2)
			expect(afterStats[0].missingEpisodeCount).toBe(2)
		})

		it('monitoring season propagates to episodes affecting counts', async () => {
			const now = new Date().toISOString()

			db.insert(schema.series).values({ id: 1, tmdbId: 1396, title: 'Test', year: 2020, status: 'ended', dateAdded: now }).run()
			db.insert(schema.seasons).values({ id: 1, seriesId: 1, seasonNumber: 1, monitored: false }).run()
			db.insert(schema.episodes)
				.values([
					{ id: 1, seasonId: 1, episodeNumber: 1, title: 'Ep1', monitored: false },
					{ id: 2, seasonId: 1, episodeNumber: 2, title: 'Ep2', monitored: false },
				])
				.run()

			// Before: no monitored episodes
			const beforeStats = await listSeriesCore(db)
			expect(beforeStats[0].episodeCount).toBe(0)

			// Monitor season
			await updateSeasonCore(db, 1, true)

			// After: 2 monitored episodes
			const afterStats = await listSeriesCore(db)
			expect(afterStats[0].episodeCount).toBe(2)
			expect(afterStats[0].missingEpisodeCount).toBe(2)
		})
	})
})
