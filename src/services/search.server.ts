import { searchMulti } from '@/services/tmdb.server'

export async function searchTmdb(q: string, page?: number) {
	if (!q.trim()) {
		return { movies: [], tv: [], page: 1, totalPages: 0, totalResults: 0 }
	}
	return searchMulti(q, page ?? 1)
}
