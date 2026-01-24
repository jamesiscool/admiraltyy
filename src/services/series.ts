import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/db'
import { type Episode, type File, resolutions, type Season, type Series } from '@/db/schema'
import { logInfo } from '@/services/logs'
import { checkNeedsYearDisambiguation, fetchSeriesPreview, fetchSeriesWithEpisodes } from '@/services/tmdb'

// --- Types for API responses ---

// Minimal series data for list page
export interface SeriesPreview {
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

// Nested types for detail page
export interface EpisodeWithFiles extends Episode {
	files: File[]
}

export interface SeasonWithEpisodes extends Season {
	episodes: EpisodeWithFiles[]
}

export interface SeriesWithDetails extends Series {
	sizeBytes: number
	episodeCount: number
	missingEpisodeCount: number
	seasons: SeasonWithEpisodes[]
}

// List all series with computed stats
export const listSeriesQueryOptions = () =>
	queryOptions({
		queryKey: ['series'],
		queryFn: () => listSeries(),
	})

export const listSeries = createServerFn({ method: 'GET' }).handler(async (): Promise<SeriesPreview[]> => {
	const results = await db.all<SeriesPreview>(sql`
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
	return results
})

// Get single series with full nested details
async function findSeriesWithDetails(seriesId: number): Promise<SeriesWithDetails | null> {
	// Get series with stats - explicitly alias columns to camelCase
	const seriesRows = await db.all<Series & { sizeBytes: number; episodeCount: number; missingEpisodeCount: number }>(sql`
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
	const seasonsData = await db.select().from(schema.seasons).where(eq(schema.seasons.seriesId, seriesId))

	// Get episodes for all seasons
	const seasonIds = seasonsData.map((s) => s.id)
	const episodesData = seasonIds.length > 0 ? await db.select().from(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds)) : []

	// Get files for all episodes
	const episodeIds = episodesData.map((e) => e.id)
	const filesData =
		episodeIds.length > 0
			? await db
					.select()
					.from(schema.files)
					.where(and(inArray(schema.files.episodeId, episodeIds), eq(schema.files.isDeleted, false)))
			: []

	// Build file map: episodeId -> files[]
	const filesByEpisode = new Map<number, File[]>()
	for (const file of filesData) {
		if (!file.episodeId) continue
		const existing = filesByEpisode.get(file.episodeId) ?? []
		existing.push(file)
		filesByEpisode.set(file.episodeId, existing)
	}

	// Build episode map: seasonId -> episodes[]
	const episodesBySeason = new Map<number, EpisodeWithFiles[]>()
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
	const seasons: SeasonWithEpisodes[] = seasonsData.map((season) => ({
		...season,
		episodes: episodesBySeason.get(season.id) ?? [],
	}))

	return {
		...seriesRow,
		seasons,
	}
}

// Get a single series
export const getSeriesOptions = (seriesId: string) =>
	queryOptions({
		queryKey: ['series', seriesId],
		queryFn: () => getSeries({ data: { seriesId } }),
	})

export const getSeries = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ seriesId: z.string() }))
	.handler(async ({ data }): Promise<SeriesWithDetails> => {
		const numId = parseInt(data.seriesId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid series ID')
		}
		const seriesWithDetails = await findSeriesWithDetails(numId)
		if (!seriesWithDetails) {
			throw new Error('Series not found')
		}
		return seriesWithDetails
	})

// Get series preview from TMDB
export const getSeriesPreviewFromTmdbOptions = (tmdbId: string) =>
	queryOptions({
		queryKey: ['series', 'tmdb-preview', tmdbId],
		queryFn: () => getSeriesPreviewFromTmdb({ data: { tmdbId } }),
	})

export const getSeriesPreviewFromTmdb = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ tmdbId: z.string() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.tmdbId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid TMDB ID')
		}
		const preview = await fetchSeriesPreview(numId)
		return preview
	})

