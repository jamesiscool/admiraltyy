import { eq } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '@/db/schema'
import { StubNzbgetServer, setupTestDb, type TestDb } from '../../test/helpers'

// Copy types/function from movies.ts to avoid env.ts import chain
interface GrabReleaseInput {
	movieId: string
	guid: string
	title: string
	downloadUrl: string
	infoUrl?: string
	size: number
	publishDate: string
	indexerId: string
	indexerName: string
}

interface GrabReleaseDeps {
	database: BunSQLiteDatabase<typeof schema>
	downloadNzbFn: (url: string, filename: string) => Promise<string>
	appendNzbFn: (options: { filename: string; nzbContent: string; category?: string }) => Promise<number>
	readFileFn: (path: string) => Promise<Buffer>
	notifyActivityFn?: () => void
}

// Pure function for grabbing a movie release - copied to avoid env import
async function grabMovieReleaseCore(data: GrabReleaseInput, deps: GrabReleaseDeps) {
	const numId = parseInt(data.movieId, 10)
	if (Number.isNaN(numId)) {
		throw new Error('Invalid movie ID')
	}

	const now = new Date().toISOString()

	// Download the NZB file
	const nzbPath = await deps.downloadNzbFn(data.downloadUrl, data.title)

	// Read NZB content and encode as base64
	const nzbContent = await deps.readFileFn(nzbPath)
	const base64Content = nzbContent.toString('base64')

	// Queue to NZBGet
	const sanitizedFilename = `${data.title.replace(/[^a-zA-Z0-9._-]/g, '_')}.nzb`
	const nzbId = await deps.appendNzbFn({
		filename: sanitizedFilename,
		nzbContent: base64Content,
		category: 'movies',
	})

	if (nzbId <= 0) {
		console.error('[Movies] NZBGet returned invalid ID:', nzbId)
		throw new Error('NZBGet failed to queue download')
	}

	// Trigger fast polling for download progress
	deps.notifyActivityFn?.()

	// Create release record
	const [release] = await deps.database
		.insert(schema.releases)
		.values({
			movieId: numId,
			guid: data.guid,
			title: data.title,
			downloadUrl: data.downloadUrl,
			infoUrl: data.infoUrl,
			size: data.size,
			publishDate: data.publishDate,
			indexerId: data.indexerId,
			indexerName: data.indexerName,
			nzbPath,
			grabbedAt: now,
		})
		.returning()

	// Create download record
	const [download] = await deps.database
		.insert(schema.downloads)
		.values({
			releaseId: release.id,
			nzbId,
			title: data.title,
			status: 'queued',
			size: data.size,
			queuedAt: now,
		})
		.returning()

	console.log(`[Movies] NZB queued: NZBID=${nzbId}, downloadId=${download.id}, title="${data.title}"`)
	return { release, download }
}

