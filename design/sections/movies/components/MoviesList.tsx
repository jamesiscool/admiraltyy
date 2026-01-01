import { ChevronDown, Film, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Movie, MoviesListProps } from '@/../product/sections/movies/types'
import { MovieCard } from './MovieCard'

type SortOption = 'title' | 'releaseDate' | 'dateAdded' | 'fileSize'
type StatusFilter = 'all' | 'wanted' | 'downloaded'
type QualityFilter = 'all' | '2160p' | '1080p' | '720p' | '480p'
type MonitoredFilter = 'all' | 'monitored' | 'unmonitored'

export function MoviesList({ movies, onView, onAutoSearch, onManualSearch, onDelete, onToggleMonitored, onEditQuality, onAddMovie }: MoviesListProps) {
	// Search and filter state
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
	const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all')
	const [monitoredFilter, setMonitoredFilter] = useState<MonitoredFilter>('all')
	const [yearRange, setYearRange] = useState<[number, number]>([1900, 2030])
	const [sortBy, setSortBy] = useState<SortOption>('dateAdded')
	const [sortDesc, setSortDesc] = useState(true)
	const [showFilters, setShowFilters] = useState(false)

	// Filter and sort movies
	const filteredMovies = useMemo(() => {
		let result = [...movies]

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			result = result.filter((m) => m.title.toLowerCase().includes(query))
		}

		// Status filter
		if (statusFilter === 'wanted') {
			result = result.filter((m) => m.file === null)
		} else if (statusFilter === 'downloaded') {
			result = result.filter((m) => m.file !== null)
		}

		// Quality filter
		if (qualityFilter !== 'all') {
			result = result.filter((m) => m.qualityPreference === qualityFilter)
		}

		// Monitored filter
		if (monitoredFilter === 'monitored') {
			result = result.filter((m) => m.monitored)
		} else if (monitoredFilter === 'unmonitored') {
			result = result.filter((m) => !m.monitored)
		}

		// Year range filter
		result = result.filter((m) => m.year >= yearRange[0] && m.year <= yearRange[1])

		// Sort
		result.sort((a, b) => {
			let comparison = 0
			switch (sortBy) {
				case 'title':
					comparison = a.title.localeCompare(b.title)
					break
				case 'releaseDate':
					comparison = new Date(a.cinemaReleaseDate).getTime() - new Date(b.cinemaReleaseDate).getTime()
					break
				case 'dateAdded':
					comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
					break
				case 'fileSize': {
					const sizeA = a.file?.size ?? 0
					const sizeB = b.file?.size ?? 0
					comparison = sizeA - sizeB
					break
				}
			}
			return sortDesc ? -comparison : comparison
		})

		return result
	}, [movies, searchQuery, statusFilter, qualityFilter, monitoredFilter, yearRange, sortBy, sortDesc])

	// Helper to calculate movie size (sizes are in bytes)
	const getMovieSize = (m: Movie) => (m.file?.size ?? 0) / 1_000_000_000 // Convert to GB

	// Format GB to human readable
	const formatSize = (gb: number) => {
		if (gb === 0) return '0 GB'
		if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
		return `${gb.toFixed(1)} GB`
	}

	// Stats
	const totalMovies = movies.length
	const downloadedMovies = movies.filter((m) => m.file !== null).length
	const wantedMovies = totalMovies - downloadedMovies

	// Size stats
	const totalSize = movies.reduce((sum, m) => sum + getMovieSize(m), 0)
	const filteredSize = filteredMovies.reduce((sum, m) => sum + getMovieSize(m), 0)

	// Active filter count
	const activeFilterCount = [statusFilter !== 'all', qualityFilter !== 'all', monitoredFilter !== 'all', yearRange[0] !== 1900 || yearRange[1] !== 2030].filter(Boolean).length

	const clearFilters = () => {
		setStatusFilter('all')
		setQualityFilter('all')
		setMonitoredFilter('all')
		setYearRange([1900, 2030])
	}

	return (
		<div className="flex flex-1 flex-col bg-white dark:bg-slate-950">
			{/* Header */}
			<div className="sticky top-0 z-20 border-slate-200 border-b bg-slate-50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
				<div className="mx-auto max-w-content px-6 py-5">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						{/* Title */}
						<h1 className="font-bold text-2xl text-slate-900 tracking-tight dark:text-white">Movies</h1>

						{/* Search and Add */}
						<div className="flex items-center gap-3">
							<div className="relative flex-1 sm:w-64 sm:flex-initial">
								<Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
								<input
									type="text"
									placeholder="Search movies..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full rounded-sm border border-slate-300 bg-white py-1.5 pr-4 pl-10 text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-500/50 dark:placeholder:text-slate-500"
								/>
								{searchQuery && (
									<button
										onClick={() => setSearchQuery('')}
										className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								)}
							</div>
							<button
								onClick={() => onAddMovie?.()}
								className="flex items-center gap-2 rounded-sm bg-blue-600 px-4 py-1.5 font-medium text-white shadow-blue-600/20 shadow-lg transition-all hover:scale-[1.02] hover:bg-blue-700 hover:shadow-blue-500/30 dark:hover:bg-blue-500"
							>
								<Plus className="h-4 w-4" />
								<span className="hidden sm:inline">Add Movie</span>
							</button>
						</div>
					</div>

					{/* Filter Bar */}
					<div className="mt-4 flex flex-wrap items-center gap-3">
						{/* Filter Toggle */}
						<button
							onClick={() => setShowFilters(!showFilters)}
							className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 transition-all ${
								showFilters || activeFilterCount > 0
									? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950 dark:text-blue-400'
									: 'border-slate-300 bg-white text-slate-600 hover:text-slate-900 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:text-slate-300'
							}`}
						>
							<SlidersHorizontal className="h-4 w-4" />
							<span className="font-medium text-sm">Filters</span>
							{activeFilterCount > 0 && <span className="rounded-sm bg-blue-600 px-1.5 py-0.5 font-semibold text-white text-xs">{activeFilterCount}</span>}
						</button>

						{/* Quick Filters */}
						<div className="flex items-center gap-2">
							<QuickFilterButton
								active={statusFilter === 'all'}
								onClick={() => setStatusFilter('all')}
							>
								All
							</QuickFilterButton>
							<QuickFilterButton
								active={statusFilter === 'wanted'}
								onClick={() => setStatusFilter('wanted')}
								color="amber"
							>
								Wanted
							</QuickFilterButton>
							<QuickFilterButton
								active={statusFilter === 'downloaded'}
								onClick={() => setStatusFilter('downloaded')}
								color="emerald"
							>
								Downloaded
							</QuickFilterButton>
						</div>

						{/* Sort */}
						<div className="ml-auto flex items-center gap-2">
							<span className="text-slate-500 text-sm dark:text-slate-500">Sort by</span>
							<div className="relative">
								<select
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value as SortOption)}
									className="cursor-pointer appearance-none rounded-sm border border-slate-300 bg-white py-1.5 pr-8 pl-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300"
								>
									<option value="dateAdded">Date Added</option>
									<option value="title">Title</option>
									<option value="releaseDate">Release Date</option>
									<option value="fileSize">File Size</option>
								</select>
								<ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
							</div>
							<button
								onClick={() => setSortDesc(!sortDesc)}
								className="rounded-sm border border-slate-300 bg-white p-1.5 text-slate-500 transition-colors hover:text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:text-slate-300"
								title={sortDesc ? 'Descending' : 'Ascending'}
							>
								<svg
									className={`h-4 w-4 transition-transform ${sortDesc ? '' : 'rotate-180'}`}
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
						</div>
					</div>

					{/* Expanded Filters */}
					{showFilters && (
						<div className="mt-4 rounded-sm border border-slate-200 bg-white p-4 dark:border-slate-700/30 dark:bg-slate-800/30">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
								{/* Quality Filter */}
								<div>
									<label className="mb-2 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Quality</label>
									<select
										value={qualityFilter}
										onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
										className="w-full appearance-none rounded-sm border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300"
									>
										<option value="all">All Qualities</option>
										<option value="2160p">4K (2160p)</option>
										<option value="1080p">Full HD (1080p)</option>
										<option value="720p">HD (720p)</option>
										<option value="480p">SD (480p)</option>
									</select>
								</div>

								{/* Monitored Filter */}
								<div>
									<label className="mb-2 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Monitored</label>
									<select
										value={monitoredFilter}
										onChange={(e) => setMonitoredFilter(e.target.value as MonitoredFilter)}
										className="w-full appearance-none rounded-sm border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300"
									>
										<option value="all">All</option>
										<option value="monitored">Monitored Only</option>
										<option value="unmonitored">Unmonitored Only</option>
									</select>
								</div>

								{/* Year Range */}
								<div>
									<label className="mb-2 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Year From</label>
									<input
										type="number"
										min="1900"
										max="2030"
										value={yearRange[0]}
										onChange={(e) => setYearRange([Number(e.target.value), yearRange[1]])}
										className="w-full rounded-sm border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300"
									/>
								</div>
								<div>
									<label className="mb-2 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Year To</label>
									<input
										type="number"
										min="1900"
										max="2030"
										value={yearRange[1]}
										onChange={(e) => setYearRange([yearRange[0], Number(e.target.value)])}
										className="w-full rounded-sm border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300"
									/>
								</div>
							</div>

							{activeFilterCount > 0 && (
								<button
									onClick={clearFilters}
									className="mt-4 flex items-center gap-2 px-3 py-1.5 text-slate-500 text-sm transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
								>
									<X className="h-3.5 w-3.5" />
									Clear all filters
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Movie Grid */}
			<div className="mx-auto w-full max-w-content flex-1 px-6 py-8">
				{filteredMovies.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-24 text-center">
						<div className="mb-4 rounded-sm bg-slate-100 p-4 dark:bg-slate-800/30">
							<Film className="h-12 w-12 text-slate-400 dark:text-slate-600" />
						</div>
						<h3 className="mb-2 font-semibold text-slate-700 text-xl dark:text-slate-300">No movies found</h3>
						<p className="max-w-md text-slate-500 dark:text-slate-500">
							{searchQuery ? `No movies match "${searchQuery}". Try a different search term.` : 'No movies match the current filters. Try adjusting your filters or add some movies.'}
						</p>
						{(searchQuery || activeFilterCount > 0) && (
							<button
								onClick={() => {
									setSearchQuery('')
									clearFilters()
								}}
								className="mt-4 rounded-sm bg-slate-200 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
							>
								Clear search & filters
							</button>
						)}
					</div>
				) : (
					<>
						<div
							className="grid gap-4"
							style={{ gridTemplateColumns: 'repeat(auto-fill, 190px)', justifyContent: 'start' }}
						>
							{filteredMovies.map((movie) => (
								<MovieCard
									key={movie.id}
									movie={movie}
									onView={() => onView?.(movie.id)}
									onAutoSearch={() => onAutoSearch?.(movie.id)}
									onManualSearch={() => onManualSearch?.(movie.id)}
									onDelete={() => onDelete?.(movie.id)}
									onToggleMonitored={(monitored) => onToggleMonitored?.(movie.id, monitored)}
									onEditQuality={() => onEditQuality?.(movie.id)}
								/>
							))}
						</div>
					</>
				)}
			</div>

			{/* Stats Footer */}
			<div className="mt-auto border-slate-200 border-t bg-white dark:border-slate-800 dark:bg-slate-950">
				<div className="mx-auto max-w-content px-6 py-3">
					<div className="flex items-center justify-between text-sm">
						{/* Left side - Status counts */}
						<div className="flex items-center gap-4">
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-slate-900 dark:text-white">{totalMovies}</span> Total
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-emerald-600 dark:text-emerald-400">{downloadedMovies}</span> Downloaded
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-amber-600 dark:text-amber-400">{wantedMovies}</span> Wanted
							</span>
						</div>

						{/* Right side - Selection and size stats */}
						<div className="flex items-center gap-4">
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-slate-900 dark:text-white">{filteredMovies.length}</span> Selected
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-slate-900 dark:text-white">{formatSize(filteredSize)}</span>
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-slate-900 dark:text-white">{totalMovies}</span> Total
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-slate-900 dark:text-white">{formatSize(totalSize)}</span>
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

// Quick filter button component
function QuickFilterButton({ active, onClick, children, color = 'blue' }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: 'blue' | 'amber' | 'emerald' }) {
	const colorClasses = {
		blue: active ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30' : '',
		amber: active ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30' : '',
		emerald: active ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : '',
	}

	return (
		<button
			onClick={onClick}
			className={`rounded-sm px-3 py-1.5 font-medium text-sm transition-all ${
				active ? colorClasses[color] : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-300'
			}`}
		>
			{children}
		</button>
	)
}
