import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { searchTmdbCore } from '@/services/search-core'
import { searchMulti } from '@/services/tmdb'

// Re-export core types for consumers
export type { SearchDeps, SearchInput, SearchResponse, SearchResult } from '@/services/search-core'
export { searchTmdbCore } from '@/services/search-core'

// Search TMDB for movies and TV shows
export const searchTmdbQueryOptions = (q: string, page?: number) =>
	queryOptions({
		queryKey: ['tmdb', 'search', q, page],
		queryFn: () => searchTmdb({ data: { q, page } }),
	})

export const searchTmdb = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ q: z.string(), page: z.number().optional() }))
	.handler(async ({ data }) => {
		return searchTmdbCore(data, { searchMultiFn: searchMulti })
	})