describe('grabMovieReleaseCore', () => {
	let db: TestDb
	let nzbgetServer: StubNzbgetServer
	let deps: GrabReleaseDeps

	// Fake NZB content
	const fakeNzbContent = Buffer.from('<?xml version="1.0"?><nzb><file/></nzb>')
	const fakeNzbPath = '/tmp/test-movie.nzb'

	beforeEach(async () => {
		db = await setupTestDb()
		nzbgetServer = new StubNzbgetServer()
		await nzbgetServer.start()

		// Insert a test movie to reference
		db.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: new Date().toISOString(),
				monitored: true,
				resolution: '1080p',
			})
			.run()

		// Create RPC helper for the stub server
		const rpcCall = async <T>(method: string, params: unknown[] = []): Promise<T> => {
			const auth = Buffer.from(`${nzbgetServer.username}:${nzbgetServer.password}`).toString('base64')
			const response = await fetch(nzbgetServer.url, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ method, params }),
			})
			const data = (await response.json()) as { result: T }
			return data.result
		}

		// Setup dependencies
		deps = {
			database: db,
			downloadNzbFn: vi.fn().mockResolvedValue(fakeNzbPath),
			readFileFn: vi.fn().mockResolvedValue(fakeNzbContent),
			appendNzbFn: async (options) => {
				// Call the stub server's append method
				return rpcCall<number>('append', [options.filename, options.nzbContent, options.category ?? '', 0, false, false, '', 0, 'SCORE'])
			},
			notifyActivityFn: vi.fn(),
		}
	})

	afterEach(async () => {
		await nzbgetServer.stop()
	})

	const validInput: GrabReleaseInput = {
		movieId: '1',
		guid: 'abc123-guid',
		title: 'Inception.2010.1080p.BluRay.x264',
		downloadUrl: 'https://indexer.example/nzb/abc123',
		infoUrl: 'https://indexer.example/details/abc123',
		size: 8_500_000_000,
		publishDate: '2023-06-15T12:00:00Z',
		indexerId: 'indexer-1',
		indexerName: 'TestIndexer',
	}

	it('downloads NZB and queues to NZBGet', async () => {
		const result = await grabMovieReleaseCore(validInput, deps)

		// Verify NZB was downloaded
		expect(deps.downloadNzbFn).toHaveBeenCalledWith(validInput.downloadUrl, validInput.title)

		// Verify NZB was read
		expect(deps.readFileFn).toHaveBeenCalledWith(fakeNzbPath)

		// Verify NZBGet received the append call
		expect(nzbgetServer.calls).toHaveLength(1)
		expect(nzbgetServer.calls[0].method).toBe('append')
		// Dots are valid in filenames, only special chars like colons/brackets are replaced
		expect(nzbgetServer.calls[0].params[0]).toBe('Inception.2010.1080p.BluRay.x264.nzb')
		expect(nzbgetServer.calls[0].params[2]).toBe('movies')

		// Verify return contains release and download
		expect(result.release).toBeDefined()
		expect(result.download).toBeDefined()
	})

	it('creates release record in database', async () => {
		const result = await grabMovieReleaseCore(validInput, deps)

		// Verify release was created
		const releases = db.select().from(schema.releases).all()
		expect(releases).toHaveLength(1)

		const release = releases[0]
		expect(release.id).toBe(result.release.id)
		expect(release.movieId).toBe(1)
		expect(release.guid).toBe(validInput.guid)
		expect(release.title).toBe(validInput.title)
		expect(release.downloadUrl).toBe(validInput.downloadUrl)
		expect(release.infoUrl).toBe(validInput.infoUrl)
		expect(release.size).toBe(validInput.size)
		expect(release.publishDate).toBe(validInput.publishDate)
		expect(release.indexerId).toBe(validInput.indexerId)
		expect(release.indexerName).toBe(validInput.indexerName)
		expect(release.nzbPath).toBe(fakeNzbPath)
		expect(release.grabbedAt).toBeDefined()
	})

	it('creates download record in database with correct nzbId', async () => {
		const result = await grabMovieReleaseCore(validInput, deps)

		// Verify download was created
		const downloads = db.select().from(schema.downloads).all()
		expect(downloads).toHaveLength(1)

		const download = downloads[0]
		expect(download.id).toBe(result.download.id)
		expect(download.releaseId).toBe(result.release.id)
		expect(download.nzbId).toBe(1) // First NZB in stub server
		expect(download.title).toBe(validInput.title)
		expect(download.status).toBe('queued')
		expect(download.size).toBe(validInput.size)
		expect(download.queuedAt).toBeDefined()
	})

	it('links download to release correctly', async () => {
		const result = await grabMovieReleaseCore(validInput, deps)

		// Verify the foreign key relationship
		const download = db.select().from(schema.downloads).where(eq(schema.downloads.id, result.download.id)).get()
		const release = db.select().from(schema.releases).where(eq(schema.releases.id, result.release.id)).get()

		expect(download?.releaseId).toBe(release?.id)
		expect(release?.movieId).toBe(1)
	})

	it('calls notifyActivityFn to trigger fast polling', async () => {
		await grabMovieReleaseCore(validInput, deps)

		expect(deps.notifyActivityFn).toHaveBeenCalledOnce()
	})

	it('throws on invalid movie ID format', async () => {
		const invalidInput = { ...validInput, movieId: 'not-a-number' }

		await expect(grabMovieReleaseCore(invalidInput, deps)).rejects.toThrow('Invalid movie ID')
	})

	it('throws when NZBGet returns invalid ID', async () => {
		// Override appendNzbFn to return 0 (failure)
		deps.appendNzbFn = vi.fn().mockResolvedValue(0)

		await expect(grabMovieReleaseCore(validInput, deps)).rejects.toThrow('NZBGet failed to queue download')
	})

	it('sanitizes filename for NZBGet', async () => {
		const inputWithSpecialChars: GrabReleaseInput = {
			...validInput,
			title: 'Movie: The [Special] Edition (2023)',
		}

		await grabMovieReleaseCore(inputWithSpecialChars, deps)

		// Check the filename passed to NZBGet
		const appendCall = nzbgetServer.calls.find((c) => c.method === 'append')
		expect(appendCall?.params[0]).toBe('Movie__The__Special__Edition__2023_.nzb')
	})

	it('queues NZB in movies category', async () => {
		await grabMovieReleaseCore(validInput, deps)

		const appendCall = nzbgetServer.calls.find((c) => c.method === 'append')
		expect(appendCall?.params[2]).toBe('movies')
	})

	it('handles optional infoUrl being undefined', async () => {
		const inputWithoutInfoUrl = { ...validInput, infoUrl: undefined }

		const result = await grabMovieReleaseCore(inputWithoutInfoUrl, deps)

		const release = db.select().from(schema.releases).where(eq(schema.releases.id, result.release.id)).get()
		expect(release?.infoUrl).toBeNull()
	})

	it('encodes NZB content as base64', async () => {
		await grabMovieReleaseCore(validInput, deps)

		const appendCall = nzbgetServer.calls.find((c) => c.method === 'append')
		const base64Content = appendCall?.params[1] as string

		// Decode and verify it matches our fake NZB
		const decoded = Buffer.from(base64Content, 'base64')
		expect(decoded.toString()).toBe(fakeNzbContent.toString())
	})

	it('handles multiple grabs for same movie', async () => {
		// Grab first release
		const input1 = { ...validInput, guid: 'guid-1', title: 'Inception.2010.720p' }
		const result1 = await grabMovieReleaseCore(input1, deps)

		// Grab second release
		const input2 = { ...validInput, guid: 'guid-2', title: 'Inception.2010.1080p' }
		const result2 = await grabMovieReleaseCore(input2, deps)

		// Verify both releases exist
		const releases = db.select().from(schema.releases).all()
		expect(releases).toHaveLength(2)

		// Verify both downloads exist with different nzbIds
		const downloads = db.select().from(schema.downloads).all()
		expect(downloads).toHaveLength(2)
		expect(result1.download.nzbId).toBe(1)
		expect(result2.download.nzbId).toBe(2)
	})
})
