export interface Indexer {
	id: string
	name: string
	url: string
	apiKey: string
	enabled: boolean
	priority: number
}

export interface UsenetServer {
	id: string
	name: string
	host: string
	port: number
	username: string
	password: string
	ssl: boolean
	priority: number
	connections: number
	enabled: boolean
}

export interface Folder {
	id: string
	path: string
	isDefault: boolean
}

export interface Folders {
	movies: Folder[]
	tv: Folder[]
}

export interface QualityTier {
	id: string
	name: string
	resolution: 480 | 720 | 1080 | 2160
	minGbPerHour: number
	targetGbPerHour: number
	maxGbPerHour: number
}

export interface Language {
	code: string
	name: string
	priority: number
}

export interface LanguageSettings {
	subtitleLanguages: Language[]
	audioLanguages: Language[]
	preferOriginalAudio: boolean
	acceptAnyAudioFallback: boolean
}

export interface FormatPreference {
	id: string
	name: string
	priority: number
	matchTerms: string[]
	excludeTerms: string[]
}

export interface FormatSettings {
	codecs: FormatPreference[]
	hdrFormats: FormatPreference[]
	audioFormats: FormatPreference[]
}
