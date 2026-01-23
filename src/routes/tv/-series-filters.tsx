import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Resolution, SeriesStatus } from '@/db/schema'

export type SeriesStatusFilter = 'all' | SeriesStatus
export type MonitoredFilter = 'all' | 'monitored' | 'unmonitored'
export type SortOption = 'dateAdded' | 'title' | 'nextAiring' | 'year'

interface SeriesFiltersProps {
	statusFilter: SeriesStatusFilter
	onStatusFilterChange: (value: SeriesStatusFilter) => void
	qualityFilter: Resolution | 'all'
	onQualityFilterChange: (value: Resolution | 'all') => void
	monitoredFilter: MonitoredFilter
	onMonitoredFilterChange: (value: MonitoredFilter) => void
	yearRange: [number, number]
	onYearRangeChange: (value: [number, number]) => void
	sortBy: SortOption
	onSortByChange: (value: SortOption) => void
	sortDesc: boolean
	onSortDescChange: (value: boolean) => void
}

export function SeriesFilters({
	statusFilter,
	onStatusFilterChange,
	qualityFilter,
	onQualityFilterChange,
	monitoredFilter,
	onMonitoredFilterChange,
	yearRange,
	onYearRangeChange,
	sortBy,
	onSortByChange,
	sortDesc,
	onSortDescChange,
}: SeriesFiltersProps) {
	const hasYearFilter = yearRange[0] !== 1900 || yearRange[1] !== 2030
	const yearLabel = hasYearFilter ? `${yearRange[0]} - ${yearRange[1]}` : 'All Years'

	const hasActiveFilters = statusFilter !== 'all' || qualityFilter !== 'all' || monitoredFilter !== 'all' || hasYearFilter

	const clearAllFilters = () => {
		onStatusFilterChange('all')
		onQualityFilterChange('all')
		onMonitoredFilterChange('all')
		onYearRangeChange([1900, 2030])
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			{/* Quick Filters - Series Status Toggle */}
			<ToggleGroup
				value={[statusFilter]}
				onValueChange={(values) => {
					const value = values[0] as SeriesStatusFilter | undefined
					if (value) onStatusFilterChange(value)
				}}
				variant="outline"
			>
				<ToggleGroupItem
					value="all"
					className="data-[pressed]:text-white data-[pressed]:[background-color:rgba(59,130,246,0.9)]"
				>
					All
				</ToggleGroupItem>
				<ToggleGroupItem
					value="continuing"
					className="data-[pressed]:text-white data-[pressed]:[background-color:rgba(16,185,129,0.9)]"
				>
					Continuing
				</ToggleGroupItem>
				<ToggleGroupItem
					value="ended"
					className="data-[pressed]:text-white data-[pressed]:[background-color:rgba(107,114,128,0.9)]"
				>
					Ended
				</ToggleGroupItem>
			</ToggleGroup>

			{/* Quality Filter */}
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">Quality</span>
				<Select
					value={qualityFilter}
					onValueChange={(value) => onQualityFilterChange(value as Resolution | 'all')}
				>
					<SelectTrigger className="w-[140px]">
						<SelectValue>
							{qualityFilter === 'all' && 'All'}
							{qualityFilter === '2160p' && (
								<>
									2160p <span className="text-muted-foreground">(4K)</span>
								</>
							)}
							{qualityFilter === '1080p' && (
								<>
									1080p <span className="text-muted-foreground">(Full HD)</span>
								</>
							)}
							{qualityFilter === '720p' && (
								<>
									720p <span className="text-muted-foreground">(HD)</span>
								</>
							)}
							{qualityFilter === '480p' && (
								<>
									480p <span className="text-muted-foreground">(SD)</span>
								</>
							)}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All</SelectItem>
						<SelectItem value="2160p">
							2160p <span className="text-muted-foreground">(4K)</span>
						</SelectItem>
						<SelectItem value="1080p">
							1080p <span className="text-muted-foreground">(Full HD)</span>
						</SelectItem>
						<SelectItem value="720p">
							720p <span className="text-muted-foreground">(HD)</span>
						</SelectItem>
						<SelectItem value="480p">
							480p <span className="text-muted-foreground">(SD)</span>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Monitor Filter */}
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">Monitor</span>
				<Select
					value={monitoredFilter}
					onValueChange={(value) => onMonitoredFilterChange(value as MonitoredFilter)}
				>
					<SelectTrigger className="w-[130px]">
						<SelectValue>
							{monitoredFilter === 'all' && 'All'}
							{monitoredFilter === 'monitored' && 'Monitored'}
							{monitoredFilter === 'unmonitored' && 'Unmonitored'}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All</SelectItem>
						<SelectItem value="monitored">Monitored</SelectItem>
						<SelectItem value="unmonitored">Unmonitored</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Year Popover */}
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">Year</span>
				<Popover>
					<PopoverTrigger className="flex h-9 w-[130px] items-center justify-between gap-1.5 whitespace-nowrap rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50">
						{yearLabel}
						<ChevronDown className="size-4 opacity-50" />
					</PopoverTrigger>
					<PopoverContent
						align="start"
						className="w-[200px]"
					>
						<div className="space-y-3">
							<div>
								<Label className="mb-1.5 block text-muted-foreground text-xs">Year From</Label>
								<Input
									type="number"
									min="1900"
									max="2030"
									value={yearRange[0]}
									onChange={(e) => onYearRangeChange([Number(e.target.value), yearRange[1]])}
								/>
							</div>
							<div>
								<Label className="mb-1.5 block text-muted-foreground text-xs">Year To</Label>
								<Input
									type="number"
									min="1900"
									max="2030"
									value={yearRange[1]}
									onChange={(e) => onYearRangeChange([yearRange[0], Number(e.target.value)])}
								/>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</div>

			{/* Clear All Button */}
			{hasActiveFilters && (
				<Button
					variant="ghost"
					onClick={clearAllFilters}
					className="h-9 text-muted-foreground"
				>
					<X className="mr-1.5 size-3.5" />
					Clear
				</Button>
			)}

			{/* Sort Controls - pushed to the right */}
			<div className="ml-auto flex items-center gap-2">
				<span className="text-muted-foreground text-sm">Sort by</span>
				<div
					data-slot="button-group"
					className="flex items-center divide-x divide-border overflow-hidden rounded-md border border-input shadow-xs dark:border-input dark:bg-input/30"
				>
					<Select
						value={sortBy}
						onValueChange={(value) => onSortByChange(value as SortOption)}
					>
						<SelectTrigger className="w-[130px] rounded-none border-none shadow-none dark:bg-transparent">
							<SelectValue>
								{sortBy === 'dateAdded' && 'Date Added'}
								{sortBy === 'title' && 'Title'}
								{sortBy === 'nextAiring' && 'Next Airing'}
								{sortBy === 'year' && 'Year'}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="dateAdded">Date Added</SelectItem>
							<SelectItem value="title">Title</SelectItem>
							<SelectItem value="nextAiring">Next Airing</SelectItem>
							<SelectItem value="year">Year</SelectItem>
						</SelectContent>
					</Select>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onSortDescChange(!sortDesc)}
						title={sortDesc ? 'Descending' : 'Ascending'}
						className="rounded-none border-none shadow-none"
					>
						{sortDesc ? <ArrowDownWideNarrow className="size-4" /> : <ArrowUpNarrowWide className="size-4" />}
					</Button>
				</div>
			</div>
		</div>
	)
}
