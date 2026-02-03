import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as realSchema from '@/db/schema'
import { setupTestDb, type TestDb } from '../../test/helpers/db'

// --- Mock Setup ---

// Module-level testDb that mocks reference
let testDb: TestDb

// Hoisted mocks for use in vi.mock factories
const { mockRpcResponses, mockProcessDownloadImport } = vi.hoisted(() => ({
	// Map of RPC method -> response
	mockRpcResponses: new Map<string, unknown>(),
	mockProcessDownloadImport: vi.fn(),
}))

// Mock @/db to use test database with real schema
vi.mock('@/db', async () => {
	const schema = await vi.importActual<typeof realSchema>('@/db/schema')
	return {
		get db() {
			return testDb
		},
		schema,
	}
})

// Mock env to prevent side effects
vi.mock('@/env', () => ({
	env: {
		PORT: 2828,
		DATA_DIRECTORY: '/tmp/test',
		SETTINGS_PATH: '/tmp/test/settings.json',
		DATABASE_PATH: ':memory:',
		LOG_DIRECTORY: '/tmp/test/logs',
		BUN_ENV: 'ci',
	},
}))

// Mock settings
vi.mock('@/services/settings.server', () => ({
	getSettings: () => ({
		nzbgetSettings: { username: 'nzbget', password: 'test', host: '127.0.0.1', port: 6789 },
		usenetServers: [],
	}),
	ensureNzbgetPassword: () => 'test',
	ensureDownloadFolder: () => '/downloads',
}))

// Mock fileImport
vi.mock('@/services/fileImport.server', () => ({
	processDownloadImport: (...args: unknown[]) => mockProcessDownloadImport(...args),
}))

// Mock ofetch to return controllable responses based on RPC method
vi.mock('ofetch', () => ({
	ofetch: {
		create: () => (_url: string, opts: { body: { method: string; params?: unknown[] } }) => {
			const method = opts?.body?.method || 'unknown'
			const response = mockRpcResponses.get(method)
			return Promise.resolve({ result: response ?? null })
		},
	},
}))

// Mock fast-forward to return passthrough
vi.mock('@with-logic/fast-forward', () => ({
	CacheMode: { ON: 'ON', READ_ONLY: 'READ_ONLY', OFF: 'OFF' },
	FileSystemCache: class {},
	fastForward: (obj: unknown) => obj,
}))

// Mock Bun.spawn to prevent actual process spawning
vi.mock('bun', async (importOriginal) => {
	const original = await importOriginal<typeof import('bun')>()
	return {
		...original,
		spawn: vi.fn().mockReturnValue({
			pid: 12345,
			exited: Promise.resolve(0),
			stdout: null,
			stderr: null,
			killed: false,
			kill: vi.fn(),
		}),
		sleep: vi.fn().mockResolvedValue(undefined),
	}
})

// --- Test Setup ---

beforeEach(async () => {
	testDb = await setupTestDb()
	vi.clearAllMocks()
	mockRpcResponses.clear()

	// Default RPC responses
	mockRpcResponses.set('history', [])
	mockRpcResponses.set('listgroups', [])
	mockRpcResponses.set('version', '25.0')
	mockRpcResponses.set('status', { DownloadRate: 0 })
	mockRpcResponses.set('editqueue', true)
	mockRpcResponses.set('config', [])
	mockRpcResponses.set('saveconfig', true)
	mockRpcResponses.set('reload', true)
	mockRpcResponses.set('append', 1)
	mockRpcResponses.set('resumedownload', true)
})

afterEach(() => {
	vi.clearAllMocks()
})

// --- Helper: create release and download in DB ---

function createTestRelease(movieId: number, overrides?: Partial<typeof realSchema.releases.$inferInsert>) {
	const [release] = testDb
		.insert(realSchema.releases)
		.values({
			movieId,
			guid: `guid-${Date.now()}-${Math.random()}`,
			title: 'Test.Movie.2024.1080p.BluRay',
			downloadUrl: 'http://example.com/nzb',
			size: 15000000000,
			publishDate: '2024-01-01',
			indexerId: 'nzbgeek',
			indexerName: 'NZBgeek',
			grabbedAt: new Date().toISOString(),
			...overrides,
		})
		.returning()
		.all()
	return release
}

function createTestDownload(releaseId: number, overrides?: Partial<typeof realSchema.downloads.$inferInsert>) {
	const [download] = testDb
		.insert(realSchema.downloads)
		.values({
			releaseId,
			nzbId: 12345,
			title: 'Test.Movie.2024.1080p.BluRay',
			status: 'downloading',
			queuedAt: new Date().toISOString(),
			...overrides,
		})
		.returning()
		.all()
	return download
}

