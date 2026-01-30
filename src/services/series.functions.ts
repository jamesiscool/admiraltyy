import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolutions } from '@/db/schema'

export const listSeriesFn = createServerFn({ method: 'GET' }).handler(async () => {
	const { listSeriesFromDb } = await import('./series.server')
	return listSeriesFromDb()
})

export const getSeriesFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ seriesId: z.string() }))
	.handler(async ({ data }) => {
		const { getSeriesById } = await import('./series.server')
		return getSeriesById(data.seriesId)
	})

export const getSeriesPreviewFromTmdbFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ tmdbId: z.string() }))
	.handler(async ({ data }) => {
		const { getSeriesPreviewFromTmdb } = await import('./series.server')
		return getSeriesPreviewFromTmdb(data.tmdbId)
	})

export const createSeriesFn = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			tmdbId: z.number(),
			resolution: z.enum(resolutions).optional(),
			monitoredSeasons: z.array(z.number()),
		}),
	)
	.handler(async ({ data }) => {
		const { createSeries } = await import('./series.server')
		return createSeries(data)
	})

export const updateSeriesFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		const { updateSeries } = await import('./series.server')
		return updateSeries(data.seriesId, data.monitored)
	})

export const updateSeasonFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), seasonId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		const { updateSeason } = await import('./series.server')
		return updateSeason(data.seasonId, data.monitored)
	})

export const updateEpisodeFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), episodeId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		const { updateEpisode } = await import('./series.server')
		return updateEpisode(data.episodeId, data.monitored)
	})

export const deleteSeriesFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), deleteFiles: z.boolean().optional() }))
	.handler(async ({ data }) => {
		const { deleteSeries } = await import('./series.server')
		return deleteSeries(data.seriesId, data.deleteFiles)
	})
