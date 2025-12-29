// Shared types between client and server

export type QualityPreference = '480p' | '720p' | '1080p' | '2160p';

export type DownloadStatus =
  | 'downloading'
  | 'paused'
  | 'queued'
  | 'unpacking'
  | 'verifying'
  | 'completed'
  | 'failed';

export type SeriesStatus = 'continuing' | 'ended';

// Movie types
export interface Movie {
  id: string;
  tmdbId: number;
  title: string;
  year: number;
  posterUrl?: string;
  backdropUrl?: string;
  synopsis?: string;
  runtime?: number;
  genres?: string[];
  cast?: string[];
  cinemaReleaseDate?: string;
  digitalReleaseDate?: string;
  dateAdded: string;
  monitored: boolean;
  qualityPreference: QualityPreference;
}

// Series types
export interface Series {
  id: string;
  tvdbId: number;
  title: string;
  year: number;
  status: SeriesStatus;
  network?: string;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  genres?: string[];
  runtime?: number;
  monitored: boolean;
  qualityPreference: QualityPreference;
  dateAdded: string;
  nextAiring?: string;
}

export interface Season {
  id: string;
  seriesId: string;
  seasonNumber: number;
  monitored: boolean;
}

export interface Episode {
  id: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  airDate?: string;
  monitored: boolean;
  runtime?: number;
}

// File types
export interface MediaFile {
  id: string;
  movieId?: string;
  episodeId?: string;
  path: string;
  size: number;
  quality: string;
  source?: string;
  codec?: string;
  dateImported: string;
}

// Download types
export interface Download {
  id: string;
  movieId?: string;
  episodeId?: string;
  title: string;
  progress: number;
  speed?: string;
  eta?: string;
  size?: string;
  status: DownloadStatus;
  quality?: string;
  dateDownloaded: string;
  errorMessage?: string;
}

// Indexer types
export interface Indexer {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  supportsSearch: boolean;
  supportsTvSearch: boolean;
  supportsMovieSearch: boolean;
}

// Server types
export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  ssl: boolean;
  priority: number;
  connections: number;
  enabled: boolean;
}

// Settings types
export interface Settings {
  [key: string]: unknown;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

