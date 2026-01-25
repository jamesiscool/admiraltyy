import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NzbgetQueueItem, NzbgetStatus } from '@/services/nzbget/nzbgetSchema'

const SLOW_INTERVAL_MS = 30_000
const FAST_INTERVAL_MS = 2_000
const COOLDOWN_MS = 60_000

// Mock functions that we can access across tests
const mockFetchStatus = vi.fn()
const mockListQueue = vi.fn()
const mockSyncHistory = vi.fn()

// Mock the nzbgetApi module
vi.mock('@/services/nzbget/nzbgetApi', () => ({
	fetchNzbgetStatus: mockFetchStatus,
	listNzbgetQueue: mockListQueue,
	syncNzbgetHistory: mockSyncHistory,
}))

function makeIdleStatus(): NzbgetStatus {
	return {
		RemainingSizeMB: 0,
		DownloadedSizeMB: 0,
		DownloadRate: 0,
		DownloadPaused: false,
		PostPaused: false,
		ServerStandBy: true,
		UpTimeSec: 3600,
		DownloadTimeSec: 0,
		FreeDiskSpaceMB: 100000,
		PostJobCount: 0,
		UrlCount: 0,
		ThreadCount: 1,
		DownloadLimit: 0,
		AverageDownloadRate: 0,
		MonthSizeMB: 0,
		DaySizeMB: 0,
		ArticleCacheMB: 0,
		NewsServers: [],
	}
}

function makeActiveStatus(overrides: Partial<NzbgetStatus> = {}): NzbgetStatus {
	return {
		...makeIdleStatus(),
		ServerStandBy: false,
		DownloadRate: 10_000_000, // 10 MB/s
		...overrides,
	}
}

function makeQueueItem(overrides: Partial<NzbgetQueueItem> = {}): NzbgetQueueItem {
	return {
		NZBID: 1,
		NZBName: 'Test.Download',
		NZBFilename: 'test.nzb',
		Kind: 'NZB',
		URL: '',
		DestDir: '/downloads/inter',
		FinalDir: '',
		Category: '',
		FileSizeMB: 1000,
		RemainingSizeMB: 500,
		PausedSizeMB: 0,
		FileCount: 10,
		RemainingFileCount: 5,
		Status: 'DOWNLOADING',
		Health: 1000,
		CriticalHealth: 900,
		DownloadedSizeMB: 500,
		DownloadTimeSec: 60,
		ActiveDownloads: 4,
		MaxPriority: 0,
		PostInfoText: '',
		PostStageProgress: 0,
		...overrides,
	}
}

