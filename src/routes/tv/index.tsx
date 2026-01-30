import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Search, Tv, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DeleteConfirmationModal, type DeleteTarget } from '@/components/delete-confirmation-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Resolution } from '@/db/schema'
import type { SeriesPreview } from '@/services/series'
import { deleteSeriesFn, updateSeriesFn } from '@/services/series.functions'
import { listSeriesQueryOptions } from '@/services/series.queries'
import { SeriesCard } from './-series-card'
import { type MonitoredFilter, SeriesFilters, type SeriesStatusFilter, type SortOption } from './-series-filters'
import { SeriesFooter } from './-series-footer'

export const Route = createFileRoute('/tv/')({
	loader: ({ context }) => context.queryClient.ensureQueryData(listSeriesQueryOptions()),
	component: TvIndexPage,
})

function TvIndexPage() {
	const router = useRouter()
	const { data: allSeries } = useSuspenseQuery(listSeriesQueryOptions())

	// Search and filter state
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<SeriesStatusFilter>('all')
	const [qualityFilter, setQualityFilter] = useState<Resolution | 'all'>('all')
	const [monitoredFilter, setMonitoredFilter] = useState<MonitoredFilter>('all')
	const [yearRange, setYearRange] = useState<[number, number]>([1900, 2030])
	const [sortBy, setSortBy] = useState<SortOption>('dateAdded')
	const [sortDesc, setSortDesc] = useState(true)

	// Delete modal state
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)

	// Filter and sort series
	const filteredSeries = useMemo(() => {
		let result = [...allSeries]

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			result = result.filter((s) => s.title.toLowerCase().includes(query))
		}

		// Status filter
		if (statusFilter !== 'all') {
			result = result.filter((s) => s.status === statusFilter)
		}

		// Quality filter
		if (qualityFilter !== 'all') {
			result = result.filter((s) => s.resolution === qualityFilter)
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
				case 'nextAiring':
					comparison = new Date(a.nextAiring ?? '').getTime() - new Date(b.nextAiring ?? '').getTime()
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
	}, [allSeries, searchQuery, statusFilter, qualityFilter, monitoredFilter, yearRange, sortBy, sortDesc])

	// Stats
	const totalSeries = allSeries.length
	const continuingSeries = allSeries.filter((s: SeriesPreview) => s.status === 'continuing').length
	const endedSeries = allSeries.filter((s: SeriesPreview) => s.status === 'ended').length

	// Size stats
	const totalSizeBytes = allSeries.reduce((sum: number, s: SeriesPreview) => sum + s.sizeBytes, 0)
	const filteredSizeBytes = filteredSeries.reduce((sum, s) => sum + s.sizeBytes, 0)
	const totalSize = totalSizeBytes / 1073741824
	const filteredSize = filteredSizeBytes / 1073741824

	// Active filter count for clearing
	const hasActiveFilters = searchQuery || statusFilter !== 'all' || qualityFilter !== 'all' || monitoredFilter !== 'all' || yearRange[0] !== 1900 || yearRange[1] !== 2030

	const clearAllFilters = () => {
		setSearchQuery('')
		setStatusFilter('all')
		setQualityFilter('all')
		setMonitoredFilter('all')
		setYearRange([1900, 2030])
	}

	const handleDeleteConfirm = async (deleteFiles: boolean) => {
		if (!deleteTarget) return
		setIsDeleting(true)
		try {
			await deleteSeriesFn({ data: { seriesId: String(deleteTarget.id), deleteFiles } })
			router.invalidate()
			setDeleteTarget(null)
		} finally {
			setIsDeleting(false)
		}
	}

	const handleToggleMonitored = async (series: SeriesPreview, monitored: boolean) => {
		await updateSeriesFn({ data: { seriesId: String(series.id), monitored } })
		router.invalidate()
	}

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="shrink-0 border-b">
				<div className="container pt-0!">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						{/* Title */}
						<h1>TV Series</h1>

						{/* Search */}
						<div className="relative flex-1 sm:w-64 sm:flex-initial">
							<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search series..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pr-8 pl-10"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery('')}
									className="-translate-y-1/2 absolute top-1/2 right-2.5 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
								>
									<X className="size-3.5" />
								</button>
							)}
						</div>
					</div>

					{/* Filters */}
					<div className="mt-4">
						<SeriesFilters
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
					{/* Empty State */}
					{filteredSeries.length === 0 && (
						<div className="flex flex-col items-center justify-center py-24 text-center">
							<div className="mb-4 rounded bg-muted p-4">
								<Tv className="size-12 text-muted-foreground" />
							</div>
							<h3 className="mb-2 font-semibold text-xl">No series found</h3>
							<p className="max-w-md text-muted-foreground">
								{searchQuery
									? `No series match "${searchQuery}". Try a different search term.`
									: allSeries.length === 0
										? 'You haven\'t added any series yet. Click "Add Series" to get started.'
										: 'No series match the current filters. Try adjusting your filters.'}
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

					{/* Series Grid */}
					{filteredSeries.length > 0 && (
						<div className="grid grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-4">
							{filteredSeries.map((series) => (
								<SeriesCard
									key={series.id}
									series={series}
									onAutoSearch={() => {
										// TODO: Trigger auto search
										console.log('Auto search:', series.id)
									}}
									onManualSearch={() => {
										// TODO: Open manual search
										console.log('Manual search:', series.id)
									}}
									onDelete={() => {
										setDeleteTarget({
											type: 'series',
											id: series.id,
											title: series.title,
											sizeBytes: series.sizeBytes,
										})
									}}
									onToggleMonitored={(monitored) => handleToggleMonitored(series, monitored)}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Footer */}
			<SeriesFooter
				totalSeries={totalSeries}
				continuingSeries={continuingSeries}
				endedSeries={endedSeries}
				filteredCount={filteredSeries.length}
				filteredSize={filteredSize}
				totalSize={totalSize}
				hasActiveFilters={!!hasActiveFilters}
			/>

			{/* Delete Confirmation Modal */}
			<DeleteConfirmationModal
				target={deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={handleDeleteConfirm}
				isPending={isDeleting}
			/>
		</div>
	)
}
