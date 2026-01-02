import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { Movie } from '@/server/db/schema'
import type { AppType } from '@/server/index'
import type { Settings } from '@/server/settings'

// Create typed Hono client
export const api = hc<AppType>('/').api

// Settings
export function useSettings() {
	return useQuery({
		queryKey: ['settings'],
		queryFn: async (): Promise<Settings> => {
			const res = await api.settings.$get()
			const json = await res.json()
			if (!json.success) throw new Error('Failed to load settings')
			return json.data
		},
	})
}

// Movies

export function useMovies() {
	return useQuery({
		queryKey: ['movies'],
		queryFn: async (): Promise<Movie[]> => {
			const res = await api.movies.$get()
			const json = await res.json()
			if (!json.success) throw new Error('Failed to fetch movies')
			return json.data
		},
	})
}

export function useMovie(movieId: string) {
	return useQuery({
		queryKey: ['movie', movieId],
		queryFn: async (): Promise<Movie> => {
			const res = await api.movies[':id'].$get({ param: { id: movieId } })
			const json = await res.json()
			if (!json.success) throw new Error('Failed to fetch movie')
			return json.data as Movie
		},
	})
}

export function useAddMovie(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ tmdbId, resolution }: { tmdbId: number; resolution: string }) => {
			const res = await api.movies.$post({ json: { tmdbId, resolution } })
			const json = await res.json()
			if (!json.success) throw new Error('error' in json ? json.error : 'Failed to add movie')
			return json.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['movies'] })
			options?.onSuccess?.()
		},
	})
}

// Search

interface SearchResultItem {
	tmdbId: number
	title: string
	posterPath?: string
	backdropPath?: string
	overview: string
	releaseDate?: string
	voteAverage: number
	mediaType: 'movie' | 'tv'
	genreIds?: number[]
}

interface SearchResult {
	movies: SearchResultItem[]
	tv: SearchResultItem[]
}

export function useSearch(query: string) {
	return useQuery({
		queryKey: ['search', query],
		queryFn: async (): Promise<SearchResult> => {
			const res = await api.search.$get({ query: { q: query } })
			const json = await res.json()
			if (!json.success) throw new Error(json.error)
			return json.data
		},
		enabled: query.trim().length > 0,
	})
}

// Series

interface SeasonPreview {
	seasonNumber: number
	episodeCount: number
	airDate?: string
	name: string
}

interface SeriesPreview {
	tmdbId: number
	title: string
	year: number
	seasons: SeasonPreview[]
}

export function useSeriesPreview(tmdbId: number | undefined, enabled = true) {
	return useQuery({
		queryKey: ['series-preview', tmdbId],
		queryFn: async (): Promise<SeriesPreview | null> => {
			if (!tmdbId) return null
			const res = await api.series.tmdb[':tmdbId'].$get({ param: { tmdbId: String(tmdbId) } })
			const json = await res.json()
			if (!json.success) throw new Error('Failed to load series preview')
			return json.data as SeriesPreview
		},
		enabled: enabled && !!tmdbId,
	})
}

export function useAddSeries(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ tmdbId, resolution, monitoredSeasons }: { tmdbId: number; resolution: string; monitoredSeasons: number[] }) => {
			const res = await api.series.$post({ json: { tmdbId, resolution, monitoredSeasons } })
			const json = await res.json()
			if (!json.success) throw new Error('error' in json ? json.error : 'Failed to add series')
			return json.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['series'] })
			options?.onSuccess?.()
		},
	})
}

// Health

interface HealthResponse {
	status: string
}

export function useHealth() {
	return useQuery({
		queryKey: ['health'],
		queryFn: async (): Promise<HealthResponse> => {
			const res = await fetch('/api/health')
			return res.json()
		},
	})
}
