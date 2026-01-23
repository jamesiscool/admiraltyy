import { CheckCircle2, ChevronDown, ChevronUp, Clock, Download, GripVertical, ListOrdered, Package, Pause, Play, X, Zap } from 'lucide-react'

export type DownloadStatus = 'downloading' | 'paused' | 'queued' | 'unpacking' | 'verifying'

export interface QueueItem {
	id: string
	title: string
	progress: number
	eta: string
	size: string
	status: DownloadStatus
	quality: string
}

interface QueueTableProps {
	items: QueueItem[]
	onPause?: (id: string) => void
	onResume?: (id: string) => void
	onCancel?: (id: string) => void
	onReorder?: (id: string, direction: 'up' | 'down') => void
	onForceStart?: (id: string) => void
}

function StatusBadge({ status }: { status: DownloadStatus }) {
	// biome-ignore lint/nursery/noUnnecessaryConditions: switch is cleaner than if/else chain
	switch (status) {
		case 'downloading':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700 text-xs">
					<Download className="h-3 w-3" />
					Downloading
				</span>
			)
		case 'paused':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-navy-100 px-2.5 py-1 font-medium text-navy-600 text-xs">
					<Pause className="h-3 w-3" />
					Paused
				</span>
			)
		case 'queued':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-navy-100 px-2.5 py-1 font-medium text-navy-600 text-xs">
					<Clock className="h-3 w-3" />
					Queued
				</span>
			)
		case 'unpacking':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-1 font-medium text-xs text-yellow-600">
					<Package className="h-3 w-3" />
					Unpacking
				</span>
			)
		case 'verifying':
			return (
				<span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-600 text-xs">
					<CheckCircle2 className="h-3 w-3" />
					Verifying
				</span>
			)
		default:
			return <span className="inline-flex items-center rounded-full bg-navy-100 px-2.5 py-1 font-medium text-navy-600 text-xs">{status}</span>
	}
}

export function QueueTable({ items, onPause, onResume, onCancel, onReorder, onForceStart }: QueueTableProps) {
	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="mb-4 rounded-sm bg-navy-100 p-4">
					<ListOrdered className="h-10 w-10 text-navy-400" />
				</div>
				<h3 className="mb-1 font-semibold text-lg text-navy-700">Queue is empty</h3>
				<p className="max-w-sm text-navy-500 text-sm">No active downloads. Add movies or TV shows to start downloading.</p>
			</div>
		)
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-navy-200 border-b bg-navy-100/50">
						<th className="w-10 px-2 py-3" />
						<th className="px-4 py-3 text-left font-semibold text-navy-600 text-xs">Title</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-navy-600 text-xs sm:table-cell">Progress</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-navy-600 text-xs lg:table-cell">ETA</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-navy-600 text-xs lg:table-cell">Size</th>
						<th className="hidden px-4 py-3 text-left font-semibold text-navy-600 text-xs lg:table-cell">Quality</th>
						<th className="px-4 py-3 text-left font-semibold text-navy-600 text-xs">Status</th>
						<th className="w-16 px-2 py-3 text-center font-semibold text-navy-600 text-xs">Order</th>
						<th className="px-4 py-3 text-right font-semibold text-navy-600 text-xs">Actions</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item, index) => (
						<tr
							key={item.id}
							className={`transition-colors hover:bg-navy-100/30 ${index !== items.length - 1 ? 'border-navy-200 border-b' : ''}`}
						>
							{/* Drag Handle */}
							<td className="px-2 py-3">
								<div className="cursor-grab text-navy-400 active:cursor-grabbing">
									<GripVertical className="h-4 w-4" />
								</div>
							</td>

							{/* Title */}
							<td className="px-4 py-3">
								<div className="font-medium text-foreground text-sm">{item.title}</div>
							</td>

							{/* Progress */}
							<td className="hidden px-4 py-3 sm:table-cell">
								<div className="flex items-center gap-3">
									<div className="h-1.5 w-24 overflow-hidden rounded-full bg-navy-200">
										<div
											className={`h-full transition-all duration-300 ${item.status === 'paused' ? 'bg-navy-400' : 'bg-blue-500'}`}
											style={{ width: `${item.progress}%` }}
										/>
									</div>
									<span className="font-medium text-navy-700 text-sm tabular-nums">{item.progress.toFixed(1)}%</span>
								</div>
							</td>

							{/* ETA */}
							<td className="hidden px-4 py-3 lg:table-cell">
								<span className="text-navy-700 text-sm tabular-nums">{item.eta}</span>
							</td>

							{/* Size */}
							<td className="hidden px-4 py-3 lg:table-cell">
								<span className="text-navy-700 text-sm">{item.size}</span>
							</td>

							{/* Quality */}
							<td className="hidden px-4 py-3 lg:table-cell">
								<span className="font-medium text-navy-700 text-sm">{item.quality}</span>
							</td>

							{/* Status */}
							<td className="px-4 py-3">
								<StatusBadge status={item.status} />
							</td>

							{/* Order */}
							<td className="px-2 py-3">
								<div className="flex items-center justify-center gap-0.5">
									<button
										type="button"
										onClick={() => onReorder?.(item.id, 'up')}
										disabled={index === 0}
										className="rounded-sm p-1 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-600 disabled:cursor-not-allowed disabled:opacity-30"
										title="Move up"
									>
										<ChevronUp className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => onReorder?.(item.id, 'down')}
										disabled={index === items.length - 1}
										className="rounded-sm p-1 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-600 disabled:cursor-not-allowed disabled:opacity-30"
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
											type="button"
											onClick={() => onResume?.(item.id)}
											className="rounded-sm p-1.5 text-navy-400 transition-colors hover:bg-green-100 hover:text-green-600"
											title="Resume"
										>
											<Play className="h-4 w-4" />
										</button>
									) : item.status === 'downloading' ? (
										<button
											type="button"
											onClick={() => onPause?.(item.id)}
											className="rounded-sm p-1.5 text-navy-400 transition-colors hover:bg-yellow-100 hover:text-yellow-600"
											title="Pause"
										>
											<Pause className="h-4 w-4" />
										</button>
									) : null}

									{/* Force Start (for queued items) */}
									{item.status === 'queued' && (
										<button
											type="button"
											onClick={() => onForceStart?.(item.id)}
											className="rounded-sm p-1.5 text-navy-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
											title="Force start"
										>
											<Zap className="h-4 w-4" />
										</button>
									)}

									{/* Cancel */}
									<button
										type="button"
										onClick={() => onCancel?.(item.id)}
										className="rounded-sm p-1.5 text-navy-400 transition-colors hover:bg-red-100 hover:text-red-600"
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
