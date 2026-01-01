import { AlertCircle, CheckCircle, History, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { HistoryItem, HistoryStatus } from '@/../product/sections/activity/types'

interface HistoryTableProps {
	items: HistoryItem[]
	onRetry?: (id: string) => void
	onDelete?: (id: string) => void
	onClear?: () => void
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMins = Math.floor(diffMs / (1000 * 60))
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffMins < 1) return 'Just now'
	if (diffMins < 60) return `${diffMins}m ago`
	if (diffHours < 24) return `${diffHours}h ago`
	if (diffDays === 1) return 'Yesterday'
	if (diffDays < 7) return `${diffDays}d ago`

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function StatusBadge({ status }: { status: HistoryStatus }) {
	switch (status) {
		case 'completed':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700 text-xs dark:bg-emerald-950 dark:text-emerald-300">
					<CheckCircle className="h-3 w-3" />
					Completed
				</span>
			)
		case 'failed':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700 text-xs dark:bg-red-950 dark:text-red-300">
					<AlertCircle className="h-3 w-3" />
					Failed
				</span>
			)
		case 'removed':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-300">
					<Trash2 className="h-3 w-3" />
					Removed
				</span>
			)
		default:
			return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-300">{status}</span>
	}
}

export function HistoryTable({ items, onRetry, onDelete, onClear }: HistoryTableProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<HistoryStatus | 'all'>('all')

	const filteredItems = useMemo(() => {
		let result = [...items]

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			result = result.filter((item) => item.title.toLowerCase().includes(query))
		}

		// Status filter
		if (statusFilter !== 'all') {
			result = result.filter((item) => item.status === statusFilter)
		}

		return result
	}, [items, searchQuery, statusFilter])

	return (
		<div>
			{/* Search and Filters */}
			<div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
				{/* Status Filter Buttons */}
				<div className="flex items-center gap-2">
					<button
						onClick={() => setStatusFilter('all')}
						className={`rounded-sm px-3 py-1.5 font-medium text-sm transition-all ${
							statusFilter === 'all'
								? 'border border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
								: 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800'
						}`}
					>
						All
					</button>
					<button
						onClick={() => setStatusFilter('completed')}
						className={`rounded-sm px-3 py-1.5 font-medium text-sm transition-all ${
							statusFilter === 'completed'
								? 'border border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
								: 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800'
						}`}
					>
						Completed
					</button>
					<button
						onClick={() => setStatusFilter('failed')}
						className={`rounded-sm px-3 py-1.5 font-medium text-sm transition-all ${
							statusFilter === 'failed'
								? 'border border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
								: 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800'
						}`}
					>
						Failed
					</button>
					<button
						onClick={() => setStatusFilter('removed')}
						className={`rounded-sm px-3 py-1.5 font-medium text-sm transition-all ${
							statusFilter === 'removed'
								? 'border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
								: 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800'
						}`}
					>
						Removed
					</button>
				</div>

				{/* Search and Clear History */}
				<div className="flex w-full items-center gap-3 sm:w-auto">
					{/* Search */}
					<div className="relative flex-1 sm:w-64 sm:flex-initial">
						<Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
						<input
							type="text"
							placeholder="Search history..."
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

					{/* Clear History */}
					{items.length > 0 && (
						<button
							onClick={() => onClear?.()}
							className="whitespace-nowrap rounded-sm border border-slate-300 px-4 py-1.5 font-medium text-slate-600 text-sm transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700/50 dark:text-slate-400 dark:hover:border-red-500/30 dark:hover:bg-red-950/30 dark:hover:text-red-400"
						>
							Clear History
						</button>
					)}
				</div>
			</div>

			{/* Table */}
			{filteredItems.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-sm border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900/50">
					<div className="mb-4 rounded-sm bg-slate-100 p-4 dark:bg-slate-800/30">
						<History className="h-10 w-10 text-slate-400 dark:text-slate-600" />
					</div>
					<h3 className="mb-1 font-semibold text-lg text-slate-700 dark:text-slate-300">{items.length === 0 ? 'No history yet' : 'No results found'}</h3>
					<p className="max-w-sm text-slate-500 text-sm dark:text-slate-500">
						{items.length === 0 ? 'Completed downloads will appear here.' : `No items match "${searchQuery}". Try a different search term.`}
					</p>
					{(searchQuery || statusFilter !== 'all') && (
						<button
							onClick={() => {
								setSearchQuery('')
								setStatusFilter('all')
							}}
							className="mt-4 rounded-sm bg-slate-200 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
						>
							Clear filters
						</button>
					)}
				</div>
			) : (
				<div className="overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-slate-200 border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
									<th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs dark:text-slate-400">Title</th>
									<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs sm:table-cell dark:text-slate-400">Date</th>
									<th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs dark:text-slate-400">Status</th>
									<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs md:table-cell dark:text-slate-400">Size</th>
									<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs lg:table-cell dark:text-slate-400">Quality</th>
									<th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs dark:text-slate-400">Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.map((item, index) => (
									<tr
										key={item.id}
										className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${index !== filteredItems.length - 1 ? 'border-slate-200 border-b dark:border-slate-800' : ''}`}
									>
										{/* Title */}
										<td className="px-4 py-3">
											<div className="font-medium text-slate-900 text-sm dark:text-slate-100">{item.title}</div>
											{item.status === 'failed' && item.errorMessage && <div className="mt-0.5 text-red-600 text-xs dark:text-red-400">{item.errorMessage}</div>}
										</td>

										{/* Date */}
										<td className="hidden px-4 py-3 sm:table-cell">
											<span className="text-slate-700 text-sm dark:text-slate-300">{formatDate(item.timestamp)}</span>
										</td>

										{/* Status */}
										<td className="px-4 py-3">
											<StatusBadge status={item.status} />
										</td>

										{/* Size */}
										<td className="hidden px-4 py-3 md:table-cell">
											<span className="text-slate-700 text-sm dark:text-slate-300">{item.size}</span>
										</td>

										{/* Quality */}
										<td className="hidden px-4 py-3 lg:table-cell">
											<span className="font-medium text-slate-700 text-sm dark:text-slate-300">{item.quality.split(' ')[0]}</span>
										</td>

										{/* Actions */}
										<td className="px-4 py-3">
											<div className="flex items-center justify-end gap-1">
												{item.status === 'failed' && (
													<button
														onClick={() => onRetry?.(item.id)}
														className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
														title="Retry"
													>
														<RotateCcw className="h-4 w-4" />
													</button>
												)}
												<button
													onClick={() => onDelete?.(item.id)}
													className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
													title="Delete"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
}
