import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolutions } from '@/db/schema'

export const listSeries = createServerFn({ method: 'GET' }).handler(async () => {
	const { listSeriesFromDb } = await import('./series.server')
	return listSeriesFromDb()
})

export const getSeries = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ seriesId: z.string() }))
	.handler(async ({ data }) => {
		const { getSeriesById } = await import('./series.server')
		return getSeriesById(data.seriesId)
	})

export const getSeriesPreviewFromTmdb = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ tmdbId: z.string() }))
	.handler(async ({ data }) => {
		const { getSeriesPreviewFromTmdbImpl } = await import('./series.server')
		return getSeriesPreviewFromTmdbImpl(data.tmdbId)
	})

export const createSeries = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			tmdbId: z.number(),
			resolution: z.enum(resolutions).optional(),
			monitoredSeasons: z.array(z.number()),
		}),
	)
	.handler(async ({ data }) => {
		const { createSeriesImpl } = await import('./series.server')
		return createSeriesImpl(data)
	})

export const updateSeries = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		const { updateSeriesImpl } = await import('./series.server')
		return updateSeriesImpl(data.seriesId, data.monitored)
	})

export const updateSeason = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), seasonId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		const { updateSeasonImpl } = await import('./series.server')
		return updateSeasonImpl(data.seasonId, data.monitored)
	})

export const updateEpisode = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), episodeId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		const { updateEpisodeImpl } = await import('./series.server')
		return updateEpisodeImpl(data.episodeId, data.monitored)
	})

export const deleteSeries = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), deleteFiles: z.boolean().optional() }))
	.handler(async ({ data }) => {
		const { deleteSeriesImpl } = await import('./series.server')
		return deleteSeriesImpl(data.seriesId, data.deleteFiles)
	})
