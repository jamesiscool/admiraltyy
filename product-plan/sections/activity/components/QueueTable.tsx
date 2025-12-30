import { CheckCircle2, ChevronDown, ChevronUp, Clock, Download, GripVertical, ListOrdered, Package, Pause, Play, X, Zap } from 'lucide-react'
import type { QueueItem } from '@/../product/sections/activity/types'

interface QueueTableProps {
	items: QueueItem[]
	speed?: string
	onPause?: (id: string) => void
	onResume?: (id: string) => void
	onCancel?: (id: string) => void
	onReorder?: (id: string, direction: 'up' | 'down') => void
	onForceStart?: (id: string) => void
}

function StatusBadge({ status }: { status: QueueItem['status'] }) {
	switch (status) {
		case 'downloading':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 text-xs dark:bg-blue-950 dark:text-blue-300">
					<Download className="h-3 w-3" />
					Downloading
				</span>
			)
		case 'paused':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-300">
					<Pause className="h-3 w-3" />
					Paused
				</span>
			)
		case 'queued':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-300">
					<Clock className="h-3 w-3" />
					Queued
				</span>
			)
		case 'unpacking':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 text-xs dark:bg-amber-950 dark:text-amber-300">
					<Package className="h-3 w-3" />
					Unpacking
				</span>
			)
		case 'verifying':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700 text-xs dark:bg-sky-950 dark:text-sky-300">
					<CheckCircle2 className="h-3 w-3" />
					Verifying
				</span>
			)
		default:
			return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-300">{status}</span>
	}
}

export function QueueTable({ items, onPause, onResume, onCancel, onReorder, onForceStart }: QueueTableProps) {
	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="mb-4 rounded-sm bg-slate-100 p-4 dark:bg-slate-800/30">
					<ListOrdered className="h-10 w-10 text-slate-400 dark:text-slate-600" />
				</div>
				<h3 className="mb-1 font-semibold text-lg text-slate-700 dark:text-slate-300">Queue is empty</h3>
				<p className="max-w-sm text-slate-500 text-sm dark:text-slate-500">No active downloads. Add movies or TV shows to start downloading.</p>
			</div>
		)
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-slate-200 border-b bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
						<th className="w-10 px-2 py-3"></th>
						<th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs dark:text-slate-400">Title</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs sm:table-cell dark:text-slate-400">Progress</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs lg:table-cell dark:text-slate-400">ETA</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs lg:table-cell dark:text-slate-400">Size</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-slate-600 text-xs lg:table-cell dark:text-slate-400">Quality</th>
						<th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs dark:text-slate-400">Status</th>
						<th className="w-16 px-2 py-3 text-center font-semibold text-slate-600 text-xs dark:text-slate-400">Order</th>
						<th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs dark:text-slate-400">Actions</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item, index) => (
						<tr
							key={item.id}
							className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${index !== items.length - 1 ? 'border-slate-200 border-b dark:border-slate-800' : ''}`}
						>
							{/* Drag Handle */}
							<td className="px-2 py-3">
								<div className="cursor-grab text-slate-400 active:cursor-grabbing dark:text-slate-600">
									<GripVertical className="h-4 w-4" />
								</div>
							</td>

							{/* Title */}
							<td className="px-4 py-3">
								<div className="font-medium text-slate-900 text-sm dark:text-slate-100">{item.title}</div>
							</td>

							{/* Progress */}
							<td className="hidden px-4 py-3 sm:table-cell">
								<div className="flex items-center gap-3">
									<div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
										<div
											className={`h-full transition-all duration-300 ${item.status === 'paused' ? 'bg-slate-400 dark:bg-slate-500' : 'bg-blue-600 dark:bg-blue-500'}`}
											style={{ width: `${item.progress}%` }}
										/>
									</div>
									<span className="font-medium text-slate-700 text-sm tabular-nums dark:text-slate-300">{item.progress.toFixed(1)}%</span>
								</div>
							</td>

							{/* ETA */}
							<td className="hidden px-4 py-3 lg:table-cell">
								<span className="text-slate-700 text-sm tabular-nums dark:text-slate-300">{item.eta}</span>
							</td>

							{/* Size */}
							<td className="hidden px-4 py-3 lg:table-cell">
								<span className="text-slate-700 text-sm dark:text-slate-300">{item.size}</span>
							</td>

							{/* Quality */}
							<td className="hidden px-4 py-3 lg:table-cell">
								<span className="font-medium text-slate-700 text-sm dark:text-slate-300">{item.quality.split(' ')[0]}</span>
							</td>

							{/* Status */}
							<td className="px-4 py-3">
								<StatusBadge status={item.status} />
							</td>

							{/* Order */}
							<td className="px-2 py-3">
								<div className="flex items-center justify-center gap-0.5">
									<button
										onClick={() => onReorder?.(item.id, 'up')}
										disabled={index === 0}
										className="rounded-sm p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
										title="Move up"
									>
										<ChevronUp className="h-4 w-4" />
									</button>
									<button
										onClick={() => onReorder?.(item.id, 'down')}
										disabled={index === items.length - 1}
										className="rounded-sm p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
										title="Move down"
									>
										<ChevronDown className="h-4 w-4" />
									</button>
								</div>
							</td>

							{/* Actions */}
							<td className="px-4 py-3">
								<div className="flex items-center justify-end gap-1">
									{/* Pause/Resume */}
									{item.status === 'paused' ? (
										<button
											onClick={() => onResume?.(item.id)}
											className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-500 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400"
											title="Resume"
										>
											<Play className="h-4 w-4" />
										</button>
									) : item.status === 'downloading' ? (
										<button
											onClick={() => onPause?.(item.id)}
											className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:text-slate-500 dark:hover:bg-amber-950/50 dark:hover:text-amber-400"
											title="Pause"
										>
											<Pause className="h-4 w-4" />
										</button>
									) : null}

									{/* Force Start (for queued items) */}
									{item.status === 'queued' && (
										<button
											onClick={() => onForceStart?.(item.id)}
											className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
											title="Force start"
										>
											<Zap className="h-4 w-4" />
										</button>
									)}

									{/* Cancel */}
									<button
										onClick={() => onCancel?.(item.id)}
										className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
										title="Cancel"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
