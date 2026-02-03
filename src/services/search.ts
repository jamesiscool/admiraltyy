import { queryOptions } from '@tanstack/react-query'
import { searchTmdbFn } from '@/services/search.functions'

export const searchTmdbQueryOptions = (q: string, page?: number) =>
	queryOptions({
		queryKey: ['tmdb', 'search', q, page],
		queryFn: () => searchTmdbFn({ data: { q, page } }),
	})

export interface SearchResult {
	tmdbId: number
	title: string
	posterPath?: string
	backdropPath?: string
	overview: string
	releaseDate?: string
	voteAverage: number
	voteCount: number
	mediaType: 'movie' | 'tv'
	genreIds: number[]
}

export interface SearchResponse {
	movies: SearchResult[]
	tv: SearchResult[]
	page: number
	totalPages: number
	totalResults: number
}

export interface SearchInput {
	q: string
	page?: number
}
