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
