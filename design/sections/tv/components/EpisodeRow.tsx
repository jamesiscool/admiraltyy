import { Bookmark, Calendar, HardDrive, Search } from 'lucide-react'
import type { Episode } from '@/../product/sections/tv/types'

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
export function EpisodeRow({ episode, isLast = false, disabled = false, onToggleMonitored, onSearch }: EpisodeRowProps) {
	// Format air date
	const formattedDate = new Date(episode.airDate).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})

	// Status badge styling
	const getStatusBadge = () => {
		switch (episode.status) {
			case 'downloaded':
				return (
					<span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 text-xs dark:bg-blue-950 dark:text-blue-300">
						<HardDrive className="h-3 w-3" />
						Downloaded
					</span>
				)
			case 'airing':
				return (
					<span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700 text-xs dark:bg-sky-950 dark:text-sky-300">
						<Calendar className="h-3 w-3" />
						Airing
					</span>
				)
			case 'missing':
				return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-300">Missing</span>
		}
	}

	// Format file size
	const formattedSize = episode.size ? `${episode.size.toFixed(1)} GB` : '—'

	return (
		<tr className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!isLast ? 'border-slate-200 border-b dark:border-slate-800' : ''}`}>
			{/* Monitor Toggle */}
			<td className="px-4 py-3">
				<button
					onClick={() => onToggleMonitored?.(!episode.monitored)}
					disabled={disabled}
					className={`rounded-sm p-1.5 transition-colors ${
						disabled
							? 'cursor-not-allowed text-slate-300 dark:text-slate-700'
							: episode.monitored
								? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950'
								: 'text-slate-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800'
					}`}
					title={disabled ? 'Series must be monitored' : episode.monitored ? 'Monitored' : 'Unmonitored'}
				>
					<Bookmark className={`h-4 w-4 ${episode.monitored ? 'fill-current' : ''}`} />
				</button>
			</td>

			{/* Episode Number */}
			<td className="px-4 py-3">
				<span className="font-medium text-slate-900 text-sm dark:text-slate-100">{episode.episodeNumber}</span>
			</td>

			{/* Title */}
			<td className="px-4 py-3">
				<div>
					<div className="mb-0.5 font-medium text-slate-900 text-sm dark:text-slate-100">{episode.title}</div>
					<div className="text-slate-500 text-xs dark:text-slate-400">{episode.runtime} min</div>
				</div>
			</td>

			{/* Air Date */}
			<td className="hidden px-4 py-3 sm:table-cell">
				<span className="text-slate-700 text-sm dark:text-slate-300">{formattedDate}</span>
			</td>

			{/* Status */}
			<td className="px-4 py-3">{getStatusBadge()}</td>

			{/* Quality */}
			<td className="hidden px-4 py-3 lg:table-cell">
				<span className="font-medium text-slate-700 text-sm dark:text-slate-300">{episode.quality || '—'}</span>
			</td>

			{/* Size */}
			<td className="hidden px-4 py-3 lg:table-cell">
				<span className="text-slate-700 text-sm dark:text-slate-300">{formattedSize}</span>
			</td>

			{/* Actions */}
			<td className="px-4 py-3">
				<div className="flex justify-end">
					<button
						onClick={onSearch}
						className="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium text-slate-700 text-xs transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
						title="Search for episode"
					>
						<Search className="h-3.5 w-3.5" />
						<span className="hidden xl:inline">Search</span>
					</button>
				</div>
			</td>
		</tr>
	)
}
