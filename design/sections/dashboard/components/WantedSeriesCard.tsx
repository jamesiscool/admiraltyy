import { Calendar, Crosshair, Search, Trash2, Tv } from 'lucide-react'
import { useState } from 'react'
import type { WantedSeries } from '@/../product/sections/dashboard/types'

interface WantedSeriesCardProps {
	wantedSeries: WantedSeries
	onView?: () => void
	onAutoSearch?: () => void
	onManualSearch?: () => void
	onDelete?: () => void
}

/**
 * Format a date string to a humanized relative date.
 * "tomorrow", day of week (within 1 week), or full date.
 */
function formatAirDate(dateStr: string | null): string | null {
	if (!dateStr) return null

	const date = new Date(dateStr)
	const now = new Date()
	const diffTime = date.getTime() - now.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

	if (diffDays < 0) {
		// Already aired
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
	}
	if (diffDays === 0) return 'Today'
	if (diffDays === 1) return 'Tomorrow'
	if (diffDays <= 7) {
		return date.toLocaleDateString('en-US', { weekday: 'long' })
	}
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function WantedSeriesCard({ wantedSeries, onView, onAutoSearch, onManualSearch, onDelete }: WantedSeriesCardProps) {
	const [isHovered, setIsHovered] = useState(false)

	const { series, nextWantedEpisode } = wantedSeries
	const nextAirDate = nextWantedEpisode?.airDate ? formatAirDate(nextWantedEpisode.airDate) : null

	// Determine badge color based on episode status
	const isMissing = nextWantedEpisode?.status === 'missing'
	const isAiring = nextWantedEpisode?.status === 'airing'

	return (
		<div
			className="group relative aspect-[2/3] w-[160px] flex-shrink-0 cursor-pointer overflow-hidden rounded-sm transition-all duration-300 ease-out hover:z-10 sm:w-[180px]"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={() => onView?.()}
		>
			{/* Poster Image */}
			<div className="absolute inset-0 bg-slate-800">
				<img
					src={series.posterUrl}
					alt={series.title}
					className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
					onError={(e) => {
						e.currentTarget.style.display = 'none'
					}}
				/>
				{/* Fallback poster placeholder */}
				<div className="absolute inset-0 -z-10 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
					<Tv className="h-12 w-12 text-slate-600" />
				</div>
			</div>

			{/* Gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

			{/* Hover overlay with actions */}
			<div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

			{/* Top-left badge: Next airing date or Missing status */}
			<div className="absolute top-2 left-2 z-10">
				{isAiring && nextAirDate ? (
					<span className="inline-flex items-center gap-1 rounded-full bg-blue-600/90 px-2 py-0.5 font-semibold text-[10px] text-white tracking-wide shadow-lg">
						<Calendar className="h-2.5 w-2.5" />
						{nextAirDate}
					</span>
				) : isMissing ? (
					<span className="inline-flex items-center rounded-full bg-amber-500/90 px-2 py-0.5 font-semibold text-[10px] text-white tracking-wide shadow-lg">Missing</span>
				) : null}
			</div>

			{/* Action buttons - visible on hover */}
			<div
				className={`absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 transition-all duration-200 ${isHovered ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
				onClick={(e) => e.stopPropagation()}
			>
				<button
					onClick={() => onAutoSearch?.()}
					className="rounded-full bg-blue-600 p-2 text-white shadow-blue-600/30 shadow-xl transition-all duration-200 hover:scale-110 hover:bg-blue-500"
					title="Auto Search"
				>
					<Crosshair className="h-4 w-4" />
				</button>
				<button
					onClick={() => onManualSearch?.()}
					className="rounded-full bg-slate-700 p-2 text-white shadow-xl transition-all duration-200 hover:scale-110 hover:bg-slate-600"
					title="Manual Search"
				>
					<Search className="h-4 w-4" />
				</button>
				<button
					onClick={() => onDelete?.()}
					className="rounded-full bg-slate-700 p-2 text-white shadow-xl transition-all duration-200 hover:scale-110 hover:bg-red-600"
					title="Delete"
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>

			{/* Series info - bottom */}
			<div className="absolute right-0 bottom-0 left-0 z-10 p-2.5">
				<h3 className="mb-1 line-clamp-2 font-semibold text-base text-white leading-tight tracking-tight">{series.title}</h3>

				{/* Next episode info */}
				{nextWantedEpisode && (
					<div className="flex items-center gap-1.5 text-slate-300 text-sm">
						<span className="font-medium">
							S{String(nextWantedEpisode.seasonNumber).padStart(2, '0')}E{String(nextWantedEpisode.episodeNumber).padStart(2, '0')}
						</span>
					</div>
				)}
			</div>
		</div>
	)
}
