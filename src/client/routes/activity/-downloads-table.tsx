import { Database, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Input } from '@/client/components/ui/input'
import type { Download } from '@/server/db/schema'

export interface DownloadItem extends Download {
	releaseTitle?: string
}

type FilterTab = 'all' | 'completed' | 'failed'

// Statuses that appear in queue section, not in downloads
const queueStatuses = ['queued', 'downloading', 'paused', 'unpacking', 'verifying']

interface DownloadsTableProps {
	items: DownloadItem[]
	onDelete?: (id: number) => void
	onRetry?: (id: number) => void
}

function FilterTabs({ activeTab, onTabChange }: { activeTab: FilterTab; onTabChange: (tab: FilterTab) => void }) {
	const tabs: { id: FilterTab; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'completed', label: 'Completed' },
		{ id: 'failed', label: 'Failed' },
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

function StatusBadge({ status }: { status: string }) {
	switch (status) {
		case 'completed':
			return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700 text-xs">Completed</span>
		case 'failed':
			return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700 text-xs">Failed</span>
		default:
			return <span className="inline-flex items-center rounded-full bg-navy-100 px-2.5 py-1 font-medium text-navy-600 text-xs">{status}</span>
	}
}

function formatSize(bytes: number | null): string {
	if (!bytes) return '--'
	const mb = bytes / (1024 * 1024)
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
	return `${mb.toFixed(1)} MB`
}

function formatRelativeDate(dateStr: string | null): string {
	if (!dateStr) return '--'
	const timestamp = new Date(dateStr).getTime() / 1000
	const now = Date.now() / 1000
	const diffSec = now - timestamp

	if (diffSec < 60) return 'Just now'
	if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
	if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
	if (diffSec < 172800) return 'Yesterday'
	if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`
	return new Date(timestamp * 1000).toLocaleDateString()
}

function parseQuality(name: string | null): string {
	if (!name) return '--'
	const match = name.match(/\b(2160p|1080p|720p|480p)\b/i)
	return match ? match[1] : '--'
}

export function DownloadsTable({ items, onDelete, onRetry }: DownloadsTableProps) {
	const [activeTab, setActiveTab] = useState<FilterTab>('all')
	const [searchQuery, setSearchQuery] = useState('')

	const filteredItems = useMemo(() => {
		// Exclude items that are in the queue
		let result = items.filter((item) => !queueStatuses.includes(item.status))

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

				<div className="relative">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-navy-400" />
					<Input
						type="text"
						placeholder="Search downloads..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-56 pl-9"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-sm border border-navy-200 bg-white">
				{filteredItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<div className="mb-4 rounded-sm bg-navy-100 p-4">
							<Database className="h-10 w-10 text-navy-400" />
						</div>
						<h3 className="mb-1 font-semibold text-lg text-navy-700">No downloads</h3>
						<p className="max-w-sm text-navy-500 text-sm">{searchQuery ? 'No items match your search.' : 'Tracked downloads will appear here.'}</p>
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
											<span className="text-navy-700 text-sm">{formatRelativeDate(item.queuedAt)}</span>
										</td>

										{/* Status */}
										<td className="px-4 py-3">
											<StatusBadge status={item.status} />
										</td>

										{/* Size */}
										<td className="hidden px-4 py-3 lg:table-cell">
											<span className="text-navy-700 text-sm">{formatSize(item.size)}</span>
										</td>

										{/* Quality */}
										<td className="hidden px-4 py-3 lg:table-cell">
											<span className="font-medium text-navy-700 text-sm">{parseQuality(item.title)}</span>
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
														title="Delete from downloads"
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
