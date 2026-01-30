import { queryOptions } from '@tanstack/react-query'
import { getSeries, getSeriesPreviewFromTmdb, listSeries } from '@/services/series.functions'

export const listSeriesQueryOptions = () =>
	queryOptions({
		queryKey: ['series'],
		queryFn: () => listSeries(),
	})

export const getSeriesOptions = (seriesId: string) =>
	queryOptions({
		queryKey: ['series', seriesId],
		queryFn: () => getSeries({ data: { seriesId } }),
	})

export const getSeriesPreviewFromTmdbOptions = (tmdbId: string) =>
	queryOptions({
		queryKey: ['series', 'tmdb-preview', tmdbId],
		queryFn: () => getSeriesPreviewFromTmdb({ data: { tmdbId } }),
	})
