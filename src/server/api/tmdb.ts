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

interface TmdbCollection {
	id: number
	name: string
	adult: boolean
	poster_path?: string
	backdrop_path?: string
}

interface TmdbSearchCollectionResponse {
	page: number
	total_results: number
	total_pages: number
	results: TmdbCollection[]
}

interface TmdbCollectionDetails {
	id: number
	name: string
	overview: string
	poster_path?: string
	backdrop_path?: string
	parts: Array<{
		id: number
		title: string
		poster_path?: string
		backdrop_path?: string
		overview: string
		release_date: string
		vote_average: number
		genre_ids: number[]
		media_type: 'movie'
	}>
}

interface TmdbGenre {
	id: number
	name: string
}

interface TmdbCastMember {
	id: number
	name: string
	character: string
	order: number
	profile_path?: string
}

interface TmdbReleaseDate {
	certification: string
	release_date: string
	type: number // 1=Premiere, 2=Theatrical (limited), 3=Theatrical, 4=Digital, 5=Physical, 6=TV
}

interface TmdbReleaseDatesResult {
	iso_3166_1: string
	release_dates: TmdbReleaseDate[]
}

interface TmdbMovieDetailsResponse {
	id: number
	imdb_id?: string
	title: string
	original_title: string
	overview: string
	poster_path?: string
	backdrop_path?: string
	release_date: string
	runtime?: number
	genres: TmdbGenre[]
	vote_average: number
	credits?: {
		cast: TmdbCastMember[]
	}
	release_dates?: {
		results: TmdbReleaseDatesResult[]
	}
}

// Movie details result type (exported for use in routes)
export interface MovieDetails {
	tmdbId: number
	imdbId?: string
	title: string
	year: number
	posterUrl?: string
	backdropUrl?: string
	synopsis?: string
	runtimeMins?: number
	genres: string[]
	cast: string[]
	cinemaReleaseDate?: string
	digitalReleaseDate?: string
	contentRating?: string
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
	genreIds: number[]
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
		genreIds: movie.genre_ids,
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
		genreIds: tv.genre_ids,
	}
}

async function searchCollections(query: string, apiKey: string): Promise<TmdbCollection[]> {
	const url = new URL(`${TMDB_BASE_URL}/search/collection`)
	url.searchParams.set('api_key', apiKey)
	url.searchParams.set('query', query)

	const response = await fetch(url.toString())
	if (!response.ok) return []

	const data = (await response.json()) as TmdbSearchCollectionResponse

	// Filter: prioritize collections where query is a word boundary match (not substring like "bondage")
	const queryLower = query.toLowerCase()
	const wordBoundaryRegex = new RegExp(`\\b${queryLower}\\b`, 'i')

	const filtered = data.results.filter((c) => {
		// Exclude adult content
		if (c.adult) return false
		// Prioritize word-boundary matches
		return wordBoundaryRegex.test(c.name)
	})

	// If no word-boundary matches, fall back to substring matches
	const results = filtered.length > 0 ? filtered : data.results.filter((c) => !c.adult)

	return results.slice(0, 5) // Limit to top 5 collections
}

async function fetchCollectionDetails(collectionId: number, apiKey: string): Promise<TmdbCollectionDetails | null> {
	const url = new URL(`${TMDB_BASE_URL}/collection/${collectionId}`)
	url.searchParams.set('api_key', apiKey)

	const response = await fetch(url.toString())
	if (!response.ok) return null

	return (await response.json()) as TmdbCollectionDetails
}

