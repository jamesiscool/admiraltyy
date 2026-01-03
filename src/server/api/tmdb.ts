import { ofetch } from 'ofetch'
import { getSettings } from '../settings'

const tmdbFetch = ofetch.create({
	baseURL: 'https://api.themoviedb.org/3',
	query: {
		api_key: getSettings().tmdbApiKey,
	},
	onRequest(request) {
		const query = { ...request.options.query }
		delete query.api_key
		console.log('tmdbFetch', `${request.options.baseURL}${request.request}?${new URLSearchParams(query).toString()}`)
	},
})

function mapMovieResult(movie: TmdbMovieResult): SearchResult {
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

function mapTvResult(tv: TmdbTvResult): SearchResult {
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

async function searchCollections(query: string): Promise<TmdbCollection[]> {
	try {
		const data = await tmdbFetch<TmdbSearchCollectionResponse>('/search/collection', {
			query: { query, include_adult: 'false' },
		})

		// Filter: prioritize collections where query is a word boundary match (not substring like "bondage")
		const queryLower = query.toLowerCase()
		const wordBoundaryRegex = new RegExp(`\\b${queryLower}\\b`, 'i')

		const filtered = data.results.filter((c) => wordBoundaryRegex.test(c.name))

		// If no word-boundary matches, fall back to substring matches
		const results = filtered.length > 0 ? filtered : data.results

		return results.slice(0, 5) // Limit to top 5 collections
	} catch {
		return []
	}
}

async function fetchCollectionDetails(collectionId: number): Promise<TmdbCollectionDetails | null> {
	try {
		const data = await tmdbFetch<TmdbCollectionDetails>(`/collection/${collectionId}`)
		return data
	} catch {
		return null
	}
}

export async function searchMulti(query: string, page = 1): Promise<SearchResponse> {
	// Run regular search and collection search in parallel
	const [multiResponse, collections] = await Promise.all([
		tmdbFetch<TmdbSearchMultiResponse>('/search/multi', {
			query: { query, page: String(page), include_adult: 'false' },
		}),
		page === 1 ? searchCollections(query) : Promise.resolve([]),
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
		const collectionDetails = await Promise.all(collections.map((c) => fetchCollectionDetails(c.id)))

		for (const details of collectionDetails) {
			if (!details) continue
			for (const movie of details.parts) {
				if (movie.adult || seenMovieIds.has(movie.id)) continue
				seenMovieIds.add(movie.id)
				movies.push({
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
				})
			}
		}
	}

	// Sort movies by vote count (most votes first)
	movies.sort((a, b) => b.voteCount - a.voteCount)

	return {
		movies,
		tv,
		page: multiResponse.page,
		totalPages: multiResponse.total_pages,
		totalResults: multiResponse.total_results,
	}
}

export async function fetchMovieDetails(tmdbId: number): Promise<MovieDetails> {
	const [data, altTitlesData] = await Promise.all([
		tmdbFetch<TmdbMovieDetailsResponse>(`/movie/${tmdbId}`, {
			query: { append_to_response: 'credits,release_dates' },
		}),
		tmdbFetch<{ id: number; titles: Array<{ iso_3166_1: string; title: string; type: string }> }>(`/movie/${tmdbId}/alternative_titles`).catch(() => ({ id: tmdbId, titles: [] })),
	])

	// Extract year from release date
	const year = data.release_date ? new Date(data.release_date).getFullYear() : new Date().getFullYear()

	// Map genre objects to names
	const genres = data.genres.map((g) => g.name)

	// Get top 10 cast members by order (with character names)
	const cast = (data.credits?.cast ?? [])
		.sort((a, b) => a.order - b.order)
		.slice(0, 10)
		.map((c) => ({ name: c.name, character: c.character }))

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

	// Extract alternate titles (just the title strings, ignoring country and type)
	// De-dupe against each other and against the original title
	const originalTitleLower = data.title.toLowerCase().trim()
	const seenTitles = new Set<string>()
	const alternateTitles = altTitlesData.titles
		.map((t) => t.title.trim())
		.filter((title) => {
			const titleLower = title.toLowerCase()
			// Skip if matches original title or if we've seen this title before
			if (titleLower === originalTitleLower || seenTitles.has(titleLower)) {
				return false
			}
			seenTitles.add(titleLower)
			return true
		})

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
		alternateTitles,
	}
}

function isMovie(result: TmdbMovieResult | TmdbTvResult | TmdbPersonResult): result is TmdbMovieResult {
	return result.media_type === 'movie'
}

function isTv(result: TmdbMovieResult | TmdbTvResult | TmdbPersonResult): result is TmdbTvResult {
	return result.media_type === 'tv'
}

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
		adult: boolean
		poster_path?: string
		backdrop_path?: string
		overview: string
		release_date: string
		vote_average: number
		vote_count: number
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
export interface CastMember {
	name: string
	character: string
}

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
	cast: CastMember[]
	cinemaReleaseDate?: string
	digitalReleaseDate?: string
	contentRating?: string
	alternateTitles: string[]
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

// Series preview types (for add dialog)
export interface SeasonPreview {
	seasonNumber: number
	episodeCount: number
	airDate?: string
	name: string
}

export interface SeriesPreview {
	tmdbId: number
	title: string
	year: number
	status: 'continuing' | 'ended'
	network?: string
	overview?: string
	posterUrl?: string
	backdropUrl?: string
	genres: string[]
	runtimeMins?: number
	contentRating?: string
	seasons: SeasonPreview[]
	alternateTitles: string[]
}

// Full series types (for adding to DB)
export interface EpisodeDetails {
	episodeNumber: number
	seasonNumber: number
	title: string
	airDate?: string
	runtimeMins?: number
}

export interface SeasonWithEpisodes {
	seasonNumber: number
	episodes: EpisodeDetails[]
}

export interface SeriesWithEpisodes extends SeriesPreview {
	seasonsWithEpisodes: SeasonWithEpisodes[]
}

// TMDB TV response types
interface TmdbTvSeason {
	air_date?: string
	episode_count?: number
	id?: number
	name?: string
	overview?: string
	poster_path?: string
	season_number?: number
	vote_average?: number
}

interface TmdbContentRating {
	iso_3166_1: string
	rating: string
}

interface TmdbTvDetailsResponse {
	id: number
	name: string
	original_name: string
	overview?: string
	poster_path?: string
	backdrop_path?: string
	first_air_date?: string
	status?: string
	in_production?: boolean
	genres?: Array<{ id: number; name: string }>
	networks?: Array<{ id: number; name: string }>
	episode_run_time?: number[]
	seasons?: TmdbTvSeason[]
	content_ratings?: {
		results: TmdbContentRating[]
	}
}

interface TmdbEpisode {
	id: number
	name: string
	episode_number: number
	season_number: number
	air_date?: string
	runtime?: number
	overview?: string
}

interface TmdbSeasonDetailsResponse {
	id: number
	name: string
	season_number: number
	episodes?: TmdbEpisode[]
}

export async function fetchSeriesPreview(tmdbId: number): Promise<SeriesPreview> {
	const [data, altTitlesData] = await Promise.all([
		tmdbFetch<TmdbTvDetailsResponse>(`/tv/${tmdbId}`, {
			query: { append_to_response: 'content_ratings' },
		}),
		tmdbFetch<{ id: number; results: Array<{ iso_3166_1: string; title: string; type: string }> }>(`/tv/${tmdbId}/alternative_titles`).catch(() => ({ id: tmdbId, results: [] })),
	])

	const year = data.first_air_date ? new Date(data.first_air_date).getFullYear() : new Date().getFullYear()
	const genres = (data.genres ?? []).map((g) => g.name)
	const network = data.networks?.[0]?.name
	const runtimeMins = data.episode_run_time?.[0]

	// Get US content rating
	const usRating = data.content_ratings?.results.find((r) => r.iso_3166_1 === 'US')
	const contentRating = usRating?.rating

	// Map status
	const status: 'continuing' | 'ended' = data.status === 'Ended' || data.status === 'Canceled' ? 'ended' : 'continuing'

	// Filter out season 0 (specials) and map seasons
	const seasons: SeasonPreview[] = (data.seasons ?? [])
		.filter((s): s is TmdbTvSeason & { season_number: number } => s.season_number !== undefined && s.season_number > 0)
		.map((s) => ({
			seasonNumber: s.season_number,
			episodeCount: s.episode_count ?? 0,
			airDate: s.air_date,
			name: s.name ?? `Season ${s.season_number}`,
		}))

	// Extract alternate titles (just the title strings, ignoring country and type)
	// De-dupe against each other and against the original title
	const originalTitleLower = data.name.toLowerCase().trim()
	const seenTitles = new Set<string>()
	const alternateTitles = altTitlesData.results
		.map((t) => t.title.trim())
		.filter((title) => {
			const titleLower = title.toLowerCase()
			// Skip if matches original title or if we've seen this title before
			if (titleLower === originalTitleLower || seenTitles.has(titleLower)) {
				return false
			}
			seenTitles.add(titleLower)
			return true
		})

	return {
		tmdbId: data.id,
		title: data.name,
		year,
		status,
		network,
		overview: data.overview,
		posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
		backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : undefined,
		genres,
		runtimeMins,
		contentRating,
		seasons,
		alternateTitles,
	}
}

export async function fetchSeriesWithEpisodes(tmdbId: number, seasonNumbers: number[]): Promise<SeriesWithEpisodes> {
	// First get the series preview
	const preview = await fetchSeriesPreview(tmdbId)

	// Fetch episode details for requested seasons in parallel
	const seasonDetailsPromises = seasonNumbers.map((num) => tmdbFetch<TmdbSeasonDetailsResponse>(`/tv/${tmdbId}/season/${num}`).catch(() => null))
	const seasonDetails = await Promise.all(seasonDetailsPromises)

	const seasonsWithEpisodes: SeasonWithEpisodes[] = seasonDetails
		.filter((s): s is TmdbSeasonDetailsResponse => s !== null)
		.map((s) => ({
			seasonNumber: s.season_number,
			episodes: (s.episodes ?? []).map((ep) => ({
				episodeNumber: ep.episode_number,
				seasonNumber: ep.season_number,
				title: ep.name,
				airDate: ep.air_date,
				runtimeMins: ep.runtime,
			})),
		}))

	return {
		...preview,
		seasonsWithEpisodes,
	}
}
