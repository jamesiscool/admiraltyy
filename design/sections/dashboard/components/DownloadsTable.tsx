import { AlertCircle, Download, Film, HardDrive, Tv } from 'lucide-react'
import type { RecentDownload } from '@/../product/sections/dashboard/types'

interface DownloadsTableProps {
	downloads: RecentDownload[]
	onDownloadClick?: (download: RecentDownload) => void
}

/**
 * Format bytes to a human-readable size.
 */
function formatSize(bytes: number): string {
	if (bytes === 0) return '—'
	const gb = bytes / 1_000_000_000
	if (gb >= 1) return `${gb.toFixed(1)} GB`
	const mb = bytes / 1_000_000
	return `${mb.toFixed(0)} MB`
}

/**
 * Format date to relative or short format.
 */
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

	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Get status badge component matching Activity view style.
 */
function StatusBadge({ status }: { status: RecentDownload['status'] }) {
	switch (status) {
		case 'downloading':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 text-xs dark:bg-blue-950 dark:text-blue-300">
					<Download className="h-3 w-3" />
					Downloading
				</span>
			)
		case 'importing':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 text-xs dark:bg-amber-950 dark:text-amber-300">
					<Download className="h-3 w-3" />
					Importing
				</span>
			)
		case 'completed':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700 text-xs dark:bg-emerald-950 dark:text-emerald-300">
					<HardDrive className="h-3 w-3" />
					Complete
				</span>
			)
		case 'failed':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700 text-xs dark:bg-red-950 dark:text-red-300">
					<AlertCircle className="h-3 w-3" />
					Failed
				</span>
			)
		default:
			return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-300">{status}</span>
	}
}

export function DownloadsTable({ downloads, onDownloadClick }: DownloadsTableProps) {
	if (downloads.length === 0) {
		return <div className="py-8 text-center text-slate-500 text-sm dark:text-slate-400">No recent downloads</div>
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-slate-200 border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
						<th className="py-3 pr-4 pl-10 text-left font-semibold text-slate-600 text-xs dark:text-slate-400">Title</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs sm:table-cell dark:text-slate-400">Progress</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs md:table-cell dark:text-slate-400">Quality</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs lg:table-cell dark:text-slate-400">Size</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs xl:table-cell dark:text-slate-400">Date</th>
						<th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs dark:text-slate-400">Status</th>
					</tr>
				</thead>
				<tbody>
					{downloads.slice(0, 10).map((download, index) => (
						<tr
							key={download.id}
							onClick={() => onDownloadClick?.(download)}
							className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
								index !== downloads.slice(0, 10).length - 1 ? 'border-slate-200 border-b dark:border-slate-800' : ''
							}`}
						>
							{/* Title with Icon */}
							<td className="py-3 pr-4 pl-3">
								<div className="flex items-center gap-3">
									{download.type === 'movie' ? <Film className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" /> : <Tv className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />}
									<span className="font-medium text-slate-900 text-sm dark:text-slate-100">{download.title}</span>
								</div>
							</td>

							{/* Progress */}
							<td className="hidden px-4 py-3 sm:table-cell">
								{download.status === 'downloading' ? (
									<div className="flex items-center gap-3">
										<div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
											<div
												className="h-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
												style={{ width: `${download.progress}%` }}
											/>
										</div>
										<span className="font-medium text-slate-700 text-sm tabular-nums dark:text-slate-300">{download.progress.toFixed(1)}%</span>
									</div>
								) : (
									<span className="text-slate-500 text-sm dark:text-slate-500">—</span>
								)}
							</td>

							{/* Quality */}
							<td className="hidden px-4 py-3 md:table-cell">
								<span className="font-medium text-slate-700 text-sm dark:text-slate-300">{download.quality}</span>
							</td>

							{/* Size */}
							<td className="hidden px-4 py-3 lg:table-cell">
								<span className="text-slate-700 text-sm dark:text-slate-300">{formatSize(download.size)}</span>
							</td>

							{/* Date */}
							<td className="hidden px-4 py-3 xl:table-cell">
								<span className="text-slate-700 text-sm dark:text-slate-300">{formatDate(download.dateDownloaded)}</span>
							</td>

							{/* Status */}
							<td className="px-4 py-3">
								<div className="flex justify-end">
									<StatusBadge status={download.status} />
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
