import { zValidator } from '@hono/zod-validator'
import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { fetchSeriesPreview, fetchSeriesWithEpisodes } from '../api/tmdb'
import { db, schema } from '../db'
import { resolutions } from '../db/schema'
import { logInfo } from '../log/logs'

const idParamSchema = z.object({ id: z.string() })
const tmdbIdParamSchema = z.object({ tmdbId: z.string() })
const addSeriesSchema = z.object({
	tmdbId: z.number(),
	resolution: z.enum(resolutions).optional(),
	monitoredSeasons: z.array(z.number()),
})
const deleteQuerySchema = z.object({ deleteFiles: z.string().optional() })

export const seriesRoutes = new Hono()
	// GET /api/series - List all series
	.get('/', async (c) => {
		const allSeries = await db.select().from(schema.series)
		return c.json({ data: allSeries, success: true as const })
	})
	// GET /api/series/tmdb/:tmdbId - Preview series from TMDB (for add dialog)
	.get('/tmdb/:tmdbId', zValidator('param', tmdbIdParamSchema), async (c) => {
		const { tmdbId } = c.req.valid('param')
		const numId = parseInt(tmdbId, 10)
		if (Number.isNaN(numId)) {
			return c.json({ success: false as const, error: 'Invalid TMDB ID' }, 400)
		}
		try {
			const preview = await fetchSeriesPreview(numId)
			return c.json({ data: preview, success: true as const })
		} catch {
			return c.json({ success: false as const, error: 'Failed to fetch series from TMDB' }, 500)
		}
	})
	// GET /api/series/:id - Get a single series with seasons and episodes
	.get('/:id', zValidator('param', idParamSchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			return c.json({ success: false as const, error: 'Invalid series ID' }, 400)
		}
		const series = await db.select().from(schema.series).where(eq(schema.series.id, numId))
		if (!series.length) {
			return c.json({ success: false as const, error: 'Series not found' }, 404)
		}
		// Mock file data
		const hasFiles = Math.random() < 0.5
		const fileSizeGb = hasFiles ? 2 + Math.random() * 198 : undefined
		return c.json({ data: { ...series[0], hasFiles, fileSizeGb }, success: true as const })
	})
	// POST /api/series - Create a new series with seasons and episodes
	.post('/', zValidator('json', addSeriesSchema), async (c) => {
		const body = c.req.valid('json')

		// Check if series already exists
		const existing = await db.select().from(schema.series).where(eq(schema.series.tmdbId, body.tmdbId))
		if (existing.length > 0) {
			return c.json({ success: false as const, error: 'Series already exists' }, 409)
		}

		// Fetch full series data with episodes for monitored seasons
		const monitoredSeasons = body.monitoredSeasons ?? []
		const details = await fetchSeriesWithEpisodes(body.tmdbId, monitoredSeasons)
		const now = new Date().toISOString()

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
				monitored: true,
				resolution: body.resolution ?? '1080p',
				dateAdded: now,
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

		return c.json({ success: true as const, data: insertedSeries })
	})
	// PUT /api/series/:id - Update a series
	.put('/:id', zValidator('param', idParamSchema), async (c) => {
		// TODO: Implement series update
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// DELETE /api/series/:id - Delete a series
	.delete('/:id', zValidator('param', idParamSchema), zValidator('query', deleteQuerySchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			return c.json({ success: false as const, error: 'Invalid series ID' }, 400)
		}

		const { deleteFiles } = c.req.valid('query')

		const seriesRecord = await db.select().from(schema.series).where(eq(schema.series.id, numId))
		if (!seriesRecord.length) {
			return c.json({ success: false as const, error: 'Series not found' }, 404)
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

				// Delete associated downloads
				await db.delete(schema.downloads).where(inArray(schema.downloads.episodeId, episodeIds))

				// Delete episodes
				await db.delete(schema.episodes).where(inArray(schema.episodes.seasonId, seasonIds))
			}

			// Delete seasons
			await db.delete(schema.seasons).where(eq(schema.seasons.seriesId, numId))
		}

		// Delete series
		await db.delete(schema.series).where(eq(schema.series.id, numId))

		return c.json({ success: true as const })
	})
