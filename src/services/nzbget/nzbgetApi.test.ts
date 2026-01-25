import { and, eq, notInArray } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import * as schema from '@/db/schema'
import type { NzbgetHistoryItem } from '@/services/nzbget/nzbgetSchema'
import { setupTestDb, type TestDb } from '../../../test/helpers'

// Map NZBGet status to download status
function mapNzbgetStatus(item: NzbgetHistoryItem): 'completed' | 'failed' {
	if (item.Status.startsWith('SUCCESS')) return 'completed'
	return 'failed'
}

// Import result type
interface ImportResult {
	success: boolean
	filesImported: number
	error?: string
}

// Dependencies for testable sync function
interface SyncDeps {
	database: BunSQLiteDatabase<typeof schema>
	listHistory: () => Promise<NzbgetHistoryItem[]>
	clearHistory: (nzbIds: number[]) => Promise<boolean>
	fileImport: (downloadId: number) => Promise<ImportResult>
}

// Core sync logic - testable version with dependency injection
async function syncNzbgetHistoryCore(deps: SyncDeps): Promise<{ synced: number; orphans: number; cleared: number }> {
	const { database, listHistory, clearHistory, fileImport } = deps
	const history = await listHistory()

	if (history.length === 0) {
		return { synced: 0, orphans: 0, cleared: 0 }
	}

	let synced = 0
	let orphans = 0
	const syncedNzbIds: number[] = []

	for (const item of history) {
		// Find download by nzbId (only match active downloads, not already completed/failed)
		const download = await database.query.downloads.findFirst({
			where: and(eq(schema.downloads.nzbId, item.NZBID), notInArray(schema.downloads.status, ['completed', 'failed'])),
		})

		if (!download) {
			orphans++
			// Still track for clearing - we don't want orphans cluttering history
			syncedNzbIds.push(item.NZBID)
			continue
		}

		// Update download with final state
		const nzbgetStatus = mapNzbgetStatus(item)
		const completedAt = new Date(item.HistoryTime * 1000).toISOString()

		await database
			.update(schema.downloads)
			.set({
				status: nzbgetStatus,
				parStatus: item.ParStatus,
				unpackStatus: item.UnpackStatus,
				finalDir: item.FinalDir || null,
				downloadedSizeMb: item.DownloadedSizeMB,
				downloadTimeSec: item.DownloadTimeSec,
				completedAt,
				progress: 100,
				nzbId: null, // Clear to prevent stale matches (NZBGet reuses IDs)
			})
			.where(eq(schema.downloads.id, download.id))

		syncedNzbIds.push(item.NZBID)
		synced++

		// Auto-import if completed with finalDir
		// UnpackStatus: SUCCESS = unpacked, NONE = no archives to unpack
		const canImport = nzbgetStatus === 'completed' && item.FinalDir && (item.UnpackStatus === 'SUCCESS' || item.UnpackStatus === 'NONE')
		if (canImport) {
			await database.update(schema.downloads).set({ status: 'importing' }).where(eq(schema.downloads.id, download.id))

			const importResult = await fileImport(download.id)
			if (importResult.success) {
				await database.update(schema.downloads).set({ status: 'imported' }).where(eq(schema.downloads.id, download.id))
			} else {
				await database.update(schema.downloads).set({ status: 'failed', errorMessage: importResult.error }).where(eq(schema.downloads.id, download.id))
			}
		}
	}

	// Clear synced history items from NZBGet
	if (syncedNzbIds.length > 0) {
		await clearHistory(syncedNzbIds)
	}

	return { synced, orphans, cleared: syncedNzbIds.length }
}

// Helper to create minimal NzbgetHistoryItem
function makeHistoryItem(overrides: Partial<NzbgetHistoryItem> & { NZBID: number }): NzbgetHistoryItem {
	const { NZBID, ...rest } = overrides
	return {
		ID: NZBID,
		NZBID,
		Kind: 'NZB',
		Name: 'Test.Download',
		NZBFilename: 'test.nzb',
		URL: '',
		DestDir: '/downloads/inter',
		FinalDir: '/downloads/completed/Test.Download',
		Category: '',
		FileSizeMB: 1000,
		FileSizeLo: 1000 * 1024 * 1024,
		FileSizeHi: 0,
		FileCount: 10,
		RemainingFileCount: 0,
		MinPostTime: Date.now() / 1000 - 3600,
		MaxPostTime: Date.now() / 1000,
		TotalArticles: 100,
		SuccessArticles: 100,
		FailedArticles: 0,
		Health: 1000,
		CriticalHealth: 900,
		HistoryTime: Math.floor(Date.now() / 1000),
		Status: 'SUCCESS',
		DownloadedSizeMB: 1000,
		DownloadedSizeLo: 1000 * 1024 * 1024,
		DownloadedSizeHi: 0,
		DownloadTimeSec: 600,
		PostTotalTimeSec: 60,
		ParTimeSec: 30,
		RepairTimeSec: 0,
		UnpackTimeSec: 30,
		DeleteStatus: 'NONE',
		MarkStatus: 'NONE',
		UrlStatus: 'NONE',
		ParStatus: 'SUCCESS',
		UnpackStatus: 'SUCCESS',
		MoveStatus: 'SUCCESS',
		DupeKey: '',
		DupeScore: 0,
		DupeMode: 'SCORE',
		RetryData: false,
		Parameters: [],
		ScriptStatuses: [],
		ServerStats: [],
		...rest,
	}
}

