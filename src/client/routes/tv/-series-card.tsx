import { Link } from '@tanstack/react-router'
import { Bookmark, Search, Trash2, Tv } from 'lucide-react'
import { useState } from 'react'
import type { SeriesPreview } from '@/server/routes/series'

interface SeriesCardProps {
	series: SeriesPreview
	onAutoSearch?: () => void
	onManualSearch?: () => void
	onDelete?: () => void
	onToggleMonitored?: (monitored: boolean) => void
}

export function SeriesCard({ series, onAutoSearch, onManualSearch, onDelete, onToggleMonitored }: SeriesCardProps) {
	const [isHovered, setIsHovered] = useState(false)

	const hasFile = series.sizeBytes !== undefined

	// Format next airing date with humanization:
	// - Within 24h: time like "8 p.m."
	// - 24h to 7 days: day name like "Wednesday"
	// - More than 7 days: date like "4 Feb"
	const formatNextAiring = (dateStr: string | null) => {
		if (!dateStr) return null

		const date = new Date(dateStr)
		const now = new Date()
		const diffMs = date.getTime() - now.getTime()
		const diffHours = diffMs / (1000 * 60 * 60)

		if (diffMs < 0) return null

		// Within 24 hours: show time like "8 p.m."
		if (diffHours < 24) {
			const hour = date.getHours()
			const period = hour >= 12 ? 'p.m.' : 'a.m.'
			const hour12 = hour % 12 || 12
			return `${hour12} ${period}`
		}

		// Within 7 days: show day name
		const diffDays = diffMs / (1000 * 60 * 60 * 24)
		if (diffDays < 7) {
			return date.toLocaleDateString('en-US', { weekday: 'long' })
		}

		// More than 7 days: show date like "4 Feb"
		const day = date.getDate()
		const month = date.toLocaleDateString('en-US', { month: 'short' })
		return `${day} ${month}`
	}

	const nextAiringLabel = formatNextAiring(series.nextAiring ?? null)

	return (
		<Link
			to="/tv/$seriesId"
			params={{ seriesId: String(series.id) }}
			className="group relative block aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-sm transition-all duration-300 ease-out hover:z-10"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{/* Poster Image */}
			<div className="absolute inset-0 bg-neutral-800">
				{series.posterUrl ? (
					<img
						src={series.posterUrl}
						alt={series.title}
						className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						onError={(e) => {
							e.currentTarget.style.display = 'none'
						}}
					/>
				) : null}
				{/* Fallback poster placeholder */}
				<div className="absolute inset-0 -z-10 flex items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900">
					<Tv className="size-12 text-neutral-600" />
				</div>
			</div>

			{/* Gradient overlay */}
			<div
				className="absolute inset-0"
				style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }}
			/>

			{/* Hover overlay with actions */}
			<div
				className={`absolute inset-0 backdrop-blur-[2px] transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
				style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
			/>

			{/* Action buttons - vertical list visible on hover */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Stops propagation to parent card */}
			<div
				className={`absolute top-[40%] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-1.5 transition-all duration-200 ${isHovered ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
				onClick={(e) => {
					e.preventDefault()
					e.stopPropagation()
				}}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{/* Monitored toggle */}
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault()
						onToggleMonitored?.(!series.monitored)
					}}
					className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-pink-600 px-4 py-2 font-medium text-white text-xs shadow-lg transition-colors hover:bg-pink-700"
				>
					{series.monitored ? <Bookmark className="size-3.5 fill-current" /> : <Bookmark className="size-3.5" />}
					{series.monitored ? 'Monitored' : 'Unmonitored'}
				</button>

				{/* Auto Search */}
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault()
						onAutoSearch?.()
					}}
					className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-blue-500 px-4 py-2 font-medium text-white text-xs shadow-lg transition-colors hover:bg-blue-600"
				>
					<Search className="size-3.5" />
					Auto Search
				</button>

				{/* Manual Search */}
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault()
						onManualSearch?.()
					}}
					className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-white px-4 py-2 font-medium text-foreground text-xs shadow-lg transition-colors hover:bg-neutral-100"
				>
					<Search className="size-3.5" />
					Manual Search
				</button>

				{/* Delete */}
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault()
						onDelete?.()
					}}
					className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-red-100 px-4 py-2 font-medium text-red-600 text-xs shadow-lg transition-colors hover:bg-red-200"
				>
					<Trash2 className="size-3.5" />
					Delete Series
				</button>
			</div>

			{/* Series info - bottom */}
			<div className="absolute right-0 bottom-0 left-0 z-10 p-3">
				<h3 className="mb-1 line-clamp-2 font-semibold text-base text-white leading-tight tracking-tight">{series.title}</h3>
				<div className="flex items-center gap-1 text-sm text-white/80">
					<span className="font-medium">{series.year}</span>
					<span className="text-white/50">•</span>
					<span className="font-mono text-blue-300">{series.resolution}</span>
					<span className="text-white/50">•</span>
					{hasFile && series.sizeBytes ? (
						nextAiringLabel ? (
							<span className="text-white/80">{nextAiringLabel}</span>
						) : (
							<span className="text-size">{(series.sizeBytes / 1073741824).toFixed(1)} GB</span>
						)
					) : series.monitored ? (
						<span className="text-yellow-400">{series.missingEpisodeCount && series.missingEpisodeCount > 0 ? `${series.missingEpisodeCount} ` : ''}Missing</span>
					) : (
						<Bookmark className="size-3.5 text-pink-300" />
					)}
				</div>
			</div>
		</Link>
	)
}
