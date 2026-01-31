// Client-safe types for indexer releases

export interface IndexerRelease {
	guid: string
	title: string
	downloadUrl: string
	infoUrl?: string
	size: number
	publishDate: Date
	indexerId: string
	indexerName: string
	tmdbId?: number
	imdbId?: string
	tvdbId?: number
	season?: number
	episode?: number
}

export interface MovieSearchOptions {
	tmdbId: number
	imdbId?: string
	title?: string
	year?: number
}

export interface EpisodeSearchOptions {
	tmdbId?: number
	tvdbId?: number
	season: number
	episode: number
	title?: string
}