describe('nzbgetPoller', () => {
	// Dynamic imports to get fresh module state
	let startNzbgetPoller: () => void
	let stopNzbgetPoller: () => void
	let notifyDownloadActivity: () => void

	beforeEach(async () => {
		vi.useFakeTimers()
		vi.clearAllMocks()

		// Reset module cache to get fresh poller state
		vi.resetModules()

		// Re-import poller with fresh state
		const pollerModule = await import('@/services/nzbget/nzbgetPoller')
		startNzbgetPoller = pollerModule.startNzbgetPoller
		stopNzbgetPoller = pollerModule.stopNzbgetPoller
		notifyDownloadActivity = pollerModule.notifyDownloadActivity

		// Default mock responses - idle state
		mockFetchStatus.mockResolvedValue(makeIdleStatus())
		mockListQueue.mockResolvedValue([])
		mockSyncHistory.mockResolvedValue({ synced: 0, orphans: 0, cleared: 0 })
	})

	afterEach(() => {
		stopNzbgetPoller()
		vi.useRealTimers()
	})

	describe('startNzbgetPoller', () => {
		it('starts polling and schedules first poll', async () => {
			startNzbgetPoller()

			// Advance past slow interval
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			expect(mockFetchStatus).toHaveBeenCalled()
			expect(mockListQueue).toHaveBeenCalled()
		})

		it('does nothing if already started', async () => {
			startNzbgetPoller()
			startNzbgetPoller() // Second call should be no-op

			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			// Only one poll cycle should have occurred
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})

		it('schedules at slow interval initially', async () => {
			startNzbgetPoller()

			// Should not poll before slow interval
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS - 1)
			expect(mockFetchStatus).not.toHaveBeenCalled()

			// Should poll after slow interval
			await vi.advanceTimersByTimeAsync(1)
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})
	})

	describe('stopNzbgetPoller', () => {
		it('stops scheduled polling', async () => {
			startNzbgetPoller()
			stopNzbgetPoller()

			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS * 2)

			expect(mockFetchStatus).not.toHaveBeenCalled()
		})

		it('allows restart after stop', async () => {
			startNzbgetPoller()
			stopNzbgetPoller()
			startNzbgetPoller()

			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})

		it('handles stop when not started', () => {
			// Should not throw
			expect(() => stopNzbgetPoller()).not.toThrow()
		})
	})

	describe('notifyDownloadActivity', () => {
		it('switches to fast polling mode', async () => {
			startNzbgetPoller()

			// Trigger activity notification
			notifyDownloadActivity()

			// Should poll at fast interval instead of slow
			await vi.advanceTimersByTimeAsync(FAST_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})

		it('does not crash if poller not started', () => {
			expect(() => notifyDownloadActivity()).not.toThrow()
		})
	})

	describe('polling behavior', () => {
		it('fetches status and queue in parallel', async () => {
			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			expect(mockFetchStatus).toHaveBeenCalled()
			expect(mockListQueue).toHaveBeenCalled()
		})

		it('syncs history when idle (no queue, no download rate, no post jobs)', async () => {
			mockFetchStatus.mockResolvedValue(makeIdleStatus())
			mockListQueue.mockResolvedValue([])

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			expect(mockSyncHistory).toHaveBeenCalled()
		})

		it('does not sync history when queue has items', async () => {
			mockListQueue.mockResolvedValue([makeQueueItem()])

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			expect(mockSyncHistory).not.toHaveBeenCalled()
		})

		it('does not sync history when download rate > 0', async () => {
			mockFetchStatus.mockResolvedValue(makeActiveStatus({ DownloadRate: 1000 }))
			mockListQueue.mockResolvedValue([])

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			expect(mockSyncHistory).not.toHaveBeenCalled()
		})

		it('does not sync history when post-processing', async () => {
			mockFetchStatus.mockResolvedValue(makeActiveStatus({ PostJobCount: 1, DownloadRate: 0 }))
			mockListQueue.mockResolvedValue([])

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			expect(mockSyncHistory).not.toHaveBeenCalled()
		})

		it('prevents concurrent polls', async () => {
			// Make fetchStatus slow to simulate overlapping polls
			let resolveStatus: () => void = () => {}
			mockFetchStatus.mockReturnValue(
				new Promise((resolve) => {
					resolveStatus = () => resolve(makeIdleStatus())
				}),
			)

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			// First poll started but not finished
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)

			// Try to advance time for another poll cycle
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			// Second poll should not start while first is running
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)

			// Complete first poll
			resolveStatus()
			await vi.advanceTimersByTimeAsync(0)

			// Now next poll should be scheduled
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(2)
		})
	})

	describe('interval scheduling', () => {
		it('uses fast interval when queue has items', async () => {
			mockListQueue.mockResolvedValue([makeQueueItem()])
			mockFetchStatus.mockResolvedValue(makeIdleStatus())

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			// Clear initial call count
			mockFetchStatus.mockClear()

			// Next poll should be at fast interval
			await vi.advanceTimersByTimeAsync(FAST_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})

		it('uses fast interval when download rate > 0', async () => {
			mockFetchStatus.mockResolvedValue(makeActiveStatus({ DownloadRate: 5_000_000 }))
			mockListQueue.mockResolvedValue([])

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			mockFetchStatus.mockClear()

			await vi.advanceTimersByTimeAsync(FAST_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})

		it('uses fast interval when post-processing', async () => {
			mockFetchStatus.mockResolvedValue(makeActiveStatus({ PostJobCount: 2, DownloadRate: 0 }))
			mockListQueue.mockResolvedValue([])

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			mockFetchStatus.mockClear()

			await vi.advanceTimersByTimeAsync(FAST_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})

		it('stays fast during cooldown period after activity', async () => {
			// First poll: active
			mockListQueue.mockResolvedValueOnce([makeQueueItem()])
			// Second poll: idle (but still in cooldown)
			mockListQueue.mockResolvedValue([])

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS) // First poll - active

			mockFetchStatus.mockClear()

			// Should still use fast interval during cooldown
			await vi.advanceTimersByTimeAsync(FAST_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})

		it('switches to slow interval after cooldown expires', async () => {
			// First poll: active
			mockListQueue.mockResolvedValueOnce([makeQueueItem()])
			// Subsequent polls: idle
			mockListQueue.mockResolvedValue([])

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS) // First poll - active

			// Wait through cooldown period with fast polls
			const pollsInCooldown = Math.ceil(COOLDOWN_MS / FAST_INTERVAL_MS) + 1
			for (let i = 0; i < pollsInCooldown; i++) {
				await vi.advanceTimersByTimeAsync(FAST_INTERVAL_MS)
			}

			mockFetchStatus.mockClear()

			// After cooldown, should use slow interval
			// If fast interval, this wouldn't trigger a poll
			await vi.advanceTimersByTimeAsync(FAST_INTERVAL_MS)
			expect(mockFetchStatus).not.toHaveBeenCalled()

			// But slow interval should work
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS - FAST_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})

		it('uses slow interval when idle', async () => {
			mockFetchStatus.mockResolvedValue(makeIdleStatus())
			mockListQueue.mockResolvedValue([])

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			mockFetchStatus.mockClear()

			// Should not poll at fast interval
			await vi.advanceTimersByTimeAsync(FAST_INTERVAL_MS)
			expect(mockFetchStatus).not.toHaveBeenCalled()

			// Should poll at slow interval
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS - FAST_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})
	})

	describe('error handling', () => {
		it('backs off to slow interval on error', async () => {
			mockFetchStatus.mockRejectedValueOnce(new Error('Connection refused'))
			mockFetchStatus.mockResolvedValue(makeIdleStatus())

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS) // First poll - error

			mockFetchStatus.mockClear()

			// Should use slow interval after error
			await vi.advanceTimersByTimeAsync(FAST_INTERVAL_MS)
			expect(mockFetchStatus).not.toHaveBeenCalled()

			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS - FAST_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(1)
		})

		it('continues polling after error', async () => {
			mockFetchStatus.mockRejectedValueOnce(new Error('Network error'))
			mockFetchStatus.mockResolvedValue(makeIdleStatus())

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS) // Error
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS) // Recovery

			expect(mockFetchStatus).toHaveBeenCalledTimes(2)
		})

		it('handles listQueue error', async () => {
			mockFetchStatus.mockResolvedValue(makeIdleStatus())
			mockListQueue.mockRejectedValueOnce(new Error('Queue error'))

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			// Should not throw, should continue
			expect(mockFetchStatus).toHaveBeenCalled()
		})

		it('handles syncHistory error gracefully', async () => {
			mockSyncHistory.mockRejectedValueOnce(new Error('DB error'))

			startNzbgetPoller()
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)

			// Should catch error and continue
			expect(mockSyncHistory).toHaveBeenCalled()

			// Should schedule next poll
			await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)
			expect(mockFetchStatus).toHaveBeenCalledTimes(2)
		})
	})

	describe('continuous polling', () => {
		it('polls continuously while active', async () => {
			mockListQueue.mockResolvedValue([makeQueueItem()])

			startNzbgetPoller()

			// Run 5 fast poll cycles
			for (let i = 0; i < 5; i++) {
				await vi.advanceTimersByTimeAsync(i === 0 ? SLOW_INTERVAL_MS : FAST_INTERVAL_MS)
			}

			expect(mockFetchStatus).toHaveBeenCalledTimes(5)
		})

		it('polls continuously while idle', async () => {
			startNzbgetPoller()

			// Run 3 slow poll cycles
			for (let i = 0; i < 3; i++) {
				await vi.advanceTimersByTimeAsync(SLOW_INTERVAL_MS)
			}

			expect(mockFetchStatus).toHaveBeenCalledTimes(3)
		})
	})
})
