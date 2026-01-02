import { createFileRoute } from '@tanstack/react-router'
import { Film, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/client/components/ui/button'
import { Input } from '@/client/components/ui/input'
import { useMovies } from '@/client/lib/api'
import type { Resolution } from '@/server/db/schema'
import { MovieCard } from './-movie-card'
import { type MonitoredFilter, MovieFilters, type SortOption, type StatusFilter } from './-movie-filters'
import { MoviesFooter } from './-movies-footer'

export const Route = createFileRoute('/movies/')({
	component: MoviesIndexPage,
})

function MoviesIndexPage() {
	// Search and filter state
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
	const [qualityFilter, setQualityFilter] = useState<Resolution | 'all'>('all')
	const [monitoredFilter, setMonitoredFilter] = useState<MonitoredFilter>('all')
	const [yearRange, setYearRange] = useState<[number, number]>([1900, 2030])
	const [sortBy, setSortBy] = useState<SortOption>('dateAdded')
	const [sortDesc, setSortDesc] = useState(true)

	// Fetch movies from API
	const { data: moviesData, isLoading, error } = useMovies()

	const movies = moviesData ?? []

	// Filter and sort movies
	const filteredMovies = useMemo(() => {
		let result = [...movies]

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			result = result.filter((m) => m.title.toLowerCase().includes(query))
		}

		// Status filter - TODO: Join with files table to determine downloaded status
		// For now, we don't have file associations so all movies are "wanted"
		if (statusFilter === 'downloaded') {
			// No movies have files yet
			result = []
		}
		// 'wanted' and 'all' show all movies (no file associations yet)

		// Quality filter
		if (qualityFilter !== 'all') {
			result = result.filter((m) => m.resolution === qualityFilter)
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
					comparison = new Date(a.cinemaReleaseDate ?? '').getTime() - new Date(b.cinemaReleaseDate ?? '').getTime()
					break
				case 'dateAdded':
					comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
					break
				case 'year':
					comparison = a.year - b.year
					break
			}
			return sortDesc ? -comparison : comparison
		})

		return result
	}, [movies, searchQuery, statusFilter, qualityFilter, monitoredFilter, yearRange, sortBy, sortDesc])

	// Stats - TODO: calculate from file associations when available
	const totalMovies = movies.length
	const downloadedMovies = 0 // No file associations yet
	const wantedMovies = totalMovies - downloadedMovies

	// Size stats - TODO: calculate from files when available
	const totalSize = 0
	const filteredSize = 0

	// Active filter count for clearing
	const hasActiveFilters = searchQuery || statusFilter !== 'all' || qualityFilter !== 'all' || monitoredFilter !== 'all' || yearRange[0] !== 1900 || yearRange[1] !== 2030

	const clearAllFilters = () => {
		setSearchQuery('')
		setStatusFilter('all')
		setQualityFilter('all')
		setMonitoredFilter('all')
		setYearRange([1900, 2030])
	}

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="shrink-0 border-b">
				<div className="container pt-0!">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						{/* Title */}
						<h1>Movies</h1>

						{/* Search */}
						<div className="relative flex-1 sm:w-64 sm:flex-initial">
							<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search movies..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pr-8 pl-10"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery('')}
									className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
								>
									<X className="size-3.5" />
								</button>
							)}
						</div>
					</div>

					{/* Filters */}
					<div className="mt-4">
						<MovieFilters
							statusFilter={statusFilter}
							onStatusFilterChange={setStatusFilter}
							qualityFilter={qualityFilter}
							onQualityFilterChange={setQualityFilter}
							monitoredFilter={monitoredFilter}
							onMonitoredFilterChange={setMonitoredFilter}
							yearRange={yearRange}
							onYearRangeChange={setYearRange}
							sortBy={sortBy}
							onSortByChange={setSortBy}
							sortDesc={sortDesc}
							onSortDescChange={setSortDesc}
						/>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="grow overflow-y-auto">
				<div className="container py-8">
					{/* Loading State */}
					{isLoading && <div className="py-12 text-center text-muted-foreground">Loading movies...</div>}

					{/* Error State */}
					{error && <div className="py-12 text-center text-destructive">{error.message}</div>}

					{/* Empty State */}
					{!isLoading && !error && filteredMovies.length === 0 && (
						<div className="flex flex-col items-center justify-center py-24 text-center">
							<div className="mb-4 rounded bg-muted p-4">
								<Film className="size-12 text-muted-foreground" />
							</div>
							<h3 className="mb-2 font-semibold text-xl">No movies found</h3>
							<p className="max-w-md text-muted-foreground">
								{searchQuery
									? `No movies match "${searchQuery}". Try a different search term.`
									: movies.length === 0
										? 'You haven\'t added any movies yet. Click "Add Movie" to get started.'
										: 'No movies match the current filters. Try adjusting your filters.'}
							</p>
							{hasActiveFilters && (
								<Button
									variant="outline"
									onClick={clearAllFilters}
									className="mt-4"
								>
									Clear search & filters
								</Button>
							)}
						</div>
					)}

					{/* Movie Grid */}
					{!isLoading && !error && filteredMovies.length > 0 && (
						<div className="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-4">
							{filteredMovies.map((movie) => (
								<MovieCard
									key={movie.id}
									movie={movie}
									onAutoSearch={() => {
										// TODO: Trigger auto search
										console.log('Auto search:', movie.id)
									}}
									onManualSearch={() => {
										// TODO: Open manual search
										console.log('Manual search:', movie.id)
									}}
									onDelete={() => {
										// TODO: Delete movie (API not implemented yet)
										console.log('Delete movie:', movie.id)
									}}
									onToggleMonitored={(monitored) => {
										// TODO: Update movie (API not implemented yet)
										console.log('Toggle monitored:', movie.id, monitored)
									}}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Footer */}
			<MoviesFooter
				totalMovies={totalMovies}
				downloadedMovies={downloadedMovies}
				wantedMovies={wantedMovies}
				filteredCount={filteredMovies.length}
				filteredSize={filteredSize}
				totalSize={totalSize}
			/>
		</div>
	)
}
