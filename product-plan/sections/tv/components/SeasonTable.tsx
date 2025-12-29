import type { Season } from '@/../product/sections/tv/types'
import { EpisodeRow } from './EpisodeRow'
import { Bookmark, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface SeasonTableProps {
  season: Season
  seriesMonitored: boolean
  onToggleSeasonMonitored?: (monitored: boolean) => void
  onToggleEpisodeMonitored?: (episodeId: string, monitored: boolean) => void
  onSearchEpisode?: (episodeId: string) => void
}

/**
 * SeasonTable displays a collapsible table of episodes for a specific season.
 * Includes season-level monitoring toggle and statistics.
 */
export function SeasonTable({
  season,
  seriesMonitored,
  onToggleSeasonMonitored,
  onToggleEpisodeMonitored,
  onSearchEpisode
}: SeasonTableProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const progressPercentage = season.episodeCount > 0
    ? Math.round((season.downloadedCount / season.episodeCount) * 100)
    : 0

  return (
    <div className="bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Season Header */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Season Monitoring Toggle */}
            <button
              onClick={() => onToggleSeasonMonitored?.(!season.monitored)}
              disabled={!seriesMonitored}
              className={`flex-shrink-0 p-1.5 rounded-sm transition-colors ${
                !seriesMonitored
                  ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                  : season.monitored
                  ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                  : 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={
                !seriesMonitored
                  ? 'Series must be monitored'
                  : season.monitored
                  ? 'Monitored'
                  : 'Unmonitored'
              }
            >
              <Bookmark className={`w-5 h-5 ${season.monitored ? 'fill-current' : ''}`} />
            </button>

            {/* Season Title & Stats - Single Line */}
            <div className="min-w-0 flex-1 flex items-center gap-5 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex-shrink-0">
                Season {season.seasonNumber}
              </h3>
              <span className="text-sm text-slate-600 dark:text-slate-400 flex-shrink-0">
                {season.downloadedCount} / {season.episodeCount} episodes
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{progressPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-1 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Episode Table */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 w-12">
                  
                </th>
                <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
                  Episode
                </th>
                <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
                  Title
                </th>
                <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden sm:table-cell">
                  Air Date
                </th>
                <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden lg:table-cell">
                  Quality
                </th>
                <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden lg:table-cell">
                  Size
                </th>
                <th className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {season.episodes.map((episode, index) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  isLast={index === season.episodes.length - 1}
                  disabled={!seriesMonitored}
                  onToggleMonitored={(monitored) =>
                    onToggleEpisodeMonitored?.(episode.id, monitored)
                  }
                  onSearch={() => onSearchEpisode?.(episode.id)}
                />
              ))}
            </tbody>
          </table>

          {season.episodes.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              No episodes available
            </div>
          )}
        </div>
      )}
    </div>
  )
}

