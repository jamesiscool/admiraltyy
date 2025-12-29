// =============================================================================
// Data Types
// =============================================================================

export interface CastMember {
  name: string
  character: string
}

export interface MovieFile {
  id: string
  path: string
  size: number
  quality: '480p' | '720p' | '1080p' | '2160p'
  source: 'WEB-DL' | 'BluRay' | 'HDTV' | 'CAM' | 'Unknown'
  codec: 'H.264' | 'H.265' | 'x264' | 'x265' | 'Unknown'
  dateImported: string
}

export interface Movie {
  id: string
  tmdbId: number
  title: string
  year: number
  posterUrl: string
  backdropUrl: string
  synopsis: string
  runtime: number
  genres: string[]
  cast: CastMember[]
  cinemaReleaseDate: string
  digitalReleaseDate: string | null
  dateAdded: string
  monitored: boolean
  qualityPreference: '480p' | '720p' | '1080p' | '2160p'
  file: MovieFile | null
}

// =============================================================================
// Component Props
// =============================================================================

export interface MoviesListProps {
  /** The list of movies to display */
  movies: Movie[]
  /** Called when user clicks a movie card to view details */
  onView?: (id: string) => void
  /** Called when user triggers an automatic search for a movie */
  onAutoSearch?: (id: string) => void
  /** Called when user wants to manually search for releases */
  onManualSearch?: (id: string) => void
  /** Called when user wants to delete a movie from the library */
  onDelete?: (id: string) => void
  /** Called when user toggles the monitored state of a movie */
  onToggleMonitored?: (id: string, monitored: boolean) => void
  /** Called when user wants to edit the quality profile for a movie */
  onEditQuality?: (id: string) => void
  /** Called when user wants to add a new movie */
  onAddMovie?: () => void
}

export interface MovieDetailProps {
  /** The movie to display */
  movie: Movie
  /** Called when user triggers an automatic search */
  onAutoSearch?: () => void
  /** Called when user wants to manually search for releases */
  onManualSearch?: () => void
  /** Called when user wants to delete the movie */
  onDelete?: () => void
  /** Called when user toggles the monitored state */
  onToggleMonitored?: (monitored: boolean) => void
  /** Called when user wants to edit the quality profile */
  onEditQuality?: () => void
  /** Called when user navigates back to the movie list */
  onBack?: () => void
}

export interface AddMovieProps {
  /** Called when user searches TMDB for movies */
  onSearch?: (query: string) => void
  /** Called when user adds a movie from search results */
  onAddMovie?: (tmdbId: number) => void
  /** Called when user navigates back to the movie list */
  onBack?: () => void
}