function createTestMovie(overrides?: Partial<typeof realSchema.movies.$inferInsert>) {
	const [movie] = testDb
		.insert(realSchema.movies)
		.values({
			tmdbId: 550 + Math.floor(Math.random() * 100000),
			title: 'Fight Club',
			year: 1999,
			dateAdded: new Date().toISOString(),
			monitored: true,
			resolution: '1080p',
			...overrides,
		})
		.returning()
		.all()
	return movie
}

// --- Sample NZBget history item ---

function sampleHistoryItem(overrides?: Partial<import('@/services/nzbget').NzbgetHistoryItem>): import('@/services/nzbget').NzbgetHistoryItem {
	return {
		ID: 12345,
		NZBID: 12345,
		Kind: 'NZB',
		Name: 'Test.Movie.2024.1080p.BluRay',
		NZBFilename: 'test.nzb',
		URL: '',
		DestDir: '/downloads/Test.Movie.2024.1080p.BluRay',
		FinalDir: '/downloads/Test.Movie.2024.1080p.BluRay',
		Category: 'movies',
		FileSizeMB: 14000,
		FileSizeLo: 0,
		FileSizeHi: 0,
		FileCount: 50,
		RemainingFileCount: 0,
		MinPostTime: 0,
		MaxPostTime: 0,
		TotalArticles: 1000,
		SuccessArticles: 1000,
		FailedArticles: 0,
		Health: 1000,
		CriticalHealth: 900,
		HistoryTime: Math.floor(Date.now() / 1000),
		Status: 'SUCCESS/ALL',
		DownloadedSizeMB: 14000,
		DownloadedSizeLo: 0,
		DownloadedSizeHi: 0,
		DownloadTimeSec: 3600,
		PostTotalTimeSec: 600,
		ParTimeSec: 300,
		RepairTimeSec: 0,
		UnpackTimeSec: 300,
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
		...overrides,
	}
}

// --- Type definitions ---

type NzbgetModule = typeof import('./nzbget.server')

// --- syncNzbgetHistory Tests ---

