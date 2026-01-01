import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { fetchSeriesPreview, fetchSeriesWithEpisodes } from '../api/tmdb'
import { db, schema } from '../db'
import type { Resolution } from '../db/schema'

export const seriesRoutes = new Hono()
	// GET /api/series - List all series
	.get('/', async (c) => {
		const allSeries = await db.select().from(schema.series)
		return c.json({ data: allSeries, success: true as const })
	})
	// GET /api/series/tmdb/:tmdbId - Preview series from TMDB (for add dialog)
	.get('/tmdb/:tmdbId', async (c) => {
		const tmdbId = parseInt(c.req.param('tmdbId'), 10)
		if (Number.isNaN(tmdbId)) {
			return c.json({ success: false as const, error: 'Invalid TMDB ID' }, 400)
		}
		try {
			const preview = await fetchSeriesPreview(tmdbId)
			return c.json({ data: preview, success: true as const })
		} catch {
			return c.json({ success: false as const, error: 'Failed to fetch series from TMDB' }, 500)
		}
	})
	// GET /api/series/:id - Get a single series with seasons and episodes
	.get('/:id', async (c) => {
		const id = parseInt(c.req.param('id'), 10)
		if (Number.isNaN(id)) {
			return c.json({ success: false as const, error: 'Invalid series ID' }, 400)
		}
		const series = await db.select().from(schema.series).where(eq(schema.series.id, id))
		if (!series.length) {
			return c.json({ success: false as const, error: 'Series not found' }, 404)
		}
		return c.json({ data: series[0], success: true as const })
	})
	// POST /api/series - Create a new series with seasons and episodes
	.post('/', async (c) => {
		const body = await c.req.json<{
			tmdbId: number
			resolution?: Resolution
			monitoredSeasons: number[]
		}>()

		if (!body.tmdbId || typeof body.tmdbId !== 'number') {
			return c.json({ success: false as const, error: 'tmdbId is required' }, 400)
		}

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
	.put('/:id', async (c) => {
		// TODO: Implement series update
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// DELETE /api/series/:id - Delete a series
	.delete('/:id', async (c) => {
		// TODO: Implement series deletion
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
