import { MutationCache, QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { hc } from 'hono/client'
import { hcQuery } from 'hono-rpc-query'
import type { AppType } from '@/server/server'

// Create typed Hono client with query support
const client = hc<AppType>('/')
export const api = hcQuery(client).api

// Create a QueryClient instance
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
		},
	},
	mutationCache: new MutationCache({
		onSuccess: () => {
			queryClient.invalidateQueries()
		},
	}),
})

// Settings
export function useSettings() {
	return useQuery(api.settings.$get.queryOptions({}))
}

export function useUpdateSettings() {
	const queryClient = useQueryClient()

	return useMutation(
		api.settings.$put.mutationOptions({
			onSuccess: (data) => {
				queryClient.setQueryData(api.settings.$get.queryOptions({}).queryKey, data)
			},
		}),
	)
}

// Movies

export function useMovies() {
	return useQuery(api.movies.$get.queryOptions({}))
}

export function useMovie(movieId: string) {
	return useQuery(api.movies[':id'].$get.queryOptions({ input: { param: { id: movieId } } }))
}

export function useAddMovie(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation(
		api.movies.$post.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: api.movies.$get.queryOptions({}).queryKey })
				options?.onSuccess?.()
			},
		}),
	)
}

export function useUpdateMovie(movieId: string) {
	const queryClient = useQueryClient()

	return useMutation(
		api.movies[':id'].$put.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: api.movies[':id'].$get.queryOptions({ input: { param: { id: movieId } } }).queryKey })
				queryClient.invalidateQueries({ queryKey: api.movies.$get.queryOptions({}).queryKey })
			},
		}),
	)
}

export function useDeleteMovie(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation(
		api.movies[':id'].$delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: api.movies.$get.queryOptions({}).queryKey })
				options?.onSuccess?.()
			},
		}),
	)
}

export function useSearchMovieReleases() {
	return useMutation(api.movies[':id'].search.$post.mutationOptions({}))
}

export function useGrabMovieRelease() {
	return useMutation(api.movies[':id'].grab.$post.mutationOptions({}))
}

// Search

export function useSearch(query: string) {
	return useQuery(
		api.search.$get.queryOptions({
			input: { query: { q: query } },
			enabled: query.trim().length > 0,
		}),
	)
}

// Series

export function useSeries() {
	return useQuery(api.series.$get.queryOptions({}))
}

export function useSingleSeries(seriesId: string) {
	return useQuery(api.series[':id'].$get.queryOptions({ input: { param: { id: seriesId } } }))
}

export function useUpdateSeries(seriesId: string) {
	const queryClient = useQueryClient()

	return useMutation(
		api.series[':id'].$put.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: api.series[':id'].$get.queryOptions({ input: { param: { id: seriesId } } }).queryKey })
				queryClient.invalidateQueries({ queryKey: api.series.$get.queryOptions({}).queryKey })
			},
		}),
	)
}

export function useSeriesPreview(tmdbId: number | undefined, enabled = true) {
	return useQuery(
		api.series.tmdb[':tmdbId'].$get.queryOptions({
			input: { param: { tmdbId: String(tmdbId ?? 0) } },
			enabled: enabled && !!tmdbId,
		}),
	)
}

export function useAddSeries(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation(
		api.series.$post.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: api.series.$get.queryOptions({}).queryKey })
				options?.onSuccess?.()
			},
		}),
	)
}

export function useDeleteSeries(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient()

	return useMutation(
		api.series[':id'].$delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: api.series.$get.queryOptions({}).queryKey })
				options?.onSuccess?.()
			},
		}),
	)
}

export function useUpdateSeason(seriesId: string) {
	const queryClient = useQueryClient()

	return useMutation(
		api.series[':id'].seasons[':seasonId'].$put.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: api.series[':id'].$get.queryOptions({ input: { param: { id: seriesId } } }).queryKey })
			},
		}),
	)
}

export function useUpdateEpisode(seriesId: string) {
	const queryClient = useQueryClient()

	return useMutation(
		api.series[':id'].episodes[':episodeId'].$put.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: api.series[':id'].$get.queryOptions({ input: { param: { id: seriesId } } }).queryKey })
			},
		}),
	)
}

// Health

export function useHealth() {
	return useQuery(api.health.$get.queryOptions({}))
}

// Activity / NZBGet

export function useNzbgetStatus() {
	return useQuery(
		api.activity.nzbget.status.$get.queryOptions({
			refetchInterval: 1000,
			retry: false,
		}),
	)
}

export function useNzbgetVersion() {
	return useQuery(
		api.activity.nzbget.version.$get.queryOptions({
			retry: false,
		}),
	)
}

export function useNzbgetQueue() {
	return useQuery(
		api.activity.nzbget.queue.$get.queryOptions({
			refetchInterval: 1000,
			retry: false,
		}),
	)
}

// Tasks

export function useScanMovies() {
	return useMutation(api.tasks['scan-movies-files'].$post.mutationOptions({}))
}

export function useScanSeries() {
	return useMutation(api.tasks['scan-series-files'].$post.mutationOptions({}))
}

// Test Usenet Server
export function useTestUsenetServer() {
	return useMutation(api.settings['test-usenet-server'].$post.mutationOptions({}))
}
