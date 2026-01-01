import { Link } from '@tanstack/react-router'
import { Bookmark, EyeOff, Film, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/client/components/ui/badge'
import type { Movie } from '@/server/db/schema'

interface MovieCardProps {
	movie: Movie
	onAutoSearch?: () => void
	onManualSearch?: () => void
	onDelete?: () => void
	onToggleMonitored?: (monitored: boolean) => void
}

export function MovieCard({ movie, onAutoSearch, onManualSearch, onDelete, onToggleMonitored }: MovieCardProps) {
	const [isHovered, setIsHovered] = useState(false)

	// Movie doesn't have file association in the schema yet, so we'll treat all as "wanted" for now
	// TODO: Join with files table when we need downloaded status
	const hasFile = false

	return (
		<Link
			to="/movies/$movieId"
			params={{ movieId: String(movie.id) }}
			className="group relative block aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-sm transition-all duration-300 ease-out hover:z-10"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{/* Poster Image */}
			<div className="absolute inset-0 bg-neutral-800">
				{movie.posterUrl ? (
					<img
						src={movie.posterUrl}
						alt={movie.title}
						className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						onError={(e) => {
							e.currentTarget.style.display = 'none'
						}}
					/>
				) : null}
				{/* Fallback poster placeholder */}
				<div className="absolute inset-0 -z-10 flex items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900">
					<Film className="size-12 text-neutral-600" />
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

			{/* Top-left badge: Status Badge */}
			<div className="absolute top-[7px] left-2 z-10">
				<Badge
					// biome-ignore lint/nursery/noUnnecessaryConditions: Need to wire up files later on
					variant={hasFile ? 'downloaded' : 'wanted'}
					className="h-auto py-0.5 text-[11px] tracking-wide"
				>
					{/** biome-ignore lint/nursery/noUnnecessaryConditions: Need to wire up files later on */}
					{hasFile ? 'Downloaded' : 'Missing'}
				</Badge>
			</div>

			{/* Monitoring indicator */}
			{!movie.monitored && (
				<div className="absolute top-9 left-2 z-10">
					<span
						className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium text-[10px]"
						style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: 'rgba(255,255,255,0.7)' }}
					>
						<EyeOff className="size-2.5" />
						Unmonitored
					</span>
				</div>
			)}

			{/* Action buttons - vertical list visible on hover */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: Stops propagation to parent card */}
			<div
				className={`absolute top-[40%] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-1.5 transition-all duration-200 ${isHovered ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{/* Monitored toggle */}
				<button
					type="button"
					onClick={() => onToggleMonitored?.(!movie.monitored)}
					className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-4 py-1.5 font-medium text-white text-xs shadow-lg transition-colors hover:bg-blue-500"
				>
					{movie.monitored ? <Bookmark className="size-3.5 fill-current" /> : <Bookmark className="size-3.5" />}
					{movie.monitored ? 'Monitored' : 'Unmonitored'}
				</button>

				{/* Auto Search */}
				<button
					type="button"
					onClick={() => onAutoSearch?.()}
					className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-4 py-1.5 font-medium text-white text-xs shadow-lg transition-colors hover:bg-blue-500"
				>
					<Search className="size-3.5" />
					Auto Search
				</button>

				{/* Manual Search */}
				<button
					type="button"
					onClick={() => onManualSearch?.()}
					className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-500 bg-transparent px-4 py-1.5 font-medium text-white text-xs shadow-lg transition-colors hover:bg-neutral-700"
				>
					<Search className="size-3.5" />
					Manual Search
				</button>

				{/* Delete - only show if no file */}
				{!hasFile && (
					<button
						type="button"
						onClick={() => onDelete?.()}
						className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-red-500/50 bg-transparent px-4 py-1.5 font-medium text-red-400 text-xs shadow-lg transition-colors hover:bg-red-600/20"
					>
						<Trash2 className="size-3.5" />
						Delete Movie
					</button>
				)}
			</div>

			{/* Movie info - bottom */}
			<div className="absolute right-0 bottom-0 left-0 z-10 p-3">
				<h3 className="mb-1 line-clamp-2 font-semibold text-base text-white leading-tight tracking-tight">{movie.title}</h3>
				<div className="flex items-center gap-1.5 text-sm text-white/80">
					<span className="font-medium">{movie.year}</span>
					<span className="text-white/50">•</span>
					<span className="font-mono text-blue-300">{movie.resolution}</span>
				</div>
				{/* Runtime and file size */}
				<div className="mt-1 text-white/60 text-xs">{movie.runtimeMins} min</div>
			</div>
		</Link>
	)
}
