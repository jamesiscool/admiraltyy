import { queryOptions } from '@tanstack/react-query'
import { getSeriesFn, getSeriesPreviewFromTmdbFn, listSeriesFn } from '@/services/series.functions'

export const listSeriesQueryOptions = () =>
	queryOptions({
		queryKey: ['series'],
		queryFn: () => listSeriesFn(),
	})

export const getSeriesOptions = (seriesId: string) =>
	queryOptions({
		queryKey: ['series', seriesId],
		queryFn: () => getSeriesFn({ data: { seriesId } }),
	})

export const getSeriesPreviewFromTmdbOptions = (tmdbId: string) =>
	queryOptions({
		queryKey: ['series', 'tmdb-preview', tmdbId],
		queryFn: () => getSeriesPreviewFromTmdbFn({ data: { tmdbId } }),
	})
