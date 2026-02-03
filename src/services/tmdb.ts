// Client-safe types for TMDB data

// --- Movie Types ---

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
	cinemaReleaseDate?: string
	digitalReleaseDate?: string
	contentRating?: string
	alternateTitles: string[]
}

// --- Series Types ---

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
