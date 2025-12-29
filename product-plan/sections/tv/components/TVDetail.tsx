import type { TVDetailProps } from '@/../product/sections/tv/types'
import { SeasonTable } from './SeasonTable'
import { 
  ArrowLeft, 
  Bookmark, 
  Search, 
  Trash2, 
  Settings,
  Calendar,
  Tv,
  Clock
} from 'lucide-react'

/**
 * TVDetail component displays detailed information about a TV series
 * including synopsis, metadata, and episode tables organized by season.
 * 
 * Design tokens applied:
 * - Primary (blue): Action buttons, links, monitoring badges
 * - Secondary (sky): Status indicators, secondary actions
 * - Neutral (slate): Text, borders, backgrounds
 */
export function TVDetail({
  series,
  onAutoSearch,
  onManualSearch,
  onDelete,
  onToggleMonitored,
  onEditQualityProfile,
  onBack,
  onToggleSeasonMonitored,
  onToggleEpisodeMonitored,
  onSearchEpisode
}: TVDetailProps) {
  // Calculate progress percentage
  const progressPercentage = series.totalEpisodes > 0
    ? Math.round((series.downloadedEpisodes / series.totalEpisodes) * 100)
    : 0

  // Sort seasons by season number descending (most recent first)
  const sortedSeasons = [...series.seasons].sort((a, b) => b.seasonNumber - a.seasonNumber)

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
            Back to TV Series
          </button>
        </div>
      </div>

      {/* Series Header */}
      <div className="relative border-b border-slate-200 dark:border-slate-800">
        {/* Backdrop Image */}
        {series.backdropUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={series.backdropUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/50 dark:from-slate-950/90 dark:via-slate-950/70 dark:to-slate-950/50" />
          </div>
        )}

        {/* Content */}
        <div className={`relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 ${!series.backdropUrl ? 'bg-slate-50 dark:bg-slate-900' : ''}`}>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <img
                src={series.posterUrl}
                alt={series.title}
                className="w-48 h-72 object-cover rounded-sm shadow-xl ring-1 ring-slate-900/10 dark:ring-slate-100/10"
              />
            </div>

            {/* Series Info */}
            <div className="flex-1 min-w-0">
              {/* Title & Year */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className={`text-3xl font-bold mb-2 ${series.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {series.title}
                  </h1>
                  <div className={`flex flex-wrap items-center gap-3 text-sm ${series.backdropUrl ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                    <span className="font-medium">{series.year}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                    <span className="capitalize">{series.status}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                    <span>{series.network}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                    <span>{series.runtime} min</span>
                  </div>
                </div>

                {/* Monitoring Toggle */}
                <button
                  onClick={() => onToggleMonitored?.(!series.monitored)}
                  className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-sm font-medium text-sm transition-colors ${
                    series.monitored
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${series.monitored ? 'fill-current' : ''}`} />
                  {series.monitored ? 'Monitored' : 'Unmonitored'}
                </button>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-4">
                {series.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Overview */}
              <p className={`leading-relaxed mb-6 ${series.backdropUrl ? 'text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                {series.overview}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className={`rounded-sm border p-4 ${series.backdropUrl ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center gap-2 text-xs mb-1 ${series.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Tv className="w-3.5 h-3.5" />
                    Episodes
                  </div>
                  <div className={`text-lg font-bold ${series.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {series.downloadedEpisodes} / {series.totalEpisodes}
                  </div>
                </div>

                <div className={`rounded-sm border p-4 ${series.backdropUrl ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center gap-2 text-xs mb-1 ${series.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Settings className="w-3.5 h-3.5" />
                    Quality
                  </div>
                  <div className={`text-lg font-bold ${series.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {series.qualityPreference}
                  </div>
                </div>

                <div className={`rounded-sm border p-4 ${series.backdropUrl ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center gap-2 text-xs mb-1 ${series.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    Next Airing
                  </div>
                  <div className={`text-sm font-medium ${series.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {series.nextAiring
                      ? new Date(series.nextAiring).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'N/A'}
                  </div>
                </div>

                <div className={`rounded-sm border p-4 ${series.backdropUrl ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center gap-2 text-xs mb-1 ${series.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    Progress
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${series.backdropUrl ? 'bg-slate-700' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${series.backdropUrl ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      {progressPercentage}%
                    </span>
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
                  onClick={onEditQualityProfile}
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
                  Delete Series
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seasons & Episodes */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="sr-only">
          Seasons & Episodes
        </h2>

        <div className="space-y-8">
          {sortedSeasons.map((season) => (
            <SeasonTable
              key={season.id}
              season={season}
              seriesMonitored={series.monitored}
              onToggleSeasonMonitored={(monitored) =>
                onToggleSeasonMonitored?.(season.id, monitored)
              }
              onToggleEpisodeMonitored={onToggleEpisodeMonitored}
              onSearchEpisode={onSearchEpisode}
            />
          ))}
        </div>

        {sortedSeasons.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            No seasons available
          </div>
        )}
      </div>
    </div>
  )
}

