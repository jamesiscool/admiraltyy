import { zValidator } from '@hono/zod-validator'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { fetchSeriesPreview, fetchSeriesWithEpisodes } from '../api/tmdb'
import { db, schema } from '../db'
import { type Episode, type File, resolutions, type Season, type Series } from '../db/schema'
import { logInfo } from '../log/logs'

const idParamSchema = z.object({ id: z.string() })
const tmdbIdParamSchema = z.object({ tmdbId: z.string() })
const addSeriesSchema = z.object({
	tmdbId: z.number(),
	resolution: z.enum(resolutions).optional(),
	monitoredSeasons: z.array(z.number()),
})
const deleteQuerySchema = z.object({ deleteFiles: z.string().optional() })

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

// --- Query functions ---

// List all series with computed stats (for list page)
async function listSeriesPreviews(): Promise<SeriesPreview[]> {
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
}

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

export const seriesRoutes = new Hono()
	// GET /api/series - List all series (preview data for list page)
	.get('/', async (c) => {
		const previews = await listSeriesPreviews()
		return c.json(previews)
	})
	// GET /api/series/tmdb/:tmdbId - Preview series from TMDB (for add dialog)
	.get('/tmdb/:tmdbId', zValidator('param', tmdbIdParamSchema), async (c) => {
		const { tmdbId } = c.req.valid('param')
		const numId = parseInt(tmdbId, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid TMDB ID' })
		}
		try {
			const preview = await fetchSeriesPreview(numId)
			return c.json(preview)
		} catch {
			throw new HTTPException(500, { message: 'Failed to fetch series from TMDB' })
		}
	})
	// GET /api/series/:id - Get single series with nested seasons/episodes/files
	.get('/:id', zValidator('param', idParamSchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid series ID' })
		}
		const seriesWithDetails = await findSeriesWithDetails(numId)
		if (!seriesWithDetails) {
			throw new HTTPException(404, { message: 'Series not found' })
		}
		return c.json(seriesWithDetails)
	})
	// POST /api/series - Create a new series with seasons and episodes
	.post('/', zValidator('json', addSeriesSchema), async (c) => {
		const body = c.req.valid('json')

		// Check if series already exists
		const existing = await db.select().from(schema.series).where(eq(schema.series.tmdbId, body.tmdbId))
		if (existing.length > 0) {
			throw new HTTPException(409, { message: 'Series already exists' })
		}

		// Fetch full series data with episodes for monitored seasons
		const monitoredSeasons = body.monitoredSeasons ?? []
		const details = await fetchSeriesWithEpisodes(body.tmdbId, monitoredSeasons)
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
				resolution: body.resolution ?? '1080p',
				dateAdded: now,
				nextAiring,
				lastInfoSync: now,
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

		return c.json(insertedSeries)
	})
	// PUT /api/series/:id - Update a series
	.put('/:id', zValidator('param', idParamSchema), zValidator('json', z.object({ monitored: z.boolean() })), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid series ID' })
		}

		const body = c.req.valid('json')
		const existing = await db.select().from(schema.series).where(eq(schema.series.id, numId))
		if (!existing.length) {
			throw new HTTPException(404, { message: 'Series not found' })
		}

		const [updated] = await db.update(schema.series).set({ monitored: body.monitored }).where(eq(schema.series.id, numId)).returning()

		return c.json(updated)
	})
	// PUT /api/series/:id/seasons/:seasonId - Update a season
	.put('/:id/seasons/:seasonId', zValidator('param', z.object({ id: z.string(), seasonId: z.string() })), zValidator('json', z.object({ monitored: z.boolean() })), async (c) => {
		const { seasonId } = c.req.valid('param')
		const numId = parseInt(seasonId, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid season ID' })
		}

		const body = c.req.valid('json')
		const existing = await db.select().from(schema.seasons).where(eq(schema.seasons.id, numId))
		if (!existing.length) {
			throw new HTTPException(404, { message: 'Season not found' })
		}

		// Update season
		const [updated] = await db.update(schema.seasons).set({ monitored: body.monitored }).where(eq(schema.seasons.id, numId)).returning()

		// Also update all episodes in this season
		await db.update(schema.episodes).set({ monitored: body.monitored }).where(eq(schema.episodes.seasonId, numId))

		return c.json(updated)
	})
	// PUT /api/series/:id/episodes/:episodeId - Update an episode
	.put('/:id/episodes/:episodeId', zValidator('param', z.object({ id: z.string(), episodeId: z.string() })), zValidator('json', z.object({ monitored: z.boolean() })), async (c) => {
		const { episodeId } = c.req.valid('param')
		const numId = parseInt(episodeId, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid episode ID' })
		}

		const body = c.req.valid('json')
		const existing = await db.select().from(schema.episodes).where(eq(schema.episodes.id, numId))
		if (!existing.length) {
			throw new HTTPException(404, { message: 'Episode not found' })
		}

		const [updated] = await db.update(schema.episodes).set({ monitored: body.monitored }).where(eq(schema.episodes.id, numId)).returning()

		return c.json(updated)
	})
	// DELETE /api/series/:id - Delete a series
	.delete('/:id', zValidator('param', idParamSchema), zValidator('query', deleteQuerySchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid series ID' })
		}

		const { deleteFiles } = c.req.valid('query')

		const seriesRecord = await db.select().from(schema.series).where(eq(schema.series.id, numId))
		if (!seriesRecord.length) {
			throw new HTTPException(404, { message: 'Series not found' })
		}

		// Get all seasons for this series
		const seasonsData = await db.select().from(schema.seasons).where(eq(schema.seasons.seriesId, numId))
		const seasonIds = seasonsData.map((s) => s.id)

		// Delete series folder from disk if requested
		if (deleteFiles === 'true') {
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
				const episodeReleases = await db.select({ id: schema.releases.id }).from(schema.releases).where(inArray(schema.releases.episodeId, episodeIds))
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

		return c.body(null, 204)
	})
