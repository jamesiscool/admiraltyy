// Pure search handler logic - no side effects, safe for testing

// Search result type (matches tmdb.ts SearchResult)
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

export interface SearchDeps {
	searchMultiFn: (query: string, page: number) => Promise<SearchResponse>
}

// Pure handler logic - can be tested without module initialization issues
export async function searchTmdbCore(data: SearchInput, deps: SearchDeps): Promise<SearchResponse> {
	if (!data.q.trim()) {
		return { movies: [], tv: [], page: 1, totalPages: 0, totalResults: 0 }
	}
	return deps.searchMultiFn(data.q, data.page ?? 1)
}
