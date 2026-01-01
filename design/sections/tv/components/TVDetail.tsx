import { ArrowLeft, Bookmark, Calendar, Clock, Search, Settings, Trash2, Tv } from 'lucide-react'
import type { TVDetailProps } from '@/../product/sections/tv/types'
import { SeasonTable } from './SeasonTable'

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
	onSearchEpisode,
}: TVDetailProps) {
	// Calculate progress percentage
	const progressPercentage = series.totalEpisodes > 0 ? Math.round((series.downloadedEpisodes / series.totalEpisodes) * 100) : 0

	// Sort seasons by season number descending (most recent first)
	const sortedSeasons = [...series.seasons].sort((a, b) => b.seasonNumber - a.seasonNumber)

	return (
		<div className="min-h-screen bg-white dark:bg-slate-950">
			{/* Back Button */}
			<div className="border-slate-200 border-b dark:border-slate-800">
				<div className="mx-auto max-w-content px-4 py-4 sm:px-6 lg:px-8">
					<button
						onClick={onBack}
						className="inline-flex items-center gap-2 font-medium text-slate-700 text-sm transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to TV Series
					</button>
				</div>
			</div>

			{/* Series Header */}
			<div className="relative border-slate-200 border-b dark:border-slate-800">
				{/* Backdrop Image */}
				{series.backdropUrl && (
					<div className="absolute inset-0 overflow-hidden">
						<img
							src={series.backdropUrl}
							alt=""
							className="h-full w-full object-cover"
						/>
						{/* Gradient Overlay */}
						<div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/50 dark:from-slate-950/90 dark:via-slate-950/70 dark:to-slate-950/50" />
					</div>
				)}

				{/* Content */}
				<div className={`relative mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8 ${!series.backdropUrl ? 'bg-slate-50 dark:bg-slate-900' : ''}`}>
					<div className="flex flex-col gap-8 lg:flex-row">
						{/* Poster */}
						<div className="flex-shrink-0">
							<img
								src={series.posterUrl}
								alt={series.title}
								className="h-72 w-48 rounded-sm object-cover shadow-xl ring-1 ring-slate-900/10 dark:ring-slate-100/10"
							/>
						</div>

						{/* Series Info */}
						<div className="min-w-0 flex-1">
							{/* Title & Year */}
							<div className="mb-4 flex items-start justify-between gap-4">
								<div>
									<h1 className={`mb-2 font-bold text-3xl ${series.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{series.title}</h1>
									<div className={`flex flex-wrap items-center gap-3 text-sm ${series.backdropUrl ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
										<span className="font-medium">{series.year}</span>
										<span className="h-1 w-1 rounded-full bg-slate-400" />
										<span className="capitalize">{series.status}</span>
										<span className="h-1 w-1 rounded-full bg-slate-400" />
										<span>{series.network}</span>
										<span className="h-1 w-1 rounded-full bg-slate-400" />
										<span>{series.runtime} min</span>
									</div>
								</div>

								{/* Monitoring Toggle */}
								<button
									onClick={() => onToggleMonitored?.(!series.monitored)}
									className={`inline-flex flex-shrink-0 items-center gap-2 rounded-sm px-4 py-2 font-medium text-sm transition-colors ${
										series.monitored
											? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900'
											: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
									}`}
								>
									<Bookmark className={`h-4 w-4 ${series.monitored ? 'fill-current' : ''}`} />
									{series.monitored ? 'Monitored' : 'Unmonitored'}
								</button>
							</div>

							{/* Genres */}
							<div className="mb-4 flex flex-wrap gap-2">
								{series.genres.map((genre) => (
									<span
										key={genre}
										className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700 text-xs dark:bg-sky-950 dark:text-sky-300"
									>
										{genre}
									</span>
								))}
							</div>

							{/* Overview */}
							<p className={`mb-6 leading-relaxed ${series.backdropUrl ? 'text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>{series.overview}</p>

							{/* Stats Grid */}
							<div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
								<div
									className={`rounded-sm border p-4 ${series.backdropUrl ? 'border-slate-700 bg-slate-800/50 backdrop-blur-sm' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}
								>
									<div className={`mb-1 flex items-center gap-2 text-xs ${series.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
										<Tv className="h-3.5 w-3.5" />
										Episodes
									</div>
									<div className={`font-bold text-lg ${series.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
										{series.downloadedEpisodes} / {series.totalEpisodes}
									</div>
								</div>

								<div
									className={`rounded-sm border p-4 ${series.backdropUrl ? 'border-slate-700 bg-slate-800/50 backdrop-blur-sm' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}
								>
									<div className={`mb-1 flex items-center gap-2 text-xs ${series.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
										<Settings className="h-3.5 w-3.5" />
										Quality
									</div>
									<div className={`font-bold text-lg ${series.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{series.qualityPreference}</div>
								</div>

								<div
									className={`rounded-sm border p-4 ${series.backdropUrl ? 'border-slate-700 bg-slate-800/50 backdrop-blur-sm' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}
								>
									<div className={`mb-1 flex items-center gap-2 text-xs ${series.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
										<Calendar className="h-3.5 w-3.5" />
										Next Airing
									</div>
									<div className={`font-medium text-sm ${series.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
										{series.nextAiring
											? new Date(series.nextAiring).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													year: 'numeric',
												})
											: 'N/A'}
									</div>
								</div>

								<div
									className={`rounded-sm border p-4 ${series.backdropUrl ? 'border-slate-700 bg-slate-800/50 backdrop-blur-sm' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}
								>
									<div className={`mb-1 flex items-center gap-2 text-xs ${series.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
										<Clock className="h-3.5 w-3.5" />
										Progress
									</div>
									<div className="flex items-center gap-2">
										<div className={`h-2 flex-1 overflow-hidden rounded-full ${series.backdropUrl ? 'bg-slate-700' : 'bg-slate-200 dark:bg-slate-800'}`}>
											<div
												className="h-full bg-blue-600 transition-all dark:bg-blue-500"
												style={{ width: `${progressPercentage}%` }}
											/>
										</div>
										<span className={`font-medium text-xs ${series.backdropUrl ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{progressPercentage}%</span>
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex flex-wrap gap-3">
								<button
									onClick={onAutoSearch}
									className="inline-flex items-center gap-2 rounded-sm bg-blue-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
								>
									<Search className="h-4 w-4" />
									Auto Search
								</button>
								<button
									onClick={onManualSearch}
									className="inline-flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
								>
									<Search className="h-4 w-4" />
									Manual Search
								</button>
								<button
									onClick={onEditQualityProfile}
									className="inline-flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
								>
									<Settings className="h-4 w-4" />
									Edit Quality
								</button>
								<button
									onClick={onDelete}
									className="inline-flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 py-2 font-medium text-red-600 text-sm transition-colors hover:border-red-300 hover:bg-red-50 dark:border-slate-600 dark:bg-slate-800 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-950"
								>
									<Trash2 className="h-4 w-4" />
									Delete Series
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Seasons & Episodes */}
			<div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
				<h2 className="sr-only">Seasons & Episodes</h2>

				<div className="space-y-8">
					{sortedSeasons.map((season) => (
						<SeasonTable
							key={season.id}
							season={season}
							seriesMonitored={series.monitored}
							onToggleSeasonMonitored={(monitored) => onToggleSeasonMonitored?.(season.id, monitored)}
							onToggleEpisodeMonitored={onToggleEpisodeMonitored}
							onSearchEpisode={onSearchEpisode}
						/>
					))}
				</div>

				{sortedSeasons.length === 0 && <div className="py-12 text-center text-slate-500 dark:text-slate-400">No seasons available</div>}
			</div>
		</div>
	)
}
