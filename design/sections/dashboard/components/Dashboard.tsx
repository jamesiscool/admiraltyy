import { Download, Film, Tv } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DashboardProps } from '@/../product/sections/dashboard/types'
import { DownloadsTable } from './DownloadsTable'
import { ViewAllCard } from './ViewAllCard'
import { WantedMovieCard } from './WantedMovieCard'
import { WantedSeriesCard } from './WantedSeriesCard'

/**
 * Calculate how many cards can fit in two rows based on container width.
 * Card width is 160px on mobile, 180px on larger screens, with 16px gap.
 */
function useMaxCardsInTwoRows(containerRef: React.RefObject<HTMLDivElement | null>) {
	const [maxCards, setMaxCards] = useState(8) // Default fallback

	useEffect(() => {
		const calculateMaxCards = () => {
			if (!containerRef.current) return
			const containerWidth = containerRef.current.offsetWidth
			// Use 180px card width + 16px gap for calculation
			const cardWidth = 180
			const gap = 16
			const cardsPerRow = Math.floor((containerWidth + gap) / (cardWidth + gap))
			setMaxCards(cardsPerRow * 2) // 2 rows max
		}

		calculateMaxCards()

		const resizeObserver = new ResizeObserver(calculateMaxCards)
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current)
		}

		return () => resizeObserver.disconnect()
	}, [containerRef])

	return maxCards
}

