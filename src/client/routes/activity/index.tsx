import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { useNzbgetQueue, useNzbgetStatus } from '@/client/lib/api'
import { type ActivityAlert, AlertBanner } from './-alert-banner'
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
		return result
	}, [statusError, queueError, dismissedAlerts])

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
			</div>
		</div>
	)
}
