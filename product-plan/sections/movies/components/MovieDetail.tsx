import { ArrowLeft, Bookmark, Calendar, Clock, Film, HardDrive, Search, Settings, Trash2 } from 'lucide-react'
import type { MovieDetailProps } from '@/../product/sections/movies/types'

/**
 * MovieDetail component displays detailed information about a movie
 * including synopsis, cast, file details, and release dates.
 *
 * Design tokens applied:
 * - Primary (blue): Action buttons, links, monitoring badges
 * - Secondary (sky): Genre tags, status indicators
 * - Neutral (slate): Text, borders, backgrounds
 */
export function MovieDetail({ movie, onAutoSearch, onManualSearch, onDelete, onToggleMonitored, onEditQuality, onBack }: MovieDetailProps) {
	// Format file size (bytes to human readable)
	const formatFileSize = (bytes: number) => {
		const gb = bytes / 1_000_000_000
		if (gb >= 1000) return `${(gb / 1000).toFixed(2)} TB`
		return `${gb.toFixed(1)} GB`
	}

	// Format date
	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A'
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})
	}

	const hasFile = movie.file !== null

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
						Back to Movies
					</button>
				</div>
			</div>

			{/* Movie Header */}
			<div className="relative border-slate-200 border-b dark:border-slate-800">
				{/* Backdrop Image */}
				{movie.backdropUrl && (
					<div className="absolute inset-0 overflow-hidden">
						<img
							src={movie.backdropUrl}
							alt=""
							className="h-full w-full object-cover"
						/>
						{/* Gradient Overlay */}
						<div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/50 dark:from-slate-950/90 dark:via-slate-950/70 dark:to-slate-950/50" />
					</div>
				)}

				{/* Content */}
				<div className={`relative mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8 ${!movie.backdropUrl ? 'bg-slate-50 dark:bg-slate-900' : ''}`}>
					<div className="flex flex-col gap-8 lg:flex-row">
						{/* Poster */}
						<div className="flex-shrink-0">
							<img
								src={movie.posterUrl}
								alt={movie.title}
								className="h-72 w-48 rounded-sm object-cover shadow-xl ring-1 ring-slate-900/10 dark:ring-slate-100/10"
							/>
						</div>

						{/* Movie Info */}
						<div className="min-w-0 flex-1">
							{/* Title & Year */}
							<div className="mb-4 flex items-start justify-between gap-4">
								<div>
									<h1 className={`mb-2 font-bold text-3xl ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{movie.title}</h1>
									<div className={`flex flex-wrap items-center gap-3 text-sm ${movie.backdropUrl ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
										<span className="font-medium">{movie.year}</span>
										<span className="h-1 w-1 rounded-full bg-slate-400" />
										<span>{movie.runtime} min</span>
										<span className="h-1 w-1 rounded-full bg-slate-400" />
										<span className={`font-medium ${hasFile ? 'text-emerald-400' : 'text-amber-400'}`}>{hasFile ? 'Downloaded' : 'Wanted'}</span>
									</div>
								</div>

								{/* Monitoring Toggle */}
								<button
									onClick={() => onToggleMonitored?.(!movie.monitored)}
									className={`inline-flex flex-shrink-0 items-center gap-2 rounded-sm px-4 py-2 font-medium text-sm transition-colors ${
										movie.monitored
											? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900'
											: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
									}`}
								>
									<Bookmark className={`h-4 w-4 ${movie.monitored ? 'fill-current' : ''}`} />
									{movie.monitored ? 'Monitored' : 'Unmonitored'}
								</button>
							</div>

							{/* Genres */}
							<div className="mb-4 flex flex-wrap gap-2">
								{movie.genres.map((genre) => (
									<span
										key={genre}
										className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700 text-xs dark:bg-sky-950 dark:text-sky-300"
									>
										{genre}
									</span>
								))}
							</div>

							{/* Synopsis */}
							<p className={`mb-6 leading-relaxed ${movie.backdropUrl ? 'text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>{movie.synopsis}</p>

							{/* Stats Grid */}
							<div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
								<div
									className={`rounded-sm border p-4 ${movie.backdropUrl ? 'border-slate-700 bg-slate-800/50 backdrop-blur-sm' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}
								>
									<div className={`mb-1 flex items-center gap-2 text-xs ${movie.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
										<Settings className="h-3.5 w-3.5" />
										Quality
									</div>
									<div className={`font-bold text-lg ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{movie.qualityPreference}</div>
								</div>

								<div
									className={`rounded-sm border p-4 ${movie.backdropUrl ? 'border-slate-700 bg-slate-800/50 backdrop-blur-sm' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}
								>
									<div className={`mb-1 flex items-center gap-2 text-xs ${movie.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
										<Calendar className="h-3.5 w-3.5" />
										Cinema Release
									</div>
									<div className={`font-medium text-sm ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{formatDate(movie.cinemaReleaseDate)}</div>
								</div>

								<div
									className={`rounded-sm border p-4 ${movie.backdropUrl ? 'border-slate-700 bg-slate-800/50 backdrop-blur-sm' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}
								>
									<div className={`mb-1 flex items-center gap-2 text-xs ${movie.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
										<Film className="h-3.5 w-3.5" />
										Digital Release
									</div>
									<div className={`font-medium text-sm ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{formatDate(movie.digitalReleaseDate)}</div>
								</div>

								<div
									className={`rounded-sm border p-4 ${movie.backdropUrl ? 'border-slate-700 bg-slate-800/50 backdrop-blur-sm' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}
								>
									<div className={`mb-1 flex items-center gap-2 text-xs ${movie.backdropUrl ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
										<Clock className="h-3.5 w-3.5" />
										Added
									</div>
									<div className={`font-medium text-sm ${movie.backdropUrl ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{formatDate(movie.dateAdded)}</div>
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
									onClick={onEditQuality}
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
									Delete Movie
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* File Details & Cast */}
			<div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
					{/* File Details Section */}
					<div>
						<h2 className="mb-4 font-semibold text-lg text-slate-900 dark:text-slate-100">File Details</h2>
						{hasFile && movie.file ? (
							<div className="overflow-hidden rounded-sm border border-slate-200 dark:border-slate-800">
								<div className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
									<div className="flex items-start gap-3 px-4 py-3">
										<HardDrive className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
										<div className="min-w-0 flex-1">
											<div className="mb-1 font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">Path</div>
											<div className="break-all font-mono text-slate-900 text-sm dark:text-slate-100">{movie.file.path}</div>
										</div>
									</div>
									<div className="grid grid-cols-2 sm:grid-cols-4">
										<div className="border-slate-200 border-r px-4 py-3 dark:border-slate-800">
											<div className="mb-1 font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">Size</div>
											<div className="font-medium text-slate-900 text-sm dark:text-slate-100">{formatFileSize(movie.file.size)}</div>
										</div>
										<div className="border-slate-200 border-r px-4 py-3 dark:border-slate-800">
											<div className="mb-1 font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">Quality</div>
											<div className="font-medium text-sky-600 text-sm dark:text-sky-400">{movie.file.quality}</div>
										</div>
										<div className="border-slate-200 border-r px-4 py-3 dark:border-slate-800">
											<div className="mb-1 font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">Source</div>
											<div className="font-medium text-slate-900 text-sm dark:text-slate-100">{movie.file.source}</div>
										</div>
										<div className="px-4 py-3">
											<div className="mb-1 font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">Codec</div>
											<div className="font-medium text-slate-900 text-sm dark:text-slate-100">{movie.file.codec}</div>
										</div>
									</div>
									<div className="bg-slate-50 px-4 py-3 dark:bg-slate-900">
										<div className="mb-1 font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">Date Imported</div>
										<div className="text-slate-900 text-sm dark:text-slate-100">{formatDate(movie.file.dateImported)}</div>
									</div>
								</div>
							</div>
						) : (
							<div className="rounded-sm border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
								<Film className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-700" />
								<p className="font-medium text-slate-600 text-sm dark:text-slate-400">No file downloaded yet</p>
								<p className="mt-1 text-slate-500 text-xs dark:text-slate-500">Use Auto Search or Manual Search to find and download this movie</p>
							</div>
						)}
					</div>

					{/* Cast Section */}
					<div>
						<h2 className="mb-4 font-semibold text-lg text-slate-900 dark:text-slate-100">Cast</h2>
						<div className="overflow-hidden rounded-sm border border-slate-200 dark:border-slate-800">
							<table className="w-full">
								<thead className="bg-slate-50 dark:bg-slate-900">
									<tr>
										<th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">Actor</th>
										<th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-400">Character</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200 dark:divide-slate-800">
									{movie.cast.map((castMember, index) => (
										<tr
											key={index}
											className="bg-white dark:bg-slate-950"
										>
											<td className="px-4 py-3 font-medium text-slate-900 text-sm dark:text-slate-100">{castMember.name}</td>
											<td className="px-4 py-3 text-slate-600 text-sm dark:text-slate-400">{castMember.character}</td>
										</tr>
									))}
								</tbody>
							</table>
							{movie.cast.length === 0 && <div className="py-8 text-center text-slate-500 dark:text-slate-400">No cast information available</div>}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
