import { queryOptions } from '@tanstack/react-query'
import type { Episode, File, Season, Series } from '@/db/schema'
import { getSeriesFn, getSeriesPreviewFromTmdbFn, listSeriesFn } from '@/services/series.functions'

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

// --- Query Options ---

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
