import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { Resolution } from '@/server/db/schema'
import type { AppType } from '@/server/index'
import type { Settings } from '@/server/settings'

// Create typed Hono client
export const api = hc<AppType>('/').api

// Settings
export function useSettings() {
	return useQuery({
		queryKey: ['settings'],
		queryFn: async () => {
			const res = await api.settings.$get()
			const json = await res.json()
			if (!json.success) throw new Error('Failed to load settings')
			return json.data
		},
	})
}

export function useUpdateSettings() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (updates: Partial<Settings>) => {
			const res = await api.settings.$put({ json: updates })
			const json = await res.json()
			if (!json.success) throw new Error('Failed to update settings')
			return json.data
		},
		onSuccess: (data) => {
			queryClient.setQueryData(['settings'], data)
		},
	})
}

// Movies

export function useMovies() {
	return useQuery({
		queryKey: ['movies'],
		queryFn: async () => {
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
		queryFn: async () => {
			const res = await api.movies[':id'].$get({ param: { id: movieId } })
			const json = await res.json()
			if (!json.success) throw new Error('Failed to fetch movie')
			return json.data
		},
	})
}

export function useAddMovie(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ tmdbId, resolution }: { tmdbId: number; resolution: Resolution }) => {
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

export function useUpdateMovie(movieId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ monitored }: { monitored: boolean }) => {
			const res = await api.movies[':id'].$put({ param: { id: movieId }, json: { monitored } })
			const json = await res.json()
			if (!json.success) throw new Error(json.error ?? 'Failed to update movie')
			return json.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['movie', movieId] })
			queryClient.invalidateQueries({ queryKey: ['movies'] })
		},
	})
}

export function useDeleteMovie(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ movieId, deleteFiles }: { movieId: number; deleteFiles: boolean }) => {
			const res = await api.movies[':id'].$delete({ param: { id: String(movieId) }, query: { deleteFiles: String(deleteFiles) } })
			const json = await res.json()
			if (!json.success) throw new Error(json.error ?? 'Failed to delete movie')
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['movies'] })
			options?.onSuccess?.()
		},
	})
}

export function useSearchMovieReleases(movieId: string) {
	return useMutation({
		mutationFn: async () => {
			const res = await api.movies[':id'].search.$post({ param: { id: movieId } })
			const json = await res.json()
			if (!json.success) throw new Error(json.error ?? 'Failed to search releases')
			return json.data
		},
	})
}

// Search

export function useSearch(query: string) {
	return useQuery({
		queryKey: ['search', query],
		queryFn: async () => {
			const res = await api.search.$get({ query: { q: query } })
			const json = await res.json()
			if (!json.success) throw new Error(json.error)
			return json.data
		},
		enabled: query.trim().length > 0,
	})
}

// Series

export function useSeries() {
	return useQuery({
		queryKey: ['series'],
		queryFn: async () => {
			const res = await api.series.$get()
			const json = await res.json()
			if (!json.success) throw new Error('Failed to fetch series')
			return json.data
		},
	})
}

export function useSingleSeries(seriesId: string) {
	return useQuery({
		queryKey: ['series', seriesId],
		queryFn: async () => {
			const res = await api.series[':id'].$get({ param: { id: seriesId } })
			const json = await res.json()
			if (!json.success) throw new Error('Failed to fetch series')
			return json.data
		},
	})
}

export function useUpdateSeries(seriesId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ monitored }: { monitored: boolean }) => {
			const res = await api.series[':id'].$put({ param: { id: seriesId }, json: { monitored } })
			const json = await res.json()
			if (!json.success) throw new Error(json.error ?? 'Failed to update series')
			return json.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['series', seriesId] })
			queryClient.invalidateQueries({ queryKey: ['series'] })
		},
	})
}

export function useSeriesPreview(tmdbId: number | undefined, enabled = true) {
	return useQuery({
		queryKey: ['series-preview', tmdbId],
		queryFn: async () => {
			if (!tmdbId) return null
			const res = await api.series.tmdb[':tmdbId'].$get({ param: { tmdbId: String(tmdbId) } })
			const json = await res.json()
			if (!json.success) throw new Error('Failed to load series preview')
			return json.data
		},
		enabled: enabled && !!tmdbId,
	})
}

export function useAddSeries(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ tmdbId, resolution, monitoredSeasons }: { tmdbId: number; resolution: Resolution; monitoredSeasons: number[] }) => {
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

export function useDeleteSeries(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ seriesId, deleteFiles }: { seriesId: number; deleteFiles: boolean }) => {
			const res = await api.series[':id'].$delete({ param: { id: String(seriesId) }, query: { deleteFiles: String(deleteFiles) } })
			const json = await res.json()
			if (!json.success) throw new Error(json.error ?? 'Failed to delete series')
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['series'] })
			options?.onSuccess?.()
		},
	})
}

export function useUpdateSeason(seriesId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ seasonId, monitored }: { seasonId: number; monitored: boolean }) => {
			const res = await api.series[':id'].seasons[':seasonId'].$put({
				param: { id: seriesId, seasonId: String(seasonId) },
				json: { monitored },
			})
			const json = await res.json()
			if (!json.success) throw new Error(json.error ?? 'Failed to update season')
			return json.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['series', seriesId] })
		},
	})
}

export function useUpdateEpisode(seriesId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ episodeId, monitored }: { episodeId: number; monitored: boolean }) => {
			const res = await api.series[':id'].episodes[':episodeId'].$put({
				param: { id: seriesId, episodeId: String(episodeId) },
				json: { monitored },
			})
			const json = await res.json()
			if (!json.success) throw new Error(json.error ?? 'Failed to update episode')
			return json.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['series', seriesId] })
		},
	})
}

// Health

export function useHealth() {
	return useQuery({
		queryKey: ['health'],
		queryFn: async () => {
			const res = await api.health.$get()
			return res.json()
		},
	})
}

// Tasks

export function useScanMovies() {
	return useMutation({
		mutationFn: async () => {
			const res = await api.tasks['scan-movies-files'].$post()
			return res.json()
		},
	})
}

export function useScanSeries() {
	return useMutation({
		mutationFn: async () => {
			const res = await api.tasks['scan-series-files'].$post()
			return res.json()
		},
	})
}
