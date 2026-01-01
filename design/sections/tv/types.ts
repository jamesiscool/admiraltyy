// =============================================================================
// Data Types
// =============================================================================

export type EpisodeStatus = 'downloaded' | 'missing' | 'airing'

export type Quality = '480p' | '720p' | '1080p' | '2160p'

export type SeriesStatus = 'continuing' | 'ended'

export interface Episode {
	id: string
	episodeNumber: number
	title: string
	airDate: string
	status: EpisodeStatus
	monitored: boolean
	quality: Quality | null
	size: number | null
	runtime: number
}

export interface Season {
	id: string
	seasonNumber: number
	monitored: boolean
	episodeCount: number
	downloadedCount: number
	episodes: Episode[]
}

export interface Series {
	id: string
	tvdbId: number
	title: string
	year: number
	status: SeriesStatus
	network: string
	overview: string
	posterUrl: string
	backdropUrl?: string
	genres: string[]
	runtime: number
	monitored: boolean
	qualityPreference: Quality
	dateAdded: string
	nextAiring: string | null
	totalEpisodes: number
	downloadedEpisodes: number
	seasons: Season[]
}

// =============================================================================
// Component Props
// =============================================================================

export interface TVListProps {
	/** The list of TV series to display */
	series: Series[]

	// --- Search & Filter ---
	/** Current search query */
	searchQuery?: string
	/** Called when user types in search box */
	onSearchChange?: (query: string) => void

	// --- Series Actions ---
	/** Called when user clicks a series card to view details */
	onViewSeries?: (id: string) => void
	/** Called when user triggers auto-search for a series */
	onAutoSearch?: (id: string) => void
	/** Called when user triggers manual search for a series */
	onManualSearch?: (id: string) => void
	/** Called when user wants to delete a series */
	onDeleteSeries?: (id: string) => void
	/** Called when user toggles series monitoring */
	onToggleSeriesMonitored?: (id: string, monitored: boolean) => void
	/** Called when user wants to edit series quality profile */
	onEditQualityProfile?: (id: string) => void
	/** Called when user wants to add a new series */
	onAddSeries?: () => void
}

export interface TVDetailProps {
	/** The series to display */
	series: Series

	// --- Series Actions ---
	/** Called when user triggers auto-search for the series */
	onAutoSearch?: () => void
	/** Called when user triggers manual search for the series */
	onManualSearch?: () => void
	/** Called when user wants to delete the series */
	onDelete?: () => void
	/** Called when user toggles series monitoring */
	onToggleMonitored?: (monitored: boolean) => void
	/** Called when user wants to edit quality profile */
	onEditQualityProfile?: () => void
	/** Called when user navigates back to the list */
	onBack?: () => void

	// --- Season Actions ---
	/** Called when user toggles a season's monitoring */
	onToggleSeasonMonitored?: (seasonId: string, monitored: boolean) => void

	// --- Episode Actions ---
	/** Called when user toggles an episode's monitoring */
	onToggleEpisodeMonitored?: (episodeId: string, monitored: boolean) => void
	/** Called when user triggers search for a specific episode */
	onSearchEpisode?: (episodeId: string) => void
}

export interface AddTVProps {
	/** Called when user searches for a series on TVDB */
	onSearch?: (query: string) => void
	/** Called when user selects a series to add */
	onAddSeries?: (tvdbId: number) => void
	/** Called when user navigates back */
	onBack?: () => void
}
