import type { Episode } from '@/../product/sections/tv/types'
import { Bookmark, Search, Calendar, HardDrive } from 'lucide-react'

interface EpisodeRowProps {
  episode: Episode
  isLast?: boolean
  disabled?: boolean
  onToggleMonitored?: (monitored: boolean) => void
  onSearch?: () => void
}

/**
 * EpisodeRow displays a single episode in the season table
 * with its status, quality, size, and action controls.
 */
export function EpisodeRow({
  episode,
  isLast = false,
  disabled = false,
  onToggleMonitored,
  onSearch
}: EpisodeRowProps) {
  // Format air date
  const formattedDate = new Date(episode.airDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  // Status badge styling
  const getStatusBadge = () => {
    switch (episode.status) {
      case 'downloaded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            <HardDrive className="w-3 h-3" />
            Downloaded
          </span>
        )
      case 'airing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
            <Calendar className="w-3 h-3" />
            Airing
          </span>
        )
      case 'missing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Missing
          </span>
        )
    }
  }

  // Format file size
  const formattedSize = episode.size
    ? `${episode.size.toFixed(1)} GB`
    : '—'

  return (
    <tr
      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
        !isLast ? 'border-b border-slate-200 dark:border-slate-800' : ''
      }`}
    >
      {/* Monitor Toggle */}
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleMonitored?.(!episode.monitored)}
          disabled={disabled}
          className={`p-1.5 rounded-sm transition-colors ${
            disabled
              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
              : episode.monitored
              ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
              : 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={
            disabled
              ? 'Series must be monitored'
              : episode.monitored
              ? 'Monitored'
              : 'Unmonitored'
          }
        >
          <Bookmark className={`w-4 h-4 ${episode.monitored ? 'fill-current' : ''}`} />
        </button>
      </td>

      {/* Episode Number */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {episode.episodeNumber}
        </span>
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-0.5">
            {episode.title}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {episode.runtime} min
          </div>
        </div>
      </td>

      {/* Air Date */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {formattedDate}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        {getStatusBadge()}
      </td>

      {/* Quality */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {episode.quality || '—'}
        </span>
      </td>

      {/* Size */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {formattedSize}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <button
            onClick={onSearch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Search for episode"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Search</span>
          </button>
        </div>
      </td>
    </tr>
  )
}

