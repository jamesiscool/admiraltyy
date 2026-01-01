import { ChevronDown, Plus, Search, SlidersHorizontal, Tv, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Series, TVListProps } from '@/../product/sections/tv/types'
import { TvSeriesCard } from './TvSeriesCard'

type SortOption = 'title' | 'nextAiring' | 'dateAdded' | 'fileSize'
type StatusFilter = 'all' | 'missing' | 'continuing' | 'complete' | 'ended'
type QualityFilter = 'all' | '2160p' | '1080p' | '720p' | '480p'
type MonitoredFilter = 'all' | 'monitored' | 'unmonitored'

export function TvList({
	series,
	searchQuery: controlledSearchQuery,
	onSearchChange,
	onViewSeries,
	onAutoSearch,
	onManualSearch,
	onDeleteSeries,
	onToggleSeriesMonitored,
	onEditQualityProfile,
	onAddSeries,
}: TVListProps) {
	// Search and filter state
	const [internalSearchQuery, setInternalSearchQuery] = useState('')
	const searchQuery = controlledSearchQuery ?? internalSearchQuery
	const setSearchQuery = onSearchChange ?? setInternalSearchQuery

	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
	const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all')
	const [monitoredFilter, setMonitoredFilter] = useState<MonitoredFilter>('all')
	const [yearRange, setYearRange] = useState<[number, number]>([1900, 2030])
	const [sortBy, setSortBy] = useState<SortOption>('dateAdded')
	const [sortDesc, setSortDesc] = useState(true)
	const [showFilters, setShowFilters] = useState(false)

	// Filter and sort series
	const filteredSeries = useMemo(() => {
		let result = [...series]

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			result = result.filter((s) => s.title.toLowerCase().includes(query) || s.network.toLowerCase().includes(query))
		}

		// Helper: check if series has missing episodes (past air date, not downloaded)
		const hasMissingEpisodes = (s: Series) => s.seasons.some((season) => season.episodes.some((ep) => ep.status === 'missing'))

		// Helper: check if series has continuing episodes (future air date)
		const hasContinuingEpisodes = (s: Series) => s.seasons.some((season) => season.episodes.some((ep) => ep.status === 'airing'))

		// Status filter
		if (statusFilter === 'missing') {
			result = result.filter((s) => hasMissingEpisodes(s))
		} else if (statusFilter === 'complete') {
			result = result.filter((s) => s.downloadedEpisodes === s.totalEpisodes)
		} else if (statusFilter === 'continuing') {
			result = result.filter((s) => hasContinuingEpisodes(s))
		} else if (statusFilter === 'ended') {
			result = result.filter((s) => s.status === 'ended')
		}

		// Quality filter
		if (qualityFilter !== 'all') {
			result = result.filter((s) => s.qualityPreference === qualityFilter)
		}

		// Monitored filter
		if (monitoredFilter === 'monitored') {
			result = result.filter((s) => s.monitored)
		} else if (monitoredFilter === 'unmonitored') {
			result = result.filter((s) => !s.monitored)
		}

		// Year range filter
		result = result.filter((s) => s.year >= yearRange[0] && s.year <= yearRange[1])

		// Sort
		result.sort((a, b) => {
			let comparison = 0
			switch (sortBy) {
				case 'title':
					comparison = a.title.localeCompare(b.title)
					break
				case 'nextAiring': {
					const dateA = a.nextAiring ? new Date(a.nextAiring).getTime() : 0
					const dateB = b.nextAiring ? new Date(b.nextAiring).getTime() : 0
					// Put series with upcoming episodes first
					if (dateA === 0 && dateB === 0) comparison = 0
					else if (dateA === 0) comparison = 1
					else if (dateB === 0) comparison = -1
					else comparison = dateA - dateB
					break
				}
				case 'dateAdded':
					comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
					break
				case 'fileSize': {
					// Sum up all episode sizes
					const getSizeSum = (s: Series) => s.seasons.reduce((sum, season) => sum + season.episodes.reduce((eSum, ep) => eSum + (ep.size ?? 0), 0), 0)
					comparison = getSizeSum(a) - getSizeSum(b)
					break
				}
			}
			return sortDesc ? -comparison : comparison
		})

		return result
	}, [series, searchQuery, statusFilter, qualityFilter, monitoredFilter, yearRange, sortBy, sortDesc])

	// Helper functions for stats
	const hasMissingEpisodes = (s: Series) => s.seasons.some((season) => season.episodes.some((ep) => ep.status === 'missing'))

	const hasContinuingEpisodes = (s: Series) => s.seasons.some((season) => season.episodes.some((ep) => ep.status === 'airing'))

	// Helper to calculate total size of a series (sizes are already in GB)
	const getSeriesSize = (s: Series) => s.seasons.reduce((sum, season) => sum + season.episodes.reduce((eSum, ep) => eSum + (ep.size ?? 0), 0), 0)

	// Format GB to human readable
	const formatSize = (gb: number) => {
		if (gb === 0) return '0 GB'
		if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
		return `${gb.toFixed(1)} GB`
	}

	// Stats
	const totalSeries = series.length
	const completeSeries = series.filter((s) => s.downloadedEpisodes === s.totalEpisodes).length
	const missingSeries = series.filter((s) => hasMissingEpisodes(s)).length
	const continuingSeries = series.filter((s) => hasContinuingEpisodes(s)).length

	// Size stats
	const totalSize = series.reduce((sum, s) => sum + getSeriesSize(s), 0)
	const filteredSize = filteredSeries.reduce((sum, s) => sum + getSeriesSize(s), 0)

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
						<h1 className="font-bold text-2xl text-slate-900 tracking-tight dark:text-white">TV Series</h1>

						{/* Search and Add */}
						<div className="flex items-center gap-3">
							<div className="relative flex-1 sm:w-64 sm:flex-initial">
								<Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
								<input
									type="text"
									placeholder="Search series..."
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
								onClick={() => onAddSeries?.()}
								className="flex items-center gap-2 rounded-sm bg-blue-600 px-4 py-1.5 font-medium text-white shadow-blue-600/20 shadow-lg transition-all hover:scale-[1.02] hover:bg-blue-700 hover:shadow-blue-500/30 dark:hover:bg-blue-500"
							>
								<Plus className="h-4 w-4" />
								<span className="hidden sm:inline">Add Series</span>
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
								active={statusFilter === 'missing'}
								onClick={() => setStatusFilter('missing')}
								color="amber"
							>
								Missing
							</QuickFilterButton>
							<QuickFilterButton
								active={statusFilter === 'continuing'}
								onClick={() => setStatusFilter('continuing')}
								color="sky"
							>
								Continuing
							</QuickFilterButton>
							<QuickFilterButton
								active={statusFilter === 'complete'}
								onClick={() => setStatusFilter('complete')}
								color="emerald"
							>
								Complete
							</QuickFilterButton>
							<QuickFilterButton
								active={statusFilter === 'ended'}
								onClick={() => setStatusFilter('ended')}
							>
								Ended
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
									<option value="nextAiring">Next Airing</option>
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

			{/* Series Grid */}
			<div className="mx-auto w-full max-w-content flex-1 px-6 py-8">
				{filteredSeries.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-24 text-center">
						<div className="mb-4 rounded-sm bg-slate-100 p-4 dark:bg-slate-800/30">
							<Tv className="h-12 w-12 text-slate-400 dark:text-slate-600" />
						</div>
						<h3 className="mb-2 font-semibold text-slate-700 text-xl dark:text-slate-300">No series found</h3>
						<p className="max-w-md text-slate-500 dark:text-slate-500">
							{searchQuery ? `No series match "${searchQuery}". Try a different search term.` : 'No series match the current filters. Try adjusting your filters or add some series.'}
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
							{filteredSeries.map((s) => (
								<TvSeriesCard
									key={s.id}
									series={s}
									onView={() => onViewSeries?.(s.id)}
									onAutoSearch={() => onAutoSearch?.(s.id)}
									onManualSearch={() => onManualSearch?.(s.id)}
									onDelete={() => onDeleteSeries?.(s.id)}
									onToggleMonitored={(monitored) => onToggleSeriesMonitored?.(s.id, monitored)}
									onEditQualityProfile={() => onEditQualityProfile?.(s.id)}
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
								<span className="font-semibold text-slate-900 dark:text-white">{totalSeries}</span> Total
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-emerald-600 dark:text-emerald-400">{completeSeries}</span> Complete
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-amber-600 dark:text-amber-400">{missingSeries}</span> Missing
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-sky-600 dark:text-sky-400">{continuingSeries}</span> Continuing
							</span>
						</div>

						{/* Right side - Selection and size stats */}
						<div className="flex items-center gap-4">
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-slate-900 dark:text-white">{filteredSeries.length}</span> Selected
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-slate-900 dark:text-white">{formatSize(filteredSize)}</span>
							</span>
							<span className="text-slate-300 dark:text-slate-600">|</span>
							<span className="text-slate-600 dark:text-slate-400">
								<span className="font-semibold text-slate-900 dark:text-white">{totalSeries}</span> Total
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
function QuickFilterButton({ active, onClick, children, color = 'blue' }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: 'blue' | 'amber' | 'emerald' | 'sky' }) {
	const colorClasses = {
		blue: active ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30' : '',
		amber: active ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30' : '',
		emerald: active ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : '',
		sky: active ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-500/30' : '',
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