export function Dashboard({
	wantedMovies,
	wantedSeries,
	recentDownloads,
	onMovieClick,
	onMovieAutoSearch,
	onMovieManualSearch,
	onMovieDelete,
	onSeriesClick,
	onSeriesAutoSearch,
	onSeriesManualSearch,
	onSeriesDelete,
	onDownloadClick,
	onViewAllMovies,
	onViewAllTv,
}: DashboardProps) {
	const moviesContainerRef = useRef<HTMLDivElement>(null)
	const seriesContainerRef = useRef<HTMLDivElement>(null)

	const maxMovieCards = useMaxCardsInTwoRows(moviesContainerRef)
	const maxSeriesCards = useMaxCardsInTwoRows(seriesContainerRef)

	// Calculate visible movies (accounting for "View all" card)
	const visibleMovies = useMemo(() => {
		if (wantedMovies.length <= maxMovieCards) {
			return wantedMovies
		}
		// Reserve one slot for the "View all" card
		return wantedMovies.slice(0, maxMovieCards - 1)
	}, [wantedMovies, maxMovieCards])

	const overflowMoviesCount = wantedMovies.length - visibleMovies.length

	// Calculate visible series (accounting for "View all" card)
	const visibleSeries = useMemo(() => {
		if (wantedSeries.length <= maxSeriesCards) {
			return wantedSeries
		}
		// Reserve one slot for the "View all" card
		return wantedSeries.slice(0, maxSeriesCards - 1)
	}, [wantedSeries, maxSeriesCards])

	const overflowSeriesCount = wantedSeries.length - visibleSeries.length

	return (
		<div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
			<div className="mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6 sm:py-8">
				{/* Wanted Movies Section */}
				<section className="mb-8 sm:mb-12">
					<div className="mb-4 flex items-center gap-3 sm:mb-6">
						<div className="flex h-8 w-8 items-center justify-center rounded-sm bg-amber-100 text-amber-600 sm:h-10 sm:w-10 dark:bg-amber-950 dark:text-amber-400">
							<Film className="h-4 w-4 sm:h-5 sm:w-5" />
						</div>
						<div>
							<h2 className="font-bold text-lg text-slate-900 tracking-tight sm:text-xl dark:text-white">Wanted Movies</h2>
							<p className="text-slate-500 text-xs sm:text-sm dark:text-slate-500">
								{wantedMovies.length} {wantedMovies.length === 1 ? 'movie' : 'movies'} awaiting release
							</p>
						</div>
					</div>

					<div ref={moviesContainerRef}>
						{wantedMovies.length === 0 ? (
							<div className="flex flex-col items-center justify-center rounded-sm border border-slate-200 bg-white py-12 text-center sm:py-16 dark:border-slate-800 dark:bg-slate-900/50">
								<div className="mb-3 rounded-sm bg-slate-100 p-3 dark:bg-slate-800/30">
									<Film className="h-8 w-8 text-slate-400 dark:text-slate-600" />
								</div>
								<h3 className="mb-1 font-medium text-base text-slate-600 dark:text-slate-400">No wanted movies</h3>
								<p className="text-slate-500 text-sm dark:text-slate-500">All your movies have been downloaded</p>
							</div>
						) : (
							<div className="flex flex-wrap gap-4">
								{visibleMovies.map((movie) => (
									<WantedMovieCard
										key={movie.id}
										movie={movie}
										onView={() => onMovieClick?.(movie.id)}
										onAutoSearch={() => onMovieAutoSearch?.(movie.id)}
										onManualSearch={() => onMovieManualSearch?.(movie.id)}
										onDelete={() => onMovieDelete?.(movie.id)}
									/>
								))}
								{overflowMoviesCount > 0 && (
									<ViewAllCard
										count={overflowMoviesCount}
										label="more movies"
										onClick={onViewAllMovies}
									/>
								)}
							</div>
						)}
					</div>
				</section>

				{/* Upcoming TV Section */}
				<section className="mb-8 sm:mb-12">
					<div className="mb-4 flex items-center gap-3 sm:mb-6">
						<div className="flex h-8 w-8 items-center justify-center rounded-sm bg-sky-100 text-sky-600 sm:h-10 sm:w-10 dark:bg-sky-950 dark:text-sky-400">
							<Tv className="h-4 w-4 sm:h-5 sm:w-5" />
						</div>
						<div>
							<h2 className="font-bold text-lg text-slate-900 tracking-tight sm:text-xl dark:text-white">Upcoming TV</h2>
							<p className="text-slate-500 text-xs sm:text-sm dark:text-slate-500">
								{wantedSeries.length} {wantedSeries.length === 1 ? 'series' : 'series'} with wanted episodes
							</p>
						</div>
					</div>

					<div ref={seriesContainerRef}>
						{wantedSeries.length === 0 ? (
							<div className="flex flex-col items-center justify-center rounded-sm border border-slate-200 bg-white py-12 text-center sm:py-16 dark:border-slate-800 dark:bg-slate-900/50">
								<div className="mb-3 rounded-sm bg-slate-100 p-3 dark:bg-slate-800/30">
									<Tv className="h-8 w-8 text-slate-400 dark:text-slate-600" />
								</div>
								<h3 className="mb-1 font-medium text-base text-slate-600 dark:text-slate-400">No upcoming episodes</h3>
								<p className="text-slate-500 text-sm dark:text-slate-500">All your series are up to date</p>
							</div>
						) : (
							<div className="flex flex-wrap gap-4">
								{visibleSeries.map((ws) => (
									<WantedSeriesCard
										key={ws.series.id}
										wantedSeries={ws}
										onView={() => onSeriesClick?.(ws.series.id)}
										onAutoSearch={() => onSeriesAutoSearch?.(ws.series.id)}
										onManualSearch={() => onSeriesManualSearch?.(ws.series.id)}
										onDelete={() => onSeriesDelete?.(ws.series.id)}
									/>
								))}
								{overflowSeriesCount > 0 && (
									<ViewAllCard
										count={overflowSeriesCount}
										label="more series"
										onClick={onViewAllTv}
									/>
								)}
							</div>
						)}
					</div>
				</section>

				{/* Recent Downloads Section */}
				<section>
					<div className="mb-4 flex items-center gap-3 sm:mb-6">
						<div className="flex h-8 w-8 items-center justify-center rounded-sm bg-emerald-100 text-emerald-600 sm:h-10 sm:w-10 dark:bg-emerald-950 dark:text-emerald-400">
							<Download className="h-4 w-4 sm:h-5 sm:w-5" />
						</div>
						<div>
							<h2 className="font-bold text-lg text-slate-900 tracking-tight sm:text-xl dark:text-white">Recent Downloads</h2>
							<p className="text-slate-500 text-xs sm:text-sm dark:text-slate-500">Your latest download activity</p>
						</div>
					</div>

					<div className="overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
						<DownloadsTable
							downloads={recentDownloads}
							onDownloadClick={onDownloadClick}
						/>
					</div>
				</section>
			</div>
		</div>
	)
}
