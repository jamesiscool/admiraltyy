import { fetchNzbgetStatus, listNzbgetQueue, syncNzbgetHistory } from '@/services/nzbget/nzbgetApi'

const SLOW_INTERVAL_MS = 30_000 // 30s when idle
const FAST_INTERVAL_MS = 2_000 // 2s when active
const COOLDOWN_MS = 60_000 // stay fast for 60s after last activity

let lastActivityAt = 0
let currentTimer: ReturnType<typeof setTimeout> | null = null
let isPolling: boolean = false
let isStarted: boolean = false

export function startNzbgetPoller() {
	if (isStarted) return
	isStarted = true
	scheduleNext(SLOW_INTERVAL_MS)
	console.log('[NZBget Poller] Started')
}

export function stopNzbgetPoller() {
	if (currentTimer) {
		clearTimeout(currentTimer)
		currentTimer = null
	}
	isStarted = false
}

// Call when adding a download to immediately switch to fast mode
export function notifyDownloadActivity() {
	lastActivityAt = Date.now()
	// Reschedule immediately if we're in slow mode
	if (currentTimer && isStarted) {
		clearTimeout(currentTimer)
		scheduleNext(FAST_INTERVAL_MS)
	}
}

function scheduleNext(delayMs: number) {
	currentTimer = setTimeout(poll, delayMs)
}

async function poll() {
	if (isPolling) return
	isPolling = true

	try {
		const [status, queue] = await Promise.all([fetchNzbgetStatus(), listNzbgetQueue()])

		const isDownloading = queue.length > 0 || status.DownloadRate > 0
		const isPostProcessing = status.PostJobCount > 0
		const hasActiveWork = isDownloading || isPostProcessing

		if (hasActiveWork) {
			lastActivityAt = Date.now()
			console.log(`[NZBget Poller] Active: queue=${queue.length}, rate=${(status.DownloadRate / 1024 / 1024).toFixed(1)}MB/s, postJobs=${status.PostJobCount}`)
		}

		// Only sync history when both downloading AND post-processing are complete
		if (!hasActiveWork) {
			const result = await syncNzbgetHistory()
			if (result.synced > 0 || result.orphans > 0) {
				console.log(`[NZBget Poller] Synced history: ${result.synced} updated, ${result.orphans} orphans, ${result.cleared} cleared`)
			}
		}

		// Determine next interval
		const timeSinceActivity = Date.now() - lastActivityAt
		const inCooldown = timeSinceActivity < COOLDOWN_MS
		const nextInterval = hasActiveWork || inCooldown ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS

		scheduleNext(nextInterval)
	} catch (err) {
		console.error('[NZBget Poller] Error:', err)
		// On error, back off
		scheduleNext(SLOW_INTERVAL_MS)
	} finally {
		isPolling = false
	}
}
