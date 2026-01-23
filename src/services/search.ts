import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { searchMulti } from '@/services/tmdb'

// Search TMDB for movies and TV shows
export const searchTmdbQueryOptions = (q: string, page?: number) =>
	queryOptions({
		queryKey: ['tmdb', 'search', q, page],
		queryFn: () => searchTmdb({ data: { q, page } }),
	})

export const searchTmdb = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ q: z.string(), page: z.number().optional() }))
	.handler(async ({ data }) => {
		if (!data.q.trim()) {
			return { movies: [], tv: [], page: 1, totalPages: 0, totalResults: 0 }
		}
		const results = await searchMulti(data.q, data.page ?? 1)
		return results
	})
