import { Bookmark, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { Season } from '@/../product/sections/tv/types'
import { EpisodeRow } from './EpisodeRow'

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
export function SeasonTable({ season, seriesMonitored, onToggleSeasonMonitored, onToggleEpisodeMonitored, onSearchEpisode }: SeasonTableProps) {
	const [isExpanded, setIsExpanded] = useState(true)

	const progressPercentage = season.episodeCount > 0 ? Math.round((season.downloadedCount / season.episodeCount) * 100) : 0

	return (
		<div className="overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			{/* Season Header */}
			<div className="border-slate-200 border-b bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
				<div className="flex items-center justify-between gap-4">
					<div className="flex min-w-0 flex-1 items-center gap-3">
						{/* Season Monitoring Toggle */}
						<button
							onClick={() => onToggleSeasonMonitored?.(!season.monitored)}
							disabled={!seriesMonitored}
							className={`flex-shrink-0 rounded-sm p-1.5 transition-colors ${
								!seriesMonitored
									? 'cursor-not-allowed text-slate-300 dark:text-slate-700'
									: season.monitored
										? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950'
										: 'text-slate-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800'
							}`}
							title={!seriesMonitored ? 'Series must be monitored' : season.monitored ? 'Monitored' : 'Unmonitored'}
						>
							<Bookmark className={`h-5 w-5 ${season.monitored ? 'fill-current' : ''}`} />
						</button>

						{/* Season Title & Stats - Single Line */}
						<div className="flex min-w-0 flex-1 flex-wrap items-center gap-5">
							<h3 className="flex-shrink-0 font-bold text-lg text-slate-900 dark:text-slate-100">Season {season.seasonNumber}</h3>
							<span className="flex-shrink-0 text-slate-600 text-sm dark:text-slate-400">
								{season.downloadedCount} / {season.episodeCount} episodes
							</span>
							<span className="h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
							<div className="flex flex-shrink-0 items-center gap-2">
								<div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
									<div
										className="h-full bg-blue-600 transition-all dark:bg-blue-500"
										style={{ width: `${progressPercentage}%` }}
									/>
								</div>
								<span className="font-medium text-slate-600 text-xs dark:text-slate-400">{progressPercentage}%</span>
							</div>
						</div>
					</div>

					{/* Expand/Collapse Button */}
					<button
						onClick={() => setIsExpanded(!isExpanded)}
						className="flex-shrink-0 rounded-sm p-1 text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
					>
						{isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
					</button>
				</div>
			</div>

			{/* Episode Table */}
			{isExpanded && (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-slate-200 border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
								<th className="w-12 px-4 py-3 text-left font-semibold text-slate-600 text-xs dark:text-slate-400"></th>
								<th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs dark:text-slate-400">Episode</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs dark:text-slate-400">Title</th>
								<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs sm:table-cell dark:text-slate-400">Air Date</th>
								<th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs dark:text-slate-400">Status</th>
								<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs lg:table-cell dark:text-slate-400">Quality</th>
								<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs lg:table-cell dark:text-slate-400">Size</th>
								<th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs dark:text-slate-400">Actions</th>
							</tr>
						</thead>
						<tbody>
							{season.episodes.map((episode, index) => (
								<EpisodeRow
									key={episode.id}
									episode={episode}
									isLast={index === season.episodes.length - 1}
									disabled={!seriesMonitored}
									onToggleMonitored={(monitored) => onToggleEpisodeMonitored?.(episode.id, monitored)}
									onSearch={() => onSearchEpisode?.(episode.id)}
								/>
							))}
						</tbody>
					</table>

					{season.episodes.length === 0 && <div className="py-8 text-center text-slate-500 text-sm dark:text-slate-400">No episodes available</div>}
				</div>
			)}
		</div>
	)
}
