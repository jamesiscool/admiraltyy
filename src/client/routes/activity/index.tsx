import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useDownloads, useNzbgetHistory, useNzbgetQueue, useNzbgetStatus, useSyncNzbget } from '@/client/lib/api'
import { type ActivityAlert, AlertBanner } from './-alert-banner'
import { DownloadsTable } from './-downloads-table'
import { type HistoryItem, type HistoryStatus, HistoryTable } from './-history-table'
import { type DownloadStatus, type QueueItem, QueueTable } from './-queue-table'

export const Route = createFileRoute('/activity/')({
	component: RouteComponent,
})

// Map NZBGet status string to our status type
function parseStatus(status: string): DownloadStatus {
	const s = status.toUpperCase()
	if (s.includes('DOWNLOADING') || s === 'FETCHING') return 'downloading'
	if (s.includes('PAUSED')) return 'paused'
	if (s.includes('QUEUED') || s === 'WAITING') return 'queued'
	if (s.includes('UNPACK') || s.includes('POST')) return 'unpacking'
	if (s.includes('VERIF')) return 'verifying'
	return 'queued'
}

// Format bytes to human readable
function formatSize(mb: number): string {
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
	return `${mb.toFixed(1)} MB`
}

// Format seconds to ETA string
function formatEta(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) return '--'
	if (seconds < 60) return `${Math.round(seconds)}s`
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
	const hours = Math.floor(seconds / 3600)
	const mins = Math.floor((seconds % 3600) / 60)
	return `${hours}h ${mins}m`
}

// Parse quality from filename
function parseQuality(name: string): string {
	const match = name.match(/\b(2160p|1080p|720p|480p)\b/i)
	return match ? match[1] : '--'
}

// Parse history status from NZBGet status string
function parseHistoryStatus(status: string, deleteStatus: string, markStatus: string): HistoryStatus {
	if (markStatus === 'BAD' || deleteStatus === 'MANUAL' || deleteStatus === 'DUPE' || deleteStatus === 'HEALTH') {
		return 'removed'
	}
	if (status === 'SUCCESS' || status === 'SUCCESS/ALL' || status.includes('SUCCESS')) {
		return 'completed'
	}
	return 'failed'
}

