import { CheckCircle2, History, RefreshCw, Search, Trash2, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/client/components/ui/button'
import { Input } from '@/client/components/ui/input'

export type HistoryStatus = 'completed' | 'failed' | 'removed'

export interface HistoryItem {
	id: string
	title: string
	date: string
	dateRaw: number
	status: HistoryStatus
	size: string
	quality: string
	errorMessage?: string
}

type FilterTab = 'all' | 'completed' | 'failed' | 'removed'

interface HistoryTableProps {
	items: HistoryItem[]
	onRetry?: (id: string) => void
	onDelete?: (id: string) => void
	onClearHistory?: () => void
}

function StatusBadge({ status }: { status: HistoryStatus }) {
	// biome-ignore lint/nursery/noUnnecessaryConditions: switch is cleaner than if/else chain
	switch (status) {
		case 'completed':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700 text-xs">
					<CheckCircle2 className="h-3 w-3" />
					Completed
				</span>
			)
		case 'failed':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700 text-xs">
					<XCircle className="h-3 w-3" />
					Failed
				</span>
			)
		case 'removed':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-navy-100 px-2.5 py-1 font-medium text-navy-600 text-xs">
					<Trash2 className="h-3 w-3" />
					Removed
				</span>
			)
	}
}

function FilterTabs({ activeTab, onTabChange }: { activeTab: FilterTab; onTabChange: (tab: FilterTab) => void }) {
	const tabs: { id: FilterTab; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'completed', label: 'Completed' },
		{ id: 'failed', label: 'Failed' },
		{ id: 'removed', label: 'Removed' },
	]

	return (
		<div className="flex items-center gap-1">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					onClick={() => onTabChange(tab.id)}
					className={`rounded-sm px-3 py-1.5 font-medium text-sm transition-colors ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-navy-600 hover:bg-navy-100'}`}
				>
					{tab.label}
				</button>
			))}
		</div>
	)
}

export function HistoryTable({ items, onRetry, onDelete, onClearHistory }: HistoryTableProps) {
	const [activeTab, setActiveTab] = useState<FilterTab>('all')
	const [searchQuery, setSearchQuery] = useState('')

	// Filter items
	const filteredItems = useMemo(() => {
		let result = items

		// Filter by tab
		if (activeTab !== 'all') {
			result = result.filter((item) => item.status === activeTab)
		}

		// Filter by search
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase()
			result = result.filter((item) => item.title.toLowerCase().includes(query))
		}

		return result
	}, [items, activeTab, searchQuery])

	return (
		<div>
			{/* Header with filters */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-4">
				<FilterTabs
					activeTab={activeTab}
					onTabChange={setActiveTab}
				/>

				<div className="flex items-center gap-3">
					<div className="relative">
						<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-navy-400" />
						<Input
							type="text"
							placeholder="Search history..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-56 pl-9"
						/>
					</div>
					{onClearHistory && (
						<Button
							variant="outline"
							onClick={onClearHistory}
						>
							Clear History
						</Button>
					)}
				</div>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-sm border border-navy-200 bg-white">
				{filteredItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<div className="mb-4 rounded-sm bg-navy-100 p-4">
							<History className="h-10 w-10 text-navy-400" />
						</div>
						<h3 className="mb-1 font-semibold text-lg text-navy-700">No history</h3>
						<p className="max-w-sm text-navy-500 text-sm">{searchQuery ? 'No items match your search.' : 'Completed downloads will appear here.'}</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-navy-200 border-b bg-navy-100/50">
									<th className="px-4 py-3 text-left font-semibold text-navy-600 text-xs">Title</th>
									<th className="hidden px-4 py-3 text-left font-semibold text-navy-600 text-xs md:table-cell">Date</th>
									<th className="px-4 py-3 text-left font-semibold text-navy-600 text-xs">Status</th>
									<th className="hidden px-4 py-3 text-left font-semibold text-navy-600 text-xs lg:table-cell">Size</th>
									<th className="hidden px-4 py-3 text-left font-semibold text-navy-600 text-xs lg:table-cell">Quality</th>
									<th className="px-4 py-3 text-right font-semibold text-navy-600 text-xs">Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.map((item, index) => (
									<tr
										key={item.id}
										className={`transition-colors hover:bg-navy-100/30 ${index !== filteredItems.length - 1 ? 'border-navy-200 border-b' : ''}`}
									>
										{/* Title */}
										<td className="px-4 py-3">
											<div className="font-medium text-foreground text-sm">{item.title}</div>
											{item.errorMessage && <div className="mt-0.5 text-red-500 text-xs">{item.errorMessage}</div>}
										</td>

										{/* Date */}
										<td className="hidden px-4 py-3 md:table-cell">
											<span className="text-navy-700 text-sm">{item.date}</span>
										</td>

										{/* Status */}
										<td className="px-4 py-3">
											<StatusBadge status={item.status} />
										</td>

										{/* Size */}
										<td className="hidden px-4 py-3 lg:table-cell">
											<span className="text-navy-700 text-sm">{item.size}</span>
										</td>

										{/* Quality */}
										<td className="hidden px-4 py-3 lg:table-cell">
											<span className="font-medium text-navy-700 text-sm">{item.quality}</span>
										</td>

										{/* Actions */}
										<td className="px-4 py-3">
											<div className="flex items-center justify-end gap-1">
												{/* Retry (for failed items) */}
												{item.status === 'failed' && onRetry && (
													<button
														type="button"
														onClick={() => onRetry(item.id)}
														className="rounded-sm p-1.5 text-navy-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
														title="Retry"
													>
														<RefreshCw className="h-4 w-4" />
													</button>
												)}

												{/* Delete */}
												{onDelete && (
													<button
														type="button"
														onClick={() => onDelete(item.id)}
														className="rounded-sm p-1.5 text-navy-400 transition-colors hover:bg-red-100 hover:text-red-600"
														title="Delete from history"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}
