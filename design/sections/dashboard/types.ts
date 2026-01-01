// =============================================================================
// Re-exported Types from Other Sections
// =============================================================================

// Re-export types from Movies and TV sections for convenience
export type { CastMember, Movie, MovieFile } from '../movies/types'
export type { Episode, EpisodeStatus, Quality, Season, Series, SeriesStatus } from '../tv/types'

// Import types we actually use in this file
import type { Movie } from '../movies/types'
import type { Quality, Series } from '../tv/types'

// =============================================================================
// Dashboard-Specific Types
// =============================================================================

/**
 * Content type for downloads - either a movie or TV episode.
 */
export type DownloadType = 'movie' | 'tv'

/**
 * Download status through the lifecycle.
 */
export type DownloadStatus = 'downloading' | 'importing' | 'completed' | 'failed'

/**
 * A recent download showing status and details.
 */
export interface RecentDownload {
	id: string
	type: DownloadType
	/** Movie title or "Series S01E01" format for TV */
	title: string
	quality: Quality
	/** File size in bytes */
	size: number
	/** When the download was initiated (ISO string) */
	dateDownloaded: string
	status: DownloadStatus
	/** Download progress percentage (0-100) */
	progress: number
	/** ID of the related movie or series for navigation */
	mediaId: string
}

// =============================================================================
// Helper Type: Wanted Movie
// =============================================================================

/**
 * A wanted movie is a Movie where file is null (monitored but no file present).
 * This is a type alias to make intent clear in component props.
 */
export type WantedMovie = Movie & { file: null }

/**
 * Helper to check if a movie is wanted (no file).
 */
export function isWantedMovie(movie: Movie): movie is WantedMovie {
	return movie.file === null && movie.monitored
}

// =============================================================================
// Helper Type: Wanted Series
// =============================================================================

/**
 * Information about the next wanted episode in a series.
 * Derived from the Episode type in the TV section.
 */
export interface NextWantedEpisode {
	seasonNumber: number
	episodeNumber: number
	title: string
	/** Air date of this episode (ISO string), null if unknown */
	airDate: string | null
	/** Whether this episode already aired (missing) or is upcoming (airing) */
	status: 'missing' | 'airing'
}

/**
 * A series with wanted episodes - includes the next episode that needs to be downloaded.
 */
export interface WantedSeries {
	series: Series
	/** The next wanted episode, or null if no wanted episodes */
	nextWantedEpisode: NextWantedEpisode | null
}

/**
 * Helper to find the next wanted episode in a series.
 */
export function getNextWantedEpisode(series: Series): NextWantedEpisode | null {
	for (const season of series.seasons) {
		for (const episode of season.episodes) {
			if (episode.monitored && (episode.status === 'missing' || episode.status === 'airing')) {
				return {
					seasonNumber: season.seasonNumber,
					episodeNumber: episode.episodeNumber,
					title: episode.title,
					airDate: episode.airDate,
					status: episode.status as 'missing' | 'airing',
				}
			}
		}
	}
	return null
}

/**
 * Helper to check if a series has any wanted episodes.
 */
export function hasWantedEpisodes(series: Series): boolean {
	return getNextWantedEpisode(series) !== null
}

// =============================================================================
// Component Props
// =============================================================================

export interface DashboardProps {
	/** Wanted movies (movies with no file that are monitored) */
	wantedMovies: WantedMovie[]
	/** TV series with wanted episodes */
	wantedSeries: WantedSeries[]
	/** Recent download history */
	recentDownloads: RecentDownload[]

	// Movie card actions
	/** Called when user clicks a movie to view details */
	onMovieClick?: (id: string) => void
	/** Called when user triggers auto-search on a movie */
	onMovieAutoSearch?: (id: string) => void
	/** Called when user opens manual search for a movie */
	onMovieManualSearch?: (id: string) => void
	/** Called when user deletes a movie */
	onMovieDelete?: (id: string) => void

	// TV series card actions
	/** Called when user clicks a series to view details */
	onSeriesClick?: (id: string) => void
	/** Called when user triggers auto-search on a series */
	onSeriesAutoSearch?: (id: string) => void
	/** Called when user opens manual search for a series */
	onSeriesManualSearch?: (id: string) => void
	/** Called when user deletes a series */
	onSeriesDelete?: (id: string) => void

	// Navigation actions
	/** Called when user clicks a download row to view details */
	onDownloadClick?: (download: RecentDownload) => void
	/** Called when user clicks "View all" on movies section */
	onViewAllMovies?: () => void
	/** Called when user clicks "View all" on TV section */
	onViewAllTv?: () => void
}
