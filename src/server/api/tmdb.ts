import { getSettings } from '../settings'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

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

interface TmdbMovieResult extends TmdbMediaResult {
	media_type: 'movie'
	title: string
	original_title: string
	release_date: string
	adult: boolean
	video: boolean
}

interface TmdbTvResult extends TmdbMediaResult {
	media_type: 'tv'
	name: string
	original_name: string
	origin_country: string[]
	first_air_date: string
}

interface TmdbPersonResult {
	id: number
	name: string
	popularity: number
	profile_path?: string
	adult: boolean
	media_type: 'person'
}

interface TmdbSearchMultiResponse {
	page: number
	total_results: number
	total_pages: number
	results: (TmdbMovieResult | TmdbTvResult | TmdbPersonResult)[]
}

// De-normalized search result types
export interface SearchResult {
	tmdbId: number
	title: string
	posterPath?: string
	backdropPath?: string
	overview: string
	releaseDate?: string
	voteAverage: number
	mediaType: 'movie' | 'tv'
}

export interface SearchResponse {
	movies: SearchResult[]
	tv: SearchResult[]
	page: number
	totalPages: number
	totalResults: number
}

function isMovie(result: TmdbMovieResult | TmdbTvResult | TmdbPersonResult): result is TmdbMovieResult {
	return result.media_type === 'movie'
}

function isTv(result: TmdbMovieResult | TmdbTvResult | TmdbPersonResult): result is TmdbTvResult {
	return result.media_type === 'tv'
}

function mapMovieResult(movie: TmdbMovieResult): SearchResult {
	return {
		tmdbId: movie.id,
		title: movie.title,
		posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
		backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : undefined,
		overview: movie.overview,
		releaseDate: movie.release_date,
		voteAverage: movie.vote_average,
		mediaType: 'movie',
	}
}

function mapTvResult(tv: TmdbTvResult): SearchResult {
	return {
		tmdbId: tv.id,
		title: tv.name,
		posterPath: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : undefined,
		backdropPath: tv.backdrop_path ? `https://image.tmdb.org/t/p/w780${tv.backdrop_path}` : undefined,
		overview: tv.overview,
		releaseDate: tv.first_air_date,
		voteAverage: tv.vote_average,
		mediaType: 'tv',
	}
}

export async function searchMulti(query: string, page = 1): Promise<SearchResponse> {
	const settings = getSettings()
	const apiKey = settings.tmdbApiKey

	const url = new URL(`${TMDB_BASE_URL}/search/multi`)
	url.searchParams.set('api_key', apiKey)
	url.searchParams.set('query', query)
	url.searchParams.set('page', String(page))
	url.searchParams.set('include_adult', 'false')

	const response = await fetch(url.toString())

	if (!response.ok) {
		throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
	}

	const data = (await response.json()) as TmdbSearchMultiResponse
	console.log(data)

	const movies: SearchResult[] = []
	const tv: SearchResult[] = []

	for (const result of data.results) {
		if (isMovie(result)) {
			movies.push(mapMovieResult(result))
		} else if (isTv(result)) {
			tv.push(mapTvResult(result))
		}
		// Ignore person results
	}

	return {
		movies,
		tv,
		page: data.page,
		totalPages: data.total_pages,
		totalResults: data.total_results,
	}
}