// Format relative date
function formatRelativeDate(timestamp: number): string {
	const now = Date.now() / 1000
	const diffSec = now - timestamp

	if (diffSec < 60) return 'Just now'
	if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
	if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
	if (diffSec < 172800) return 'Yesterday'
	if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`
	return new Date(timestamp * 1000).toLocaleDateString()
}

// Get error message from history item
function getErrorMessage(status: string, health: number, criticalHealth: number): string | undefined {
	if (status.includes('FAILURE') || status.includes('FAIL')) {
		if (health < criticalHealth) {
			const completionPercent = Math.round((health / 1000) * 100)
			return `Not enough repair blocks available (${completionPercent}% completion)`
		}
		if (status.includes('UNPACK')) return 'Unpack failed'
		if (status.includes('PAR')) return 'Repair failed'
		return 'Download failed'
	}
	return undefined
}

interface SpeedSample {
	id: number
	value: number
}

// Speed histogram component
function SpeedHistogram({ samples }: { samples: SpeedSample[] }) {
	if (samples.length === 0) return null
	const max = Math.max(...samples.map((s) => s.value), 1)
	return (
		<div className="flex h-5 items-end gap-px overflow-hidden rounded-b-xs">
			{samples.map((sample) => (
				<div
					key={sample.id}
					className="w-[2px] bg-blue-500"
					style={{ height: `${(sample.value / max) * 100}%` }}
				/>
			))}
		</div>
	)
}

function RouteComponent() {
	const { data: status, error: statusError } = useNzbgetStatus()
	const { data: queue, error: queueError } = useNzbgetQueue()
	const { data: history, error: historyError } = useNzbgetHistory()
	const { data: downloads } = useDownloads()
	const syncNzbget = useSyncNzbget()

	// Dismissed alerts state
	const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

	// Speed history for histogram (last 36 samples)
	const speedHistoryRef = useRef<SpeedSample[]>([])
	const sampleIdRef = useRef(0)
	const currentSpeedMBps = status ? status.DownloadRate / 1024 / 1024 : 0

	// Update speed history
	if (status) {
		const history = speedHistoryRef.current
		sampleIdRef.current += 1
		history.push({ id: sampleIdRef.current, value: currentSpeedMBps })
		if (history.length > 36) history.shift()
	}

	// Build alerts from errors
	const alerts = useMemo<ActivityAlert[]>(() => {
		const result: ActivityAlert[] = []
		if (statusError && !dismissedAlerts.has('status-error')) {
			result.push({
				id: 'status-error',
				type: 'error',
				message: `Connection refused: ${statusError.message}. Please check your network settings.`,
				dismissible: true,
			})
		}
		if (queueError && !dismissedAlerts.has('queue-error')) {
			result.push({
				id: 'queue-error',
				type: 'error',
				message: `Queue error: ${queueError.message}`,
				dismissible: true,
			})
		}
		if (historyError && !dismissedAlerts.has('history-error')) {
			result.push({
				id: 'history-error',
				type: 'error',
				message: `History error: ${historyError.message}`,
				dismissible: true,
			})
		}
		return result
	}, [statusError, queueError, historyError, dismissedAlerts])

	// Transform NZBGet queue to our format
	const queueItems = useMemo<QueueItem[]>(() => {
		if (!queue) return []
		return queue.map((item) => {
			const progress = item.FileSizeMB > 0 ? ((item.FileSizeMB - item.RemainingSizeMB) / item.FileSizeMB) * 100 : 0
			// Calculate ETA: remaining MB / (download rate in MB/s)
			const downloadRateMBps = currentSpeedMBps
			const etaSeconds = downloadRateMBps > 0 ? item.RemainingSizeMB / downloadRateMBps : 0

			return {
				id: String(item.NZBID),
				title: item.NZBName,
				progress,
				eta: formatEta(etaSeconds),
				size: formatSize(item.FileSizeMB),
				status: parseStatus(item.Status),
				quality: parseQuality(item.NZBName),
			}
		})
	}, [queue, currentSpeedMBps])

	// Transform NZBGet history to our format
	const historyItems = useMemo<HistoryItem[]>(() => {
		if (!history) return []
		return history.map((item) => ({
			id: String(item.NZBID),
			title: item.Name,
			date: formatRelativeDate(item.HistoryTime),
			dateRaw: item.HistoryTime,
			status: parseHistoryStatus(item.Status, item.DeleteStatus, item.MarkStatus),
			size: formatSize(item.FileSizeMB),
			quality: parseQuality(item.Name),
			errorMessage: getErrorMessage(item.Status, item.Health, item.CriticalHealth),
		}))
	}, [history])

	const handleDismissAlert = (id: string) => {
		setDismissedAlerts((prev) => new Set(prev).add(id))
	}

	const hasActiveDownloads = queueItems.some((item) => item.status === 'downloading')

	return (
		<div className="overflow-y-auto">
			<div className="container">
				<h1 className="mb-4">Activity</h1>

				{/* Alert Banner */}
				{alerts.length > 0 && (
					<div className="mb-6">
						<AlertBanner
							alerts={alerts}
							onDismiss={handleDismissAlert}
						/>
					</div>
				)}

				{/* Queue Section */}
				<section className="mb-8">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-bold text-lg tracking-tight">Queue</h2>
						{hasActiveDownloads && (
							<div className="flex items-center gap-3">
								<SpeedHistogram samples={speedHistoryRef.current} />
								<div className="text-lg text-navy-600">
									<span className="font-semibold text-foreground">{currentSpeedMBps.toFixed(1)} MB/s</span>
								</div>
							</div>
						)}
					</div>

					<div className="overflow-hidden rounded-sm border border-navy-200 bg-white">
						<QueueTable
							items={queueItems}
							onPause={(id) => console.log('Pause:', id)}
							onResume={(id) => console.log('Resume:', id)}
							onCancel={(id) => console.log('Cancel:', id)}
							onReorder={(id, dir) => console.log('Reorder:', id, dir)}
							onForceStart={(id) => console.log('Force start:', id)}
						/>
					</div>
				</section>

				{/* Downloads Section */}
				<section className="mb-8">
					<div className="mb-4 flex items-center gap-2">
						<h2 className="font-bold text-lg tracking-tight">Downloads</h2>
						<button
							type="button"
							onClick={() => syncNzbget.mutate({})}
							disabled={syncNzbget.isPending}
							className="rounded-sm p-1.5 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-600 disabled:opacity-50"
							title="Sync with NZBGet"
						>
							<RefreshCw className={`h-4 w-4 ${syncNzbget.isPending ? 'animate-spin' : ''}`} />
						</button>
					</div>
					<DownloadsTable
						items={downloads ?? []}
						onDelete={(id) => console.log('Delete download:', id)}
						onRetry={(id) => console.log('Retry download:', id)}
					/>
				</section>

				{/* History Section */}
				<section className="mb-8">
					<h2 className="mb-4 font-bold text-lg tracking-tight">History</h2>
					<HistoryTable
						items={historyItems}
						onRetry={(id) => console.log('Retry:', id)}
						onDelete={(id) => console.log('Delete:', id)}
						onClearHistory={() => console.log('Clear history')}
					/>
				</section>
			</div>
		</div>
	)
}