export async function searchMulti(query: string, page = 1): Promise<SearchResponse> {
	const settings = getSettings()
	const apiKey = settings.tmdbApiKey

	// Run regular search and collection search in parallel
	const [multiResponse, collections] = await Promise.all([
		(async () => {
			const url = new URL(`${TMDB_BASE_URL}/search/multi`)
			url.searchParams.set('api_key', apiKey)
			url.searchParams.set('query', query)
			url.searchParams.set('page', String(page))
			url.searchParams.set('include_adult', 'false')

			const response = await fetch(url.toString())
			if (!response.ok) {
				throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
			}
			return (await response.json()) as TmdbSearchMultiResponse
		})(),
		page === 1 ? searchCollections(query, apiKey) : Promise.resolve([]),
	])

	const movies: SearchResult[] = []
	const tv: SearchResult[] = []
	const seenMovieIds = new Set<number>()

	// Process regular search results first
	for (const result of multiResponse.results) {
		if (isMovie(result)) {
			movies.push(mapMovieResult(result))
			seenMovieIds.add(result.id)
		} else if (isTv(result)) {
			tv.push(mapTvResult(result))
		}
	}

	// Fetch collection movies and add any not already in results
	if (collections.length > 0 && page === 1) {
		const collectionDetails = await Promise.all(collections.map((c) => fetchCollectionDetails(c.id, apiKey)))

		for (const details of collectionDetails) {
			if (!details) continue
			for (const movie of details.parts) {
				if (seenMovieIds.has(movie.id)) continue
				seenMovieIds.add(movie.id)
				movies.push({
					tmdbId: movie.id,
					title: movie.title,
					posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
					backdropPath: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : undefined,
					overview: movie.overview,
					releaseDate: movie.release_date,
					voteAverage: movie.vote_average,
					mediaType: 'movie',
					genreIds: movie.genre_ids,
				})
			}
		}
	}

	// Sort movies by vote average (highest rated first)
	movies.sort((a, b) => b.voteAverage - a.voteAverage)

	return {
		movies,
		tv,
		page: multiResponse.page,
		totalPages: multiResponse.total_pages,
		totalResults: multiResponse.total_results,
	}
}

export async function fetchMovieDetails(tmdbId: number): Promise<MovieDetails> {
	const settings = getSettings()
	const apiKey = settings.tmdbApiKey

	const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbId}`)
	url.searchParams.set('api_key', apiKey)
	url.searchParams.set('append_to_response', 'credits,release_dates')

	const response = await fetch(url.toString())
	if (!response.ok) {
		throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
	}

	const data = (await response.json()) as TmdbMovieDetailsResponse

	// Extract year from release date
	const year = data.release_date ? new Date(data.release_date).getFullYear() : new Date().getFullYear()

	// Map genre objects to names
	const genres = data.genres.map((g) => g.name)

	// Get top 10 cast members by order
	const cast = (data.credits?.cast ?? [])
		.sort((a, b) => a.order - b.order)
		.slice(0, 10)
		.map((c) => c.name)

	// Extract US release dates (cinema = type 3, digital = type 4)
	let cinemaReleaseDate: string | undefined
	let digitalReleaseDate: string | undefined
	let contentRating: string | undefined

	const usReleases = data.release_dates?.results.find((r) => r.iso_3166_1 === 'US')
	if (usReleases) {
		for (const rd of usReleases.release_dates) {
			if (rd.type === 3 && !cinemaReleaseDate) {
				cinemaReleaseDate = rd.release_date.split('T')[0]
				if (rd.certification && !contentRating) {
					contentRating = rd.certification
				}
			}
			if (rd.type === 4 && !digitalReleaseDate) {
				digitalReleaseDate = rd.release_date.split('T')[0]
			}
			if (rd.certification && !contentRating) {
				contentRating = rd.certification
			}
		}
	}

	// Fall back to general release date for cinema if not found
	if (!cinemaReleaseDate && data.release_date) {
		cinemaReleaseDate = data.release_date
	}

	return {
		tmdbId: data.id,
		imdbId: data.imdb_id,
		title: data.title,
		year,
		posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
		backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : undefined,
		synopsis: data.overview || undefined,
		runtimeMins: data.runtime,
		genres,
		cast,
		cinemaReleaseDate,
		digitalReleaseDate,
		contentRating,
	}
}