describe('syncNzbgetHistory', () => {
	let nzbgetModule: NzbgetModule

	beforeEach(async () => {
		// Reset modules to get fresh import with mocks
		vi.resetModules()
		// Re-import module fresh for each test
		nzbgetModule = await import('./nzbget.server')
	})

	it('handles empty history', async () => {
		mockRpcResponses.set('history', [])

		const result = await nzbgetModule.syncNzbgetHistory()

		expect(result).toEqual({ synced: 0, orphans: 0, cleared: 0 })
	})

	it('syncs successful download and updates DB', async () => {
		const movie = createTestMovie()
		const release = createTestRelease(movie.id)
		const download = createTestDownload(release.id, { nzbId: 99999 })

		const historyItem = sampleHistoryItem({
			NZBID: 99999,
			Name: download.title,
			Status: 'SUCCESS/ALL',
			ParStatus: 'SUCCESS',
			UnpackStatus: 'SUCCESS',
			FinalDir: '/downloads/completed/Test.Movie',
		})
		mockRpcResponses.set('history', [historyItem])

		const result = await nzbgetModule.syncNzbgetHistory()

		expect(result.synced).toBe(1)
		expect(result.orphans).toBe(0)

		// Verify DB was updated
		const updatedDownload = testDb.select().from(realSchema.downloads).all()[0]
		expect(updatedDownload.status).toBe('completed')
		expect(updatedDownload.parStatus).toBe('SUCCESS')
		expect(updatedDownload.unpackStatus).toBe('SUCCESS')
		expect(updatedDownload.finalDir).toBe('/downloads/completed/Test.Movie')
		expect(updatedDownload.nzbId).toBeNull() // Cleared after sync
	})

	it('syncs failed download and updates DB', async () => {
		const movie = createTestMovie()
		const release = createTestRelease(movie.id)
		const download = createTestDownload(release.id, { nzbId: 88888 })

		const historyItem = sampleHistoryItem({
			NZBID: 88888,
			Name: download.title,
			Status: 'FAILURE/PAR',
			ParStatus: 'FAILURE',
			UnpackStatus: 'NONE',
		})
		mockRpcResponses.set('history', [historyItem])

		const result = await nzbgetModule.syncNzbgetHistory()

		expect(result.synced).toBe(1)

		const updatedDownload = testDb.select().from(realSchema.downloads).all()[0]
		expect(updatedDownload.status).toBe('failed')
		expect(updatedDownload.parStatus).toBe('FAILURE')
	})

	it('counts orphan history items not in DB', async () => {
		// No downloads in DB, but NZBget has history
		const historyItem = sampleHistoryItem({ NZBID: 77777 })
		mockRpcResponses.set('history', [historyItem])

		const result = await nzbgetModule.syncNzbgetHistory()

		expect(result.synced).toBe(0)
		expect(result.orphans).toBe(1)
		expect(result.cleared).toBe(1) // Still clears orphan from NZBget
	})

	it('skips already completed downloads', async () => {
		const movie = createTestMovie()
		const release = createTestRelease(movie.id)
		createTestDownload(release.id, { nzbId: 66666, status: 'completed' })

		const historyItem = sampleHistoryItem({ NZBID: 66666 })
		mockRpcResponses.set('history', [historyItem])

		const result = await nzbgetModule.syncNzbgetHistory()

		// Should be orphan since download already completed (not matched by query)
		expect(result.orphans).toBe(1)
		expect(result.synced).toBe(0)
	})

	it('triggers import for successful download with FinalDir', async () => {
		const movie = createTestMovie()
		const release = createTestRelease(movie.id)
		const download = createTestDownload(release.id, { nzbId: 55555 })

		const historyItem = sampleHistoryItem({
			NZBID: 55555,
			Status: 'SUCCESS/ALL',
			FinalDir: '/downloads/completed/Movie',
			UnpackStatus: 'SUCCESS',
		})
		mockRpcResponses.set('history', [historyItem])
		mockProcessDownloadImport.mockResolvedValue(undefined)

		await nzbgetModule.syncNzbgetHistory()

		expect(mockProcessDownloadImport).toHaveBeenCalledWith(download.id)
	})

	it('does not trigger import for failed download', async () => {
		const movie = createTestMovie()
		const release = createTestRelease(movie.id)
		createTestDownload(release.id, { nzbId: 54321 })

		const historyItem = sampleHistoryItem({
			NZBID: 54321,
			Status: 'FAILURE/PAR',
			FinalDir: '/downloads/completed/Movie',
			UnpackStatus: 'NONE',
			ParStatus: 'FAILURE',
		})
		mockRpcResponses.set('history', [historyItem])

		await nzbgetModule.syncNzbgetHistory()

		expect(mockProcessDownloadImport).not.toHaveBeenCalled()
	})

	it('uses DestDir when FinalDir empty (no unpack needed)', async () => {
		const movie = createTestMovie()
		const release = createTestRelease(movie.id)
		createTestDownload(release.id, { nzbId: 44444 })

		const historyItem = sampleHistoryItem({
			NZBID: 44444,
			Status: 'SUCCESS/ALL',
			FinalDir: '', // Empty - no unpack
			DestDir: '/downloads/intermediate/Movie',
			UnpackStatus: 'NONE',
		})
		mockRpcResponses.set('history', [historyItem])

		await nzbgetModule.syncNzbgetHistory()

		const updatedDownload = testDb.select().from(realSchema.downloads).all()[0]
		expect(updatedDownload.finalDir).toBe('/downloads/intermediate/Movie')
	})

	it('handles multiple history items', async () => {
		const movie1 = createTestMovie({ tmdbId: 1 })
		const movie2 = createTestMovie({ tmdbId: 2 })
		const release1 = createTestRelease(movie1.id)
		const release2 = createTestRelease(movie2.id)
		createTestDownload(release1.id, { nzbId: 11111, title: 'Movie.One' })
		createTestDownload(release2.id, { nzbId: 22222, title: 'Movie.Two' })

		mockRpcResponses.set('history', [
			sampleHistoryItem({ NZBID: 11111, Name: 'Movie.One', Status: 'SUCCESS/ALL' }),
			sampleHistoryItem({ NZBID: 22222, Name: 'Movie.Two', Status: 'FAILURE/UNPACK', UnpackStatus: 'FAILURE' }),
			sampleHistoryItem({ NZBID: 33333, Name: 'Orphan.Movie' }), // No matching download
		])

		const result = await nzbgetModule.syncNzbgetHistory()

		expect(result.synced).toBe(2)
		expect(result.orphans).toBe(1)
		expect(result.cleared).toBe(3)

		const downloads = testDb.select().from(realSchema.downloads).all()
		const completed = downloads.find((d) => d.title === 'Movie.One')
		const failed = downloads.find((d) => d.title === 'Movie.Two')

		expect(completed?.status).toBe('completed')
		expect(failed?.status).toBe('failed')
	})

	it('does not import when unpack failed', async () => {
		const movie = createTestMovie()
		const release = createTestRelease(movie.id)
		createTestDownload(release.id, { nzbId: 43210 })

		const historyItem = sampleHistoryItem({
			NZBID: 43210,
			Status: 'SUCCESS/UNPACK', // Status starts with SUCCESS but unpack failed
			FinalDir: '/downloads/completed/Movie',
			UnpackStatus: 'FAILURE',
			ParStatus: 'SUCCESS',
		})
		mockRpcResponses.set('history', [historyItem])

		await nzbgetModule.syncNzbgetHistory()

		// Unpack failed, so should not import
		expect(mockProcessDownloadImport).not.toHaveBeenCalled()
	})
})