// Create a new series
export const createSeries = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			tmdbId: z.number(),
			resolution: z.enum(resolutions).optional(),
			monitoredSeasons: z.array(z.number()),
		}),
	)
	.handler(async ({ data }) => {
		// Check if series already exists
		const existing = await db.select().from(schema.series).where(eq(schema.series.tmdbId, data.tmdbId))
		if (existing.length > 0) {
			throw new Error('Series already exists')
		}

		// Fetch full series data with episodes for monitored seasons
		const monitoredSeasons = data.monitoredSeasons ?? []
		const details = await fetchSeriesWithEpisodes(data.tmdbId, monitoredSeasons)
		const now = new Date().toISOString()

		// Check if other series share the same name (for folder disambiguation)
		const useYearInFolder = await checkNeedsYearDisambiguation(details.title, details.tmdbId)

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
		const [insertedSeries] = await db
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
				resolution: data.resolution ?? '1080p',
				dateAdded: now,
				nextAiring,
				lastInfoSync: now,
				useYearInFolder,
			})
			.returning()

		// Insert all seasons (with monitored flag based on selection)
		const monitoredSet = new Set(monitoredSeasons)
		for (const season of details.seasons) {
			const [insertedSeason] = await db
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
					await db.insert(schema.episodes).values({
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
	})

// Update a series
export const updateSeries = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.seriesId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid series ID')
		}

		const existing = await db.select().from(schema.series).where(eq(schema.series.id, numId))
		if (!existing.length) {
			throw new Error('Series not found')
		}

		const [updated] = await db.update(schema.series).set({ monitored: data.monitored }).where(eq(schema.series.id, numId)).returning()

		return updated
	})

// Update a season
export const updateSeason = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), seasonId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.seasonId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid season ID')
		}

		const existing = await db.select().from(schema.seasons).where(eq(schema.seasons.id, numId))
		if (!existing.length) {
			throw new Error('Season not found')
		}

		// Update season
		const [updated] = await db.update(schema.seasons).set({ monitored: data.monitored }).where(eq(schema.seasons.id, numId)).returning()

		// Also update all episodes in this season
		await db.update(schema.episodes).set({ monitored: data.monitored }).where(eq(schema.episodes.seasonId, numId))

		return updated
	})

// Update an episode
export const updateEpisode = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), episodeId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.episodeId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid episode ID')
		}

		const existing = await db.select().from(schema.episodes).where(eq(schema.episodes.id, numId))
		if (!existing.length) {
			throw new Error('Episode not found')
		}

		const [updated] = await db.update(schema.episodes).set({ monitored: data.monitored }).where(eq(schema.episodes.id, numId)).returning()

		return updated
	})

// Delete a series
export const deleteSeries = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), deleteFiles: z.boolean().optional() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.seriesId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid series ID')
		}

		const seriesRecord = await db.select().from(schema.series).where(eq(schema.series.id, numId))
		if (!seriesRecord.length) {
			throw new Error('Series not found')
		}

		// Get all seasons for this series
		const seasonsData = await db.select().from(schema.seasons).where(eq(schema.seasons.seriesId, numId))
		const seasonIds = seasonsData.map((s) => s.id)

		// Delete series folder from disk if requested
		if (data.deleteFiles) {
			// TODO: Implement actual folder deletion
			logInfo(`Would delete series folder for: ${seriesRecord[0].title}`)
		}

		if (seasonIds.length > 0) {
			// Get all episodes for these seasons
			const episodesData = await db.select().from(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds))
			const episodeIds = episodesData.map((e) => e.id)

			if (episodeIds.length > 0) {
				// Delete associated files from db
				await db.delete(schema.files).where(inArray(schema.files.episodeId, episodeIds))

				// Get releases for these episodes to delete their downloads
				const episodeReleases = await db.select().from(schema.releases).where(inArray(schema.releases.episodeId, episodeIds))
				for (const release of episodeReleases) {
					await db.delete(schema.downloads).where(eq(schema.downloads.releaseId, release.id))
				}

				// Delete releases
				await db.delete(schema.releases).where(inArray(schema.releases.episodeId, episodeIds))

				// Delete episodes
				await db.delete(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds))
			}

			// Delete seasons
			await db.delete(schema.seasons).where(eq(schema.seasons.seriesId, numId))
		}

		// Delete series
		await db.delete(schema.series).where(eq(schema.series.id, numId))

		return { success: true }
	})
