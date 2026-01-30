import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolutions } from '@/db/schema'
import { createSeries, deleteSeries, getSeriesById, getSeriesPreviewFromTmdb, listSeriesFromDb, updateEpisode, updateSeason, updateSeries } from './series.server'

export const listSeriesFn = createServerFn({ method: 'GET' }).handler(async () => {
	return listSeriesFromDb()
})

export const getSeriesFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ seriesId: z.string() }))
	.handler(async ({ data }) => {
		return getSeriesById(data.seriesId)
	})

export const getSeriesPreviewFromTmdbFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ tmdbId: z.string() }))
	.handler(async ({ data }) => {
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
		return createSeries(data)
	})

export const updateSeriesFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		return updateSeries(data.seriesId, data.monitored)
	})

export const updateSeasonFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), seasonId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		return updateSeason(data.seasonId, data.monitored)
	})

export const updateEpisodeFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), episodeId: z.string(), monitored: z.boolean() }))
	.handler(async ({ data }) => {
		return updateEpisode(data.episodeId, data.monitored)
	})

export const deleteSeriesFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ seriesId: z.string(), deleteFiles: z.boolean().optional() }))
	.handler(async ({ data }) => {
		return deleteSeries(data.seriesId, data.deleteFiles)
	})
