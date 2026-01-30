import { queryOptions } from '@tanstack/react-query'
import { searchTmdb } from '@/services/search.functions'

export const searchTmdbQueryOptions = (q: string, page?: number) =>
	queryOptions({
		queryKey: ['tmdb', 'search', q, page],
		queryFn: () => searchTmdb({ data: { q, page } }),
	})
