import { Calendar, Crosshair, Eye, EyeOff, MoreVertical, Search, Settings, Trash2, Tv } from 'lucide-react'
import { useState } from 'react'
import type { Series } from '@/../product/sections/tv/types'

interface TvSeriesCardProps {
	series: Series
	onView?: () => void
	onAutoSearch?: () => void
	onManualSearch?: () => void
	onDelete?: () => void
	onToggleMonitored?: (monitored: boolean) => void
	onEditQualityProfile?: () => void
}

export function TvSeriesCard({ series, onView, onAutoSearch, onManualSearch, onDelete, onToggleMonitored, onEditQualityProfile }: TvSeriesCardProps) {
	const [isHovered, setIsHovered] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)

	// Check for missing episodes (past air date, not downloaded)
	const hasMissingEpisodes = series.seasons.some((season) => season.episodes.some((ep) => ep.status === 'missing'))

	// Check for continuing episodes (future air date)
	const hasContinuingEpisodes = series.seasons.some((season) => season.episodes.some((ep) => ep.status === 'airing'))

	// Count missing episodes
	const missingEpisodeCount = series.seasons.reduce((count, season) => count + season.episodes.filter((ep) => ep.status === 'missing').length, 0)

	// Calculate download status
	const isFullyDownloaded = series.downloadedEpisodes === series.totalEpisodes

	const getStatusLabel = (): string | null => {
		if (isFullyDownloaded) return 'Complete'
		if (hasMissingEpisodes) return `${missingEpisodeCount} Missing`
		// Don't show episode count pill for continuing series (they have the next airing date badge)
		if (hasContinuingEpisodes) return null
		return `${series.downloadedEpisodes}/${series.totalEpisodes}`
	}

	const getStatusColor = () => {
		if (isFullyDownloaded) return 'bg-emerald-500/90 text-white'
		if (hasMissingEpisodes) return 'bg-amber-500/90 text-white'
		if (hasContinuingEpisodes) return 'bg-sky-500/90 text-white'
		return 'bg-slate-500/90 text-white'
	}

	// Format next airing date
	const formatNextAiring = (dateStr: string | null) => {
		if (!dateStr) return null

		const date = new Date(dateStr)
		const now = new Date()
		const diffTime = date.getTime() - now.getTime()
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

		if (diffDays < 0) return null
		if (diffDays === 0) return 'Today'
		if (diffDays === 1) return 'Tomorrow'
		if (diffDays <= 7) {
			return date.toLocaleDateString('en-US', { weekday: 'long' })
		}
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
	}

	const nextAiringLabel = formatNextAiring(series.nextAiring)

	return (
		<div
			className="group relative aspect-[2/3] w-[190px] cursor-pointer overflow-hidden rounded-sm transition-all duration-300 ease-out hover:z-10"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => {
				setIsHovered(false)
				setMenuOpen(false)
			}}
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
			<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

			{/* Hover overlay with actions */}
			<div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

			{/* Top-left badge: Next Airing Date OR Status Badge */}
			<div className="absolute top-2 left-2 z-10">
				{nextAiringLabel && series.monitored ? (
					<span className="inline-flex items-center gap-1 rounded-full bg-blue-600/90 px-2 py-0.5 font-semibold text-[10px] text-white tracking-wide shadow-lg">
						<Calendar className="h-2.5 w-2.5" />
						{nextAiringLabel}
					</span>
				) : getStatusLabel() ? (
					<span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[10px] tracking-wide shadow-lg ${getStatusColor()}`}>{getStatusLabel()}</span>
				) : null}
			</div>

			{/* Monitoring indicator */}
			{!series.monitored && (
				<div className="absolute top-9 left-2 z-10">
					<span className="inline-flex items-center gap-1 rounded-full bg-slate-800/90 px-1.5 py-0.5 font-medium text-[10px] text-slate-400">
						<EyeOff className="h-2.5 w-2.5" />
						Unmonitored
					</span>
				</div>
			)}

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

				{/* More menu */}
				<div className="relative">
					<button
						onClick={() => setMenuOpen(!menuOpen)}
						className="rounded-full bg-slate-700 p-2 text-white shadow-xl transition-all duration-200 hover:scale-110 hover:bg-slate-600"
						title="More Options"
					>
						<MoreVertical className="h-4 w-4" />
					</button>

					{/* Dropdown menu */}
					{menuOpen && (
						<div className="absolute top-full right-0 z-20 mt-2 w-48 rounded-sm border border-slate-700 bg-slate-800 py-1 shadow-2xl">
							<button
								onClick={() => {
									onToggleMonitored?.(!series.monitored)
									setMenuOpen(false)
								}}
								className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-200 text-sm transition-colors hover:bg-slate-700"
							>
								{series.monitored ? (
									<>
										<EyeOff className="h-4 w-4" />
										Unmonitor
									</>
								) : (
									<>
										<Eye className="h-4 w-4" />
										Monitor
									</>
								)}
							</button>
							<button
								onClick={() => {
									onEditQualityProfile?.()
									setMenuOpen(false)
								}}
								className="flex w-full items-center gap-3 px-4 py-2.5 text-slate-200 text-sm transition-colors hover:bg-slate-700"
							>
								<Settings className="h-4 w-4" />
								Edit Quality Profile
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Series info - bottom */}
			<div className="absolute right-0 bottom-0 left-0 z-10 p-3">
				<h3 className="mb-1 line-clamp-2 font-semibold text-base text-white leading-tight tracking-tight">{series.title}</h3>
				<div className="flex items-center gap-1.5 text-slate-300 text-sm">
					<span className="font-medium">{series.year}</span>
					<span className="text-slate-500">•</span>
					<span className="font-mono text-sky-400">{series.qualityPreference}</span>
				</div>
				{/* Episode count and status */}
				<div className="mt-1 text-slate-400 text-xs">
					{series.seasons.length} Season{series.seasons.length !== 1 ? 's' : ''} • {series.totalEpisodes} Ep{series.totalEpisodes !== 1 ? 's' : ''}
					{series.status === 'ended' && <span> • Ended</span>}
				</div>
			</div>

			{/* Progress bar */}
			{series.totalEpisodes > 0 && (
				<div className="absolute right-0 bottom-0 left-0 h-1 bg-slate-800/80">
					<div
						className={`h-full transition-all duration-500 ${isFullyDownloaded ? 'bg-emerald-500' : hasMissingEpisodes ? 'bg-amber-500' : hasContinuingEpisodes ? 'bg-sky-500' : 'bg-slate-500'}`}
						style={{
							width: `${(series.downloadedEpisodes / series.totalEpisodes) * 100}%`,
						}}
					/>
				</div>
			)}

			{/* Hover glow effect */}
			<div
				className={`pointer-events-none absolute inset-0 rounded-sm ring-2 transition-opacity duration-300 ${
					isFullyDownloaded ? 'ring-emerald-500/50' : hasContinuingEpisodes ? 'ring-sky-500/50' : 'ring-blue-500/50'
				} ${isHovered ? 'opacity-100' : 'opacity-0'}`}
			/>
		</div>
	)
}