// --- Queue/History listing tests ---

describe('queue and history operations', () => {
	let nzbgetModule: NzbgetModule

	beforeEach(async () => {
		vi.resetModules()
		nzbgetModule = await import('./nzbget.server')
	})

	it('listNzbgetQueue returns queue items', async () => {
		const queueItem = {
			NZBID: 1,
			NZBName: 'Test Download',
			Status: 'DOWNLOADING',
			FileSizeMB: 1000,
			RemainingSizeMB: 500,
		}
		mockRpcResponses.set('listgroups', [queueItem])

		const queue = await nzbgetModule.listNzbgetQueue()

		expect(queue).toHaveLength(1)
		expect(queue[0].NZBName).toBe('Test Download')
	})

	it('listNzbgetHistory returns history items', async () => {
		const historyItem = sampleHistoryItem()
		mockRpcResponses.set('history', [historyItem])

		const history = await nzbgetModule.listNzbgetHistory()

		expect(history).toHaveLength(1)
		expect(history[0].Status).toBe('SUCCESS/ALL')
	})

	it('fetchNzbgetVersion returns version string', async () => {
		mockRpcResponses.set('version', '25.0')

		const version = await nzbgetModule.fetchNzbgetVersion()

		expect(version).toBe('25.0')
	})

	it('fetchNzbgetStatus returns status object', async () => {
		const status = { DownloadRate: 5000000, RemainingSizeMB: 1000 }
		mockRpcResponses.set('status', status)

		const result = await nzbgetModule.fetchNzbgetStatus()

		expect(result.DownloadRate).toBe(5000000)
	})
})

// --- appendNzb tests ---

describe('appendNzb', () => {
	let nzbgetModule: NzbgetModule

	beforeEach(async () => {
		vi.resetModules()
		nzbgetModule = await import('./nzbget.server')
	})

	it('returns NZBID on success', async () => {
		mockRpcResponses.set('append', 12345)

		const result = await nzbgetModule.appendNzb({
			filename: 'test.nzb',
			nzbContent: '<nzb>...</nzb>',
			category: 'movies',
		})

		expect(result).toBe(12345)
	})
})

// --- pushUsenetServersToNzbget tests ---

describe('pushUsenetServersToNzbget', () => {
	let nzbgetModule: NzbgetModule

	beforeEach(async () => {
		vi.resetModules()
		nzbgetModule = await import('./nzbget.server')
	})

	it('saves server config and returns true', async () => {
		mockRpcResponses.set('config', [])
		mockRpcResponses.set('saveconfig', true)

		const result = await nzbgetModule.pushUsenetServersToNzbget([
			{
				id: 'server-1',
				name: 'Test Server',
				host: 'news.example.com',
				port: 563,
				username: 'user',
				password: 'pass',
				ssl: true,
				priority: 0,
				connections: 20,
				enabled: true,
			},
		])

		expect(result).toBe(true)
	})

	it('clears extra servers when reducing count', async () => {
		// Simulate 2 existing servers
		mockRpcResponses.set('config', [
			{ Name: 'Server1.Host', Value: 'server1.com' },
			{ Name: 'Server2.Host', Value: 'server2.com' },
		])
		mockRpcResponses.set('saveconfig', true)

		// Push only 1 server (should clear Server2)
		const result = await nzbgetModule.pushUsenetServersToNzbget([
			{
				id: 'server-1',
				name: 'Server 1',
				host: 'server1.com',
				port: 563,
				username: 'user',
				password: 'pass',
				ssl: true,
				priority: 0,
				connections: 10,
				enabled: true,
			},
		])

		expect(result).toBe(true)
	})
})

// --- clearNzbgetQueue tests ---

describe('clearNzbgetQueue', () => {
	let nzbgetModule: NzbgetModule

	beforeEach(async () => {
		vi.resetModules()
		nzbgetModule = await import('./nzbget.server')
	})

	it('returns true when queue is empty', async () => {
		mockRpcResponses.set('listgroups', [])

		const result = await nzbgetModule.clearNzbgetQueue()

		expect(result).toBe(true)
	})

	it('deletes all queue items', async () => {
		mockRpcResponses.set('listgroups', [{ NZBID: 1 }, { NZBID: 2 }])
		mockRpcResponses.set('editqueue', true)

		const result = await nzbgetModule.clearNzbgetQueue()

		expect(result).toBe(true)
	})
})
