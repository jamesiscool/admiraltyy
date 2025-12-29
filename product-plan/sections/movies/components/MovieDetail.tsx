import type { MovieDetailProps } from '@/../product/sections/movies/types'
import { 
  ArrowLeft, 
  Bookmark, 
  Search, 
  Trash2, 
  Settings,
  Calendar,
  Film,
  HardDrive,
  Clock
} from 'lucide-react'

/**
 * MovieDetail component displays detailed information about a movie
 * including synopsis, cast, file details, and release dates.
 * 
 * Design tokens applied:
 * - Primary (blue): Action buttons, links, monitoring badges
 * - Secondary (sky): Genre tags, status indicators
 * - Neutral (slate): Text, borders, backgrounds
 */
export function MovieDetail({
  movie,
  onAutoSearch,
  onManualSearch,
  onDelete,
  onToggleMonitored,
  onEditQuality,
  onBack
}: MovieDetailProps) {
  // Format file size (bytes to human readable)
  const formatFileSize = (bytes: number) => {
    const gb = bytes / 1_000_000_000
    if (gb >= 1000) return `${(gb / 1000).toFixed(2)} TB`
    return `${gb.toFixed(1)} GB`
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const hasFile = movie.file !== null

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Back Button */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Movies
          </button>
        </div>
      </div>

      {/* Movie Header */}
      <div className="relative border-b border-slate-200 dark:border-slate-800">
        {/* Backdrop Image */}
        {movie.backdropUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={movie.backdropUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/50 dark:from-slate-950/90 dark:via-slate-950/70 dark:to-slate-950/50" />
          </div>
        )}

        {/* Content */}
        <div className={`relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 ${!movie.backdropUrl ? 'bg-slate-50 dark:bg-slate-900' : ''}`}>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-48 h-72 object-cover rounded-sm shadow-xl ring-1 ring-slate-900/10 dark:ring-slate-100/10"
              />
            </div>

            {/* Movie Info */}
            <div className="flex-1 min-w-0">
              {/* Title & Year */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className={`text-3xl font-bold mb-2 ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {movie.title}
                  </h1>
                  <div className={`flex flex-wrap items-center gap-3 text-sm ${movie.backdropUrl ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                    <span className="font-medium">{movie.year}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                    <span>{movie.runtime} min</span>
                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                    <span className={`font-medium ${hasFile ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {hasFile ? 'Downloaded' : 'Wanted'}
                    </span>
                  </div>
                </div>

                {/* Monitoring Toggle */}
                <button
                  onClick={() => onToggleMonitored?.(!movie.monitored)}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-sm font-medium text-sm transition-colors ${
                    movie.monitored
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${movie.monitored ? 'fill-current' : ''}`} />
                  {movie.monitored ? 'Monitored' : 'Unmonitored'}
                </button>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-4">
                {movie.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              <p className={`leading-relaxed mb-6 ${movie.backdropUrl ? 'text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                {movie.synopsis}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className={`rounded-sm border p-4 ${movie.backdropUrl ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center gap-2 text-xs mb-1 ${movie.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Settings className="w-3.5 h-3.5" />
                    Quality
                  </div>
                  <div className={`text-lg font-bold ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {movie.qualityPreference}
                  </div>
                </div>

                <div className={`rounded-sm border p-4 ${movie.backdropUrl ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center gap-2 text-xs mb-1 ${movie.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    Cinema Release
                  </div>
                  <div className={`text-sm font-medium ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {formatDate(movie.cinemaReleaseDate)}
                  </div>
                </div>

                <div className={`rounded-sm border p-4 ${movie.backdropUrl ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center gap-2 text-xs mb-1 ${movie.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Film className="w-3.5 h-3.5" />
                    Digital Release
                  </div>
                  <div className={`text-sm font-medium ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {formatDate(movie.digitalReleaseDate)}
                  </div>
                </div>

                <div className={`rounded-sm border p-4 ${movie.backdropUrl ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center gap-2 text-xs mb-1 ${movie.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    Added
                  </div>
                  <div className={`text-sm font-medium ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {formatDate(movie.dateAdded)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onAutoSearch}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm font-medium text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Auto Search
                </button>
                <button
                  onClick={onManualSearch}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm font-medium text-sm bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Manual Search
                </button>
                <button
                  onClick={onEditQuality}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm font-medium text-sm bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Edit Quality
                </button>
                <button
                  onClick={onDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm font-medium text-sm bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 border border-slate-300 dark:border-slate-600 hover:border-red-300 dark:hover:border-red-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Movie
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Details & Cast */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Details Section */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              File Details
            </h2>
            {hasFile && movie.file ? (
              <div className="rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-white dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="px-4 py-3 flex items-start gap-3">
                    <HardDrive className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Path
                      </div>
                      <div className="text-sm text-slate-900 dark:text-slate-100 font-mono break-all">
                        {movie.file.path}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4">
                    <div className="px-4 py-3 border-r border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Size
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatFileSize(movie.file.size)}
                      </div>
                    </div>
                    <div className="px-4 py-3 border-r border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Quality
                      </div>
                      <div className="text-sm font-medium text-sky-600 dark:text-sky-400">
                        {movie.file.quality}
                      </div>
                    </div>
                    <div className="px-4 py-3 border-r border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Source
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {movie.file.source}
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Codec
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {movie.file.codec}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Date Imported
                    </div>
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      {formatDate(movie.file.dateImported)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 text-center">
                <Film className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  No file downloaded yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Use Auto Search or Manual Search to find and download this movie
                </p>
              </div>
            )}
          </div>

          {/* Cast Section */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Cast
            </h2>
            <div className="rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Character
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {movie.cast.map((castMember, index) => (
                    <tr key={index} className="bg-white dark:bg-slate-950">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {castMember.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {castMember.character}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {movie.cast.length === 0 && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No cast information available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