describe('syncNzbgetHistoryCore', () => {
	let db: TestDb
	let historyItems: NzbgetHistoryItem[]
	let clearedIds: number[]
	let importCalls: number[]
	let importResults: Map<number, ImportResult>

	// Mock dependencies
	function createDeps(): SyncDeps {
		return {
			database: db,
			listHistory: async () => historyItems,
			clearHistory: async (ids) => {
				clearedIds.push(...ids)
				return true
			},
			fileImport: async (downloadId) => {
				importCalls.push(downloadId)
				return importResults.get(downloadId) ?? { success: true, filesImported: 1 }
			},
		}
	}

	beforeEach(async () => {
		db = await setupTestDb()
		historyItems = []
		clearedIds = []
		importCalls = []
		importResults = new Map()
	})

	// Helper to insert test data
	function insertMovie() {
		return db
			.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: new Date().toISOString(),
			})
			.returning()
			.get()
	}

	function insertRelease(movieId: number) {
		return db
			.insert(schema.releases)
			.values({
				id: 1,
				movieId,
				guid: 'test-guid',
				title: 'Inception.2010.1080p.BluRay',
				downloadUrl: 'https://indexer.example/nzb/123',
				size: 8_500_000_000,
				publishDate: '2023-06-15',
				indexerId: 'idx-1',
				indexerName: 'TestIndexer',
				grabbedAt: new Date().toISOString(),
			})
			.returning()
			.get()
	}

	function insertDownload(releaseId: number, nzbId: number, status: schema.DownloadStatus = 'queued') {
		return db
			.insert(schema.downloads)
			.values({
				id: releaseId, // Use same id as release for simplicity
				releaseId,
				nzbId,
				title: 'Inception.2010.1080p.BluRay',
				status,
				size: 8_500_000_000,
				queuedAt: new Date().toISOString(),
			})
			.returning()
			.get()
	}

	describe('basic sync operations', () => {
		it('returns zero counts when history is empty', async () => {
			historyItems = []

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result).toEqual({ synced: 0, orphans: 0, cleared: 0 })
			expect(clearedIds).toHaveLength(0)
		})

		it('syncs single history item to matching download', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [makeHistoryItem({ NZBID: 100, Name: 'Inception.2010.1080p.BluRay' })]

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(1)
			expect(result.orphans).toBe(0)
			expect(result.cleared).toBe(1)
			expect(clearedIds).toContain(100)
		})

		it('updates download with NZBGet final state', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			const historyTime = Math.floor(Date.now() / 1000)
			historyItems = [
				makeHistoryItem({
					NZBID: 100,
					Status: 'SUCCESS/ALL',
					ParStatus: 'SUCCESS',
					UnpackStatus: 'SUCCESS',
					FinalDir: '/downloads/completed/Inception',
					DownloadedSizeMB: 8500,
					DownloadTimeSec: 300,
					HistoryTime: historyTime,
				}),
			]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('imported') // Import triggered
			expect(download?.parStatus).toBe('SUCCESS')
			expect(download?.unpackStatus).toBe('SUCCESS')
			expect(download?.finalDir).toBe('/downloads/completed/Inception')
			expect(download?.downloadedSizeMb).toBe(8500)
			expect(download?.downloadTimeSec).toBe(300)
			expect(download?.progress).toBe(100)
			expect(download?.completedAt).toBeDefined()
		})

		it('clears nzbId after sync to prevent stale matches', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [makeHistoryItem({ NZBID: 100, FinalDir: '' })] // No import triggered

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.nzbId).toBeNull()
		})

		it('syncs multiple history items', async () => {
			// Insert two movies with releases and downloads
			db.insert(schema.movies)
				.values([
					{ id: 1, tmdbId: 27205, title: 'Inception', year: 2010, dateAdded: new Date().toISOString() },
					{ id: 2, tmdbId: 550, title: 'Fight Club', year: 1999, dateAdded: new Date().toISOString() },
				])
				.run()

			db.insert(schema.releases)
				.values([
					{
						id: 1,
						movieId: 1,
						guid: 'g1',
						title: 'Inception.1080p',
						downloadUrl: 'http://x',
						size: 1,
						publishDate: '2023-01-01',
						indexerId: 'i',
						indexerName: 'I',
						grabbedAt: new Date().toISOString(),
					},
					{
						id: 2,
						movieId: 2,
						guid: 'g2',
						title: 'FightClub.1080p',
						downloadUrl: 'http://x',
						size: 1,
						publishDate: '2023-01-01',
						indexerId: 'i',
						indexerName: 'I',
						grabbedAt: new Date().toISOString(),
					},
				])
				.run()

			db.insert(schema.downloads)
				.values([
					{ id: 1, releaseId: 1, nzbId: 100, title: 'Inception.1080p', status: 'downloading', size: 1, queuedAt: new Date().toISOString() },
					{ id: 2, releaseId: 2, nzbId: 101, title: 'FightClub.1080p', status: 'downloading', size: 1, queuedAt: new Date().toISOString() },
				])
				.run()

			historyItems = [makeHistoryItem({ NZBID: 100, Name: 'Inception.1080p' }), makeHistoryItem({ NZBID: 101, Name: 'FightClub.1080p' })]

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(2)
			expect(result.orphans).toBe(0)
			expect(result.cleared).toBe(2)

			const downloads = db.select().from(schema.downloads).all()
			expect(downloads.every((d) => d.nzbId === null)).toBe(true)
		})
	})

	describe('status transitions', () => {
		it('transitions download from queued to completed on SUCCESS', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'queued')

			historyItems = [makeHistoryItem({ NZBID: 100, Status: 'SUCCESS', FinalDir: '' })] // No import

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('completed')
		})

		it('transitions download from downloading to completed on SUCCESS/GOOD', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'downloading')

			historyItems = [makeHistoryItem({ NZBID: 100, Status: 'SUCCESS/GOOD', FinalDir: '' })]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('completed')
		})

		it('transitions download from queued to failed on FAILURE', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'queued')

			historyItems = [makeHistoryItem({ NZBID: 100, Status: 'FAILURE' })]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('failed')
		})

		it('transitions download to failed on DELETED status', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'downloading')

			historyItems = [makeHistoryItem({ NZBID: 100, Status: 'DELETED' })]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('failed')
		})

		it('does not match downloads already in completed status', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'completed') // Already completed

			historyItems = [makeHistoryItem({ NZBID: 100 })]

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(0)
			expect(result.orphans).toBe(1) // Treated as orphan
		})

		it('does not match downloads already in failed status', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'failed') // Already failed

			historyItems = [makeHistoryItem({ NZBID: 100 })]

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(0)
			expect(result.orphans).toBe(1)
		})

		it('matches downloads in importing status', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'importing')

			historyItems = [makeHistoryItem({ NZBID: 100, FinalDir: '' })]

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(1)
		})
	})

	describe('orphan handling', () => {
		it('counts history items with no matching DB download as orphans', async () => {
			historyItems = [makeHistoryItem({ NZBID: 999 })]

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(0)
			expect(result.orphans).toBe(1)
			expect(result.cleared).toBe(1) // Still cleared
			expect(clearedIds).toContain(999)
		})

		it('clears orphans from NZBGet history', async () => {
			historyItems = [makeHistoryItem({ NZBID: 888 }), makeHistoryItem({ NZBID: 999 })]

			await syncNzbgetHistoryCore(createDeps())

			expect(clearedIds).toContain(888)
			expect(clearedIds).toContain(999)
		})

		it('handles mix of matched and orphan items', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [makeHistoryItem({ NZBID: 100 }), makeHistoryItem({ NZBID: 999 })] // 100 matches, 999 is orphan

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(1)
			expect(result.orphans).toBe(1)
			expect(result.cleared).toBe(2)
		})
	})

	describe('file import triggering', () => {
		it('triggers import when status is SUCCESS and FinalDir exists', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [
				makeHistoryItem({
					NZBID: 100,
					Status: 'SUCCESS',
					FinalDir: '/downloads/completed/Inception',
					UnpackStatus: 'SUCCESS',
				}),
			]

			await syncNzbgetHistoryCore(createDeps())

			expect(importCalls).toContain(1)

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('imported')
		})

		it('triggers import when UnpackStatus is NONE (no archives)', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [
				makeHistoryItem({
					NZBID: 100,
					Status: 'SUCCESS',
					FinalDir: '/downloads/completed/Inception',
					UnpackStatus: 'NONE', // No archives to unpack
				}),
			]

			await syncNzbgetHistoryCore(createDeps())

			expect(importCalls).toContain(1)
		})

		it('does not trigger import when FinalDir is empty', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [
				makeHistoryItem({
					NZBID: 100,
					Status: 'SUCCESS',
					FinalDir: '', // Empty
					UnpackStatus: 'SUCCESS',
				}),
			]

			await syncNzbgetHistoryCore(createDeps())

			expect(importCalls).toHaveLength(0)

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('completed') // Stays at completed
		})

		it('does not trigger import when status is FAILURE', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [
				makeHistoryItem({
					NZBID: 100,
					Status: 'FAILURE',
					FinalDir: '/downloads/completed/Inception',
					UnpackStatus: 'SUCCESS',
				}),
			]

			await syncNzbgetHistoryCore(createDeps())

			expect(importCalls).toHaveLength(0)

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('failed')
		})

		it('does not trigger import when UnpackStatus is FAILURE', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [
				makeHistoryItem({
					NZBID: 100,
					Status: 'SUCCESS',
					FinalDir: '/downloads/completed/Inception',
					UnpackStatus: 'FAILURE', // Unpack failed
				}),
			]

			await syncNzbgetHistoryCore(createDeps())

			expect(importCalls).toHaveLength(0)

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('completed') // Stays at completed, no import attempt
		})

		it('sets status to failed with error message when import fails', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			importResults.set(1, { success: false, filesImported: 0, error: 'No video files found' })

			historyItems = [
				makeHistoryItem({
					NZBID: 100,
					Status: 'SUCCESS',
					FinalDir: '/downloads/completed/Inception',
					UnpackStatus: 'SUCCESS',
				}),
			]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('failed')
			expect(download?.errorMessage).toBe('No video files found')
		})

		it('transitions through importing status before imported', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			let statusDuringImport: string | undefined
			const deps = createDeps()
			deps.fileImport = async (downloadId) => {
				// Capture status during import
				const dl = db.select().from(schema.downloads).where(eq(schema.downloads.id, downloadId)).get()
				statusDuringImport = dl?.status
				return { success: true, filesImported: 1 }
			}

			historyItems = [
				makeHistoryItem({
					NZBID: 100,
					Status: 'SUCCESS',
					FinalDir: '/downloads/completed/Inception',
					UnpackStatus: 'SUCCESS',
				}),
			]

			await syncNzbgetHistoryCore(deps)

			expect(statusDuringImport).toBe('importing')

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('imported')
		})
	})

	describe('completedAt timestamp', () => {
		it('sets completedAt from NZBGet HistoryTime', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			const historyTime = 1700000000 // Fixed timestamp
			historyItems = [makeHistoryItem({ NZBID: 100, HistoryTime: historyTime, FinalDir: '' })]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			const expectedDate = new Date(historyTime * 1000).toISOString()
			expect(download?.completedAt).toBe(expectedDate)
		})
	})

	describe('parStatus values', () => {
		it('records parStatus SUCCESS', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [makeHistoryItem({ NZBID: 100, ParStatus: 'SUCCESS', FinalDir: '' })]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.parStatus).toBe('SUCCESS')
		})

		it('records parStatus NONE', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [makeHistoryItem({ NZBID: 100, ParStatus: 'NONE', FinalDir: '' })]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.parStatus).toBe('NONE')
		})

		it('records parStatus FAILURE', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			historyItems = [makeHistoryItem({ NZBID: 100, ParStatus: 'FAILURE', Status: 'FAILURE', FinalDir: '' })]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.parStatus).toBe('FAILURE')
		})
	})

	describe('edge cases', () => {
		it('handles null FinalDir in history item', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100)

			const item = makeHistoryItem({ NZBID: 100 })
			// @ts-expect-error - testing null handling
			item.FinalDir = null
			historyItems = [item]

			await syncNzbgetHistoryCore(createDeps())

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.finalDir).toBeNull()
			expect(importCalls).toHaveLength(0) // No import without finalDir
		})

		it('handles download with paused status', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'paused')

			historyItems = [makeHistoryItem({ NZBID: 100, FinalDir: '' })]

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(1)

			const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, 1)).get()
			expect(download?.status).toBe('completed')
		})

		it('handles download with verifying status', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'verifying')

			historyItems = [makeHistoryItem({ NZBID: 100, FinalDir: '' })]

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(1)
		})

		it('handles download with unpacking status', async () => {
			const movie = insertMovie()
			const release = insertRelease(movie.id)
			insertDownload(release.id, 100, 'unpacking')

			historyItems = [makeHistoryItem({ NZBID: 100, FinalDir: '' })]

			const result = await syncNzbgetHistoryCore(createDeps())

			expect(result.synced).toBe(1)
		})
	})
})
