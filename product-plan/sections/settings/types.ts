// =============================================================================
// Data Types
// =============================================================================

export interface Indexer {
  id: string
  name: string
  url: string
  apiKey: string
  enabled: boolean
  supportsSearch: boolean
  supportsTvSearch: boolean
  supportsMovieSearch: boolean
}

export interface Server {
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
  /** Comma-separated match terms for release name matching (e.g., "x265, h265, hevc") */
  matchTerms: string[]
  /** Comma-separated exclude terms to reject false matches (e.g., HDR10 excludes "hdr10+, hdr10plus") */
  excludeTerms: string[]
}

export interface FormatSettings {
  codecs: FormatPreference[]
  hdrFormats: FormatPreference[]
  audioFormats: FormatPreference[]
}

export interface AuthSettings {
  enabled: boolean
  method: 'none' | 'form' | 'basic'
  username: string
  /** API key for external integrations (32-character alphanumeric string) */
  apiKey: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface SettingsProps {
  /** List of configured indexers */
  indexers: Indexer[]
  /** List of configured Usenet servers */
  servers: Server[]
  /** Movie and TV library folders */
  folders: Folders
  /** Quality tier definitions with size targets */
  qualityTiers: QualityTier[]
  /** Language preferences for subtitles and audio */
  languageSettings: LanguageSettings
  /** Format preferences for codecs, HDR, and audio */
  formatSettings: FormatSettings
  /** Authentication configuration */
  authSettings: AuthSettings

  // Indexer callbacks
  /** Called when user wants to add a new indexer */
  onAddIndexer?: () => void
  /** Called when user wants to edit an indexer */
  onEditIndexer?: (id: string) => void
  /** Called when user wants to delete an indexer */
  onDeleteIndexer?: (id: string) => void
  /** Called when user wants to test an indexer connection */
  onTestIndexer?: (id: string) => Promise<boolean>
  /** Called when user toggles an indexer's enabled state */
  onToggleIndexer?: (id: string, enabled: boolean) => void
  /** Called when user saves indexer changes */
  onSaveIndexer?: (indexer: Indexer) => void

  // Server callbacks
  /** Called when user wants to add a new server */
  onAddServer?: () => void
  /** Called when user wants to edit a server */
  onEditServer?: (id: string) => void
  /** Called when user wants to delete a server */
  onDeleteServer?: (id: string) => void
  /** Called when user wants to test a server connection */
  onTestServer?: (id: string) => Promise<boolean>
  /** Called when user reorders servers (provides new order) */
  onReorderServers?: (serverIds: string[]) => void
  /** Called when user saves server changes */
  onSaveServer?: (server: Server) => void

  // Folder callbacks
  /** Called when user wants to add a folder (type: 'movies' | 'tv') */
  onAddFolder?: (type: 'movies' | 'tv') => void
  /** Called when user wants to edit a folder path */
  onEditFolder?: (id: string) => void
  /** Called when user wants to delete a folder */
  onDeleteFolder?: (id: string) => void
  /** Called when user sets a folder as default */
  onSetDefaultFolder?: (id: string, type: 'movies' | 'tv') => void
  /** Called when user saves folder changes */
  onSaveFolder?: (folder: Folder, type: 'movies' | 'tv') => void

  // Quality callbacks
  /** Called when user updates a quality tier's size targets */
  onUpdateQualityTier?: (tier: QualityTier) => void

  // Language callbacks
  /** Called when user reorders subtitle languages */
  onReorderSubtitleLanguages?: (languageCodes: string[]) => void
  /** Called when user reorders audio languages */
  onReorderAudioLanguages?: (languageCodes: string[]) => void
  /** Called when user toggles prefer original audio */
  onTogglePreferOriginalAudio?: (enabled: boolean) => void
  /** Called when user toggles accept any audio fallback */
  onToggleAcceptAnyAudioFallback?: (enabled: boolean) => void
  /** Called when user adds a language to a list */
  onAddLanguage?: (type: 'subtitle' | 'audio', code: string) => void
  /** Called when user removes a language from a list */
  onRemoveLanguage?: (type: 'subtitle' | 'audio', code: string) => void

  // Format callbacks
  /** Called when user reorders codec preferences */
  onReorderCodecs?: (ids: string[]) => void
  /** Called when user reorders HDR format preferences */
  onReorderHdrFormats?: (ids: string[]) => void
  /** Called when user reorders audio format preferences */
  onReorderAudioFormats?: (ids: string[]) => void
  /** Called when user adds a format */
  onAddFormat?: (type: 'codec' | 'hdr' | 'audio', name: string) => void
  /** Called when user removes a format */
  onRemoveFormat?: (type: 'codec' | 'hdr' | 'audio', id: string) => void
  /** Called when user updates a format's match terms */
  onUpdateFormatMatchTerms?: (type: 'codec' | 'hdr' | 'audio', id: string, matchTerms: string[]) => void
  /** Called when user updates a format's exclude terms */
  onUpdateFormatExcludeTerms?: (type: 'codec' | 'hdr' | 'audio', id: string, excludeTerms: string[]) => void

  // Auth callbacks
  /** Called when user updates authentication settings */
  onUpdateAuthSettings?: (settings: AuthSettings) => void
  /** Called when user requests to regenerate the API key */
  onRegenerateApiKey?: () => Promise<string>
}

