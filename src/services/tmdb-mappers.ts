// Pure TMDB mapping functions and types - no side effects, safe for testing

// TMDB API response types
interface TmdbMediaResult {
	id: number
	media_type: string
	popularity: number
	poster_path?: string
	backdrop_path?: string
	vote_count: number
	vote_average: number
	genre_ids: number[]
	overview: string
	original_language: string
}

export interface TmdbMovieResult extends TmdbMediaResult {
	media_type: 'movie'
	title: string
	original_title: string
	release_date: string
	adult: boolean
	video: boolean
}

export interface TmdbTvResult extends TmdbMediaResult {
	media_type: 'tv'
	name: string
	original_name: string
	origin_country: string[]
	first_air_date: string
}

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

// Genre ID to name mapping (TMDB standard genres)
export const MOVIE_GENRES: Record<number, string> = {
	28: 'Action',
	12: 'Adventure',
	16: 'Animation',
	35: 'Comedy',
	80: 'Crime',
	99: 'Documentary',
	18: 'Drama',
	10751: 'Family',
	14: 'Fantasy',
	36: 'History',
	27: 'Horror',
	10402: 'Music',
	9648: 'Mystery',
	10749: 'Romance',
	878: 'Sci-Fi',
	10770: 'TV Movie',
	53: 'Thriller',
	10752: 'War',
	37: 'Western',
}

export const TV_GENRES: Record<number, string> = {
	10759: 'Action & Adventure',
	16: 'Animation',
	35: 'Comedy',
	80: 'Crime',
	99: 'Documentary',
	18: 'Drama',
	10751: 'Family',
	10762: 'Kids',
	9648: 'Mystery',
	10763: 'News',
	10764: 'Reality',
	10765: 'Sci-Fi & Fantasy',
	10766: 'Soap',
	10767: 'Talk',
	10768: 'War & Politics',
	37: 'Western',
}

export function mapMovieResult(movie: TmdbMovieResult): SearchResult {
	return {
		tmdbId: movie.id,
		title: movie.title,
		posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
		backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : undefined,
		overview: movie.overview,
		releaseDate: movie.release_date,
		voteAverage: movie.vote_average,
		voteCount: movie.vote_count,
		mediaType: 'movie',
		genreIds: movie.genre_ids,
	}
}

export function mapTvResult(tv: TmdbTvResult): SearchResult {
	return {
		tmdbId: tv.id,
		title: tv.name,
		posterPath: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : undefined,
		backdropPath: tv.backdrop_path ? `https://image.tmdb.org/t/p/w780${tv.backdrop_path}` : undefined,
		overview: tv.overview,
		releaseDate: tv.first_air_date,
		voteAverage: tv.vote_average,
		voteCount: tv.vote_count,
		mediaType: 'tv',
		genreIds: tv.genre_ids,
	}
}
