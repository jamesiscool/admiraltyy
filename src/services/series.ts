import type { Episode, File, Season, Series } from '@/db/schema'

// --- Types for API responses ---

// Minimal series data for list page
export interface SeriesPreview {
	id: number
	title: string
	year: number
	status: 'continuing' | 'ended'
	posterUrl: string | null
	resolution: '480p' | '720p' | '1080p' | '2160p' | null
	monitored: boolean | null
	nextAiring: string | null
	dateAdded: string
	sizeBytes: number
	episodeCount: number
	missingEpisodeCount: number
}

// Nested types for detail page
export interface EpisodeWithFiles extends Episode {
	files: File[]
}

export interface SeasonWithEpisodes extends Season {
	episodes: EpisodeWithFiles[]
}

export interface SeriesWithDetails extends Series {
	sizeBytes: number
	episodeCount: number
	missingEpisodeCount: number
	seasons: SeasonWithEpisodes[]
}
