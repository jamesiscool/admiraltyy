import { queryOptions } from '@tanstack/react-query'
import { searchTmdbFn } from '@/services/search.functions'

export const searchTmdbQueryOptions = (q: string, page?: number) =>
	queryOptions({
		queryKey: ['tmdb', 'search', q, page],
		queryFn: () => searchTmdbFn({ data: { q, page } }),
	})
