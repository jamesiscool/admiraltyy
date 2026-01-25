import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { eq } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as schema from '@/db/schema'
import { setupTestDb, type TestDb } from '../../test/helpers'

// Copy relevant constants and functions from fileImport.ts to avoid env import chain
const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.m4v', '.mov', '.wmv']
const SUBTITLE_EXTENSIONS = ['.srt', '.sub', '.ssa', '.ass', '.vtt']

function findFiles(dir: string, extensions: string[]): string[] {
	const results: string[] = []
	if (!existsSync(dir)) return results

	const entries = readdirSync(dir, { withFileTypes: true })
	for (const entry of entries) {
		const fullPath = join(dir, entry.name)
		if (entry.isDirectory()) {
			results.push(...findFiles(fullPath, extensions))
		} else if (extensions.includes(extname(entry.name).toLowerCase())) {
			results.push(fullPath)
		}
	}
	return results
}

function sanitizeFilename(name: string): string {
	return name.replace(/[<>:"/\\|?*]/g, '').trim()
}

function buildMoviePath(folder: string, title: string, year: number): string {
	const safeName = sanitizeFilename(`${title} (${year})`)
	return join(folder, safeName)
}

function parseQuality(title: string): string {
	const match = title.match(/\b(2160p|1080p|720p|480p)\b/i)
	return match ? match[1] : 'Unknown'
}

async function moveFile(src: string, destDir: string): Promise<string> {
	if (!existsSync(destDir)) {
		mkdirSync(destDir, { recursive: true })
	}
	const destPath = join(destDir, basename(src))
	await Bun.write(destPath, Bun.file(src))
	rmSync(src)
	return destPath
}

function deleteSourceDir(dir: string): void {
	if (existsSync(dir)) {
		rmSync(dir, { recursive: true, force: true })
	}
}

interface ImportResult {
	success: boolean
	filesImported: number
	error?: string
}

interface ImportDeps {
	database: BunSQLiteDatabase<typeof schema>
	moviesFolder: string | null
}

// Core import function with dependency injection for testing
async function fileImportCore(downloadId: number, deps: ImportDeps): Promise<ImportResult> {
	const download = await deps.database.query.downloads.findFirst({
		where: eq(schema.downloads.id, downloadId),
	})

	if (!download) {
		return { success: false, filesImported: 0, error: 'Download not found' }
	}

	if (!download.finalDir || !existsSync(download.finalDir)) {
		return { success: false, filesImported: 0, error: `finalDir not found: ${download.finalDir}` }
	}

	if (!download.releaseId) {
		return { success: false, filesImported: 0, error: 'No releaseId linked' }
	}

	const release = await deps.database.query.releases.findFirst({
		where: eq(schema.releases.id, download.releaseId),
	})

	if (!release) {
		return { success: false, filesImported: 0, error: 'Release not found' }
	}

	const videoFiles = findFiles(download.finalDir, VIDEO_EXTENSIONS)
	const subtitleFiles = findFiles(download.finalDir, SUBTITLE_EXTENSIONS)

	if (videoFiles.length === 0) {
		return { success: false, filesImported: 0, error: 'No video files found' }
	}

	let destDir: string | null = null
	let movieId: number | null = null

	if (release.movieId) {
		const movie = await deps.database.query.movies.findFirst({
			where: eq(schema.movies.id, release.movieId),
		})
		if (!movie) {
			return { success: false, filesImported: 0, error: 'Movie not found' }
		}
		if (!deps.moviesFolder) {
			return { success: false, filesImported: 0, error: 'Could not determine destination path' }
		}
		destDir = buildMoviePath(deps.moviesFolder, movie.title, movie.year)
		movieId = movie.id
	}

	if (!destDir) {
		return { success: false, filesImported: 0, error: 'Could not determine destination path' }
	}

	const quality = parseQuality(release.title)
	const now = new Date().toISOString()
	let filesImported = 0

	for (const videoPath of videoFiles) {
		const newPath = await moveFile(videoPath, destDir)
		const size = statSync(newPath).size

		await deps.database.insert(schema.files).values({
			movieId,
			seriesId: null,
			episodeId: null,
			path: newPath,
			size,
			quality,
			dateImported: now,
		})
		filesImported++
	}

	for (const subPath of subtitleFiles) {
		await moveFile(subPath, destDir)
	}

	deleteSourceDir(download.finalDir)

	return { success: true, filesImported }
}

describe('fileImportCore - movie import', () => {
	let db: TestDb
	let tempDir: string
	let downloadDir: string
	let moviesDir: string
	let deps: ImportDeps

	beforeEach(async () => {
		db = await setupTestDb()

		// Create temp directories
		tempDir = join(tmpdir(), `fileimport-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
		downloadDir = join(tempDir, 'downloads', 'completed', 'Inception.2010.1080p.BluRay')
		moviesDir = join(tempDir, 'media', 'movies')

		mkdirSync(downloadDir, { recursive: true })
		mkdirSync(moviesDir, { recursive: true })

		deps = {
			database: db,
			moviesFolder: moviesDir,
		}
	})

	afterEach(() => {
		if (tempDir && existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true })
		}
	})

	function insertMovie(overrides?: Partial<schema.MovieInsert>) {
		return db
			.insert(schema.movies)
			.values({
				id: 1,
				tmdbId: 27205,
				title: 'Inception',
				year: 2010,
				dateAdded: new Date().toISOString(),
				monitored: true,
				resolution: '1080p',
				...overrides,
			})
			.returning()
			.get()
	}

	function insertRelease(movieId: number, overrides?: Partial<schema.ReleaseInsert>) {
		return db
			.insert(schema.releases)
			.values({
				id: 1,
				movieId,
				guid: 'test-guid',
				title: 'Inception.2010.1080p.BluRay.x264',
				downloadUrl: 'https://indexer.example/nzb/123',
				size: 8_500_000_000,
				publishDate: '2023-06-15T12:00:00Z',
				indexerId: 'indexer-1',
				indexerName: 'TestIndexer',
				grabbedAt: new Date().toISOString(),
				...overrides,
			})
			.returning()
			.get()
	}

	function insertDownload(releaseId: number, finalDir: string | null, overrides?: Partial<schema.DownloadInsert>) {
		return db
			.insert(schema.downloads)
			.values({
				id: 1,
				releaseId,
				nzbId: 123,
				title: 'Inception.2010.1080p.BluRay.x264',
				status: 'completed',
				size: 8_500_000_000,
				queuedAt: new Date().toISOString(),
				finalDir,
				...overrides,
			})
			.returning()
			.get()
	}

	function createVideoFile(dir: string, filename: string, sizeMb = 100) {
		const path = join(dir, filename)
		writeFileSync(path, Buffer.alloc(sizeMb * 1024))
		return path
	}

	function createSubtitleFile(dir: string, filename: string) {
		const path = join(dir, filename)
		writeFileSync(path, 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nTest subtitle')
		return path
	}

	it('imports video file from download dir to movies folder', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'Inception.2010.1080p.BluRay.x264.mkv')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(true)
		expect(result.filesImported).toBe(1)

		const destDir = join(moviesDir, 'Inception (2010)')
		expect(existsSync(destDir)).toBe(true)
		expect(existsSync(join(destDir, 'Inception.2010.1080p.BluRay.x264.mkv'))).toBe(true)

		expect(existsSync(downloadDir)).toBe(false)
	})

	it('creates file record in database after import', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'Inception.2010.1080p.BluRay.x264.mkv', 50)

		await fileImportCore(1, deps)

		const files = db.select().from(schema.files).all()
		expect(files).toHaveLength(1)

		const file = files[0]
		expect(file.movieId).toBe(movie.id)
		expect(file.path).toContain('Inception (2010)')
		expect(file.path).toContain('Inception.2010.1080p.BluRay.x264.mkv')
		expect(file.quality).toBe('1080p')
		expect(file.dateImported).toBeDefined()
		expect(file.size).toBeGreaterThan(0)
	})

	it('imports multiple video files from download', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'Inception.2010.1080p.BluRay.x264.cd1.mkv')
		createVideoFile(downloadDir, 'Inception.2010.1080p.BluRay.x264.cd2.mkv')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(true)
		expect(result.filesImported).toBe(2)

		const files = db.select().from(schema.files).all()
		expect(files).toHaveLength(2)
	})

	it('moves subtitle files along with video', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'Inception.2010.1080p.BluRay.x264.mkv')
		createSubtitleFile(downloadDir, 'Inception.2010.1080p.BluRay.x264.srt')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(true)
		expect(result.filesImported).toBe(1)

		const destDir = join(moviesDir, 'Inception (2010)')
		expect(existsSync(join(destDir, 'Inception.2010.1080p.BluRay.x264.srt'))).toBe(true)
	})

	it('parses quality from release title', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id, { title: 'Inception.2010.2160p.UHD.BluRay.x265' })
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'Inception.2010.2160p.UHD.BluRay.x265.mkv')

		await fileImportCore(1, deps)

		const files = db.select().from(schema.files).all()
		expect(files[0].quality).toBe('2160p')
	})

	it('handles nested video files in subdirectories', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		const nestedDir = join(downloadDir, 'VIDEO')
		mkdirSync(nestedDir, { recursive: true })
		createVideoFile(nestedDir, 'Inception.2010.1080p.BluRay.x264.mkv')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(true)
		expect(result.filesImported).toBe(1)
	})

	it('returns error when download not found', async () => {
		const result = await fileImportCore(999, deps)

		expect(result.success).toBe(false)
		expect(result.error).toBe('Download not found')
	})

	it('returns error when finalDir not set', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, null)

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(false)
		expect(result.error).toContain('finalDir not found')
	})

	it('returns error when finalDir does not exist', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, '/nonexistent/path')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(false)
		expect(result.error).toContain('finalDir not found')
	})

	it('returns error when no releaseId linked', async () => {
		db.insert(schema.downloads)
			.values({
				id: 1,
				releaseId: null,
				nzbId: 123,
				title: 'Test',
				status: 'completed',
				size: 1000,
				queuedAt: new Date().toISOString(),
				finalDir: downloadDir,
			})
			.run()

		createVideoFile(downloadDir, 'test.mkv')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(false)
		expect(result.error).toBe('No releaseId linked')
	})

	it('returns error when release not found', async () => {
		db.insert(schema.downloads)
			.values({
				id: 1,
				releaseId: 999,
				nzbId: 123,
				title: 'Test',
				status: 'completed',
				size: 1000,
				queuedAt: new Date().toISOString(),
				finalDir: downloadDir,
			})
			.run()

		createVideoFile(downloadDir, 'test.mkv')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(false)
		expect(result.error).toBe('Release not found')
	})

	it('returns error when movie not found', async () => {
		db.insert(schema.releases)
			.values({
				id: 1,
				movieId: 999,
				guid: 'test-guid',
				title: 'Test.Movie.1080p',
				downloadUrl: 'https://example.com/nzb',
				size: 1000,
				publishDate: '2023-01-01',
				indexerId: 'test',
				indexerName: 'Test',
				grabbedAt: new Date().toISOString(),
			})
			.run()

		insertDownload(1, downloadDir)
		createVideoFile(downloadDir, 'test.mkv')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(false)
		expect(result.error).toBe('Movie not found')
	})

	it('returns error when no video files found', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		createSubtitleFile(downloadDir, 'test.srt')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(false)
		expect(result.error).toBe('No video files found')
	})

	it('returns error when destination folder not configured', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'test.mkv')

		const noDeps: ImportDeps = { database: db, moviesFolder: null }
		const result = await fileImportCore(1, noDeps)

		expect(result.success).toBe(false)
		expect(result.error).toBe('Could not determine destination path')
	})

	it('handles all video extensions', async () => {
		const extensions = ['.mkv', '.mp4', '.avi', '.m4v', '.mov', '.wmv']

		for (const ext of extensions) {
			const extTempDir = join(tmpdir(), `fileimport-ext-${ext.slice(1)}-${Date.now()}`)
			const dlDir = join(extTempDir, 'dl')
			const mvDir = join(extTempDir, 'movies')
			mkdirSync(dlDir, { recursive: true })
			mkdirSync(mvDir, { recursive: true })

			const testDb = await setupTestDb()

			testDb.insert(schema.movies).values({ id: 1, tmdbId: 1, title: 'Test', year: 2020, dateAdded: new Date().toISOString() }).run()
			testDb
				.insert(schema.releases)
				.values({
					id: 1,
					movieId: 1,
					guid: 'g',
					title: 'Test.1080p',
					downloadUrl: 'http://x',
					size: 1,
					publishDate: '2020-01-01',
					indexerId: 'i',
					indexerName: 'I',
					grabbedAt: new Date().toISOString(),
				})
				.run()
			testDb.insert(schema.downloads).values({ id: 1, releaseId: 1, nzbId: 1, title: 'T', status: 'completed', size: 1, queuedAt: new Date().toISOString(), finalDir: dlDir }).run()

			writeFileSync(join(dlDir, `test${ext}`), Buffer.alloc(1024))

			const result = await fileImportCore(1, { database: testDb, moviesFolder: mvDir })
			expect(result.success, `Failed for ${ext}`).toBe(true)
			expect(result.filesImported).toBe(1)

			rmSync(extTempDir, { recursive: true, force: true })
		}
	})

	it('handles all subtitle extensions', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'movie.mkv')
		writeFileSync(join(downloadDir, 'movie.srt'), 'srt')
		writeFileSync(join(downloadDir, 'movie.sub'), 'sub')
		writeFileSync(join(downloadDir, 'movie.ssa'), 'ssa')
		writeFileSync(join(downloadDir, 'movie.ass'), 'ass')
		writeFileSync(join(downloadDir, 'movie.vtt'), 'vtt')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(true)

		const destDir = join(moviesDir, 'Inception (2010)')
		expect(existsSync(join(destDir, 'movie.srt'))).toBe(true)
		expect(existsSync(join(destDir, 'movie.sub'))).toBe(true)
		expect(existsSync(join(destDir, 'movie.ssa'))).toBe(true)
		expect(existsSync(join(destDir, 'movie.ass'))).toBe(true)
		expect(existsSync(join(destDir, 'movie.vtt'))).toBe(true)
	})

	it('sanitizes special characters in destination folder name', async () => {
		const movie = insertMovie({ title: 'Movie: The [Special] Edition?' })
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'movie.mkv')

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(true)

		const entries = readdirSync(moviesDir)
		expect(entries).toHaveLength(1)
		expect(entries[0]).toBe('Movie The [Special] Edition (2010)')
	})

	it('creates destination directory if it does not exist', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'movie.mkv')

		const destDir = join(moviesDir, 'Inception (2010)')
		expect(existsSync(destDir)).toBe(false)

		const result = await fileImportCore(1, deps)

		expect(result.success).toBe(true)
		expect(existsSync(destDir)).toBe(true)
	})

	it('correctly records file size in database', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id)
		insertDownload(release.id, downloadDir)

		const sizeMb = 150
		createVideoFile(downloadDir, 'movie.mkv', sizeMb)

		await fileImportCore(1, deps)

		const files = db.select().from(schema.files).all()
		expect(files[0].size).toBe(sizeMb * 1024)
	})

	it('handles quality Unknown when not in title', async () => {
		const movie = insertMovie()
		const release = insertRelease(movie.id, { title: 'Inception.2010.BluRay.x264' })
		insertDownload(release.id, downloadDir)

		createVideoFile(downloadDir, 'movie.mkv')

		await fileImportCore(1, deps)

		const files = db.select().from(schema.files).all()
		expect(files[0].quality).toBe('Unknown')
	})
})
