import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq, isNotNull } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as schema from '@/db/schema'
import { buildTitleMap, listSubfolders, listVideoFiles, listVideoFilesRecursive, matchFolder, parseEpisode, parseQuality, type ScannedFile } from '@/services/fileScan'
import { setupTestDb, type TestDb } from '../../test/helpers'

const { files, movies, series, seasons, episodes } = schema

// Core functions extracted for testing with dependency injection

async function markDeletedMovieFilesCore(db: BunSQLiteDatabase<typeof schema>): Promise<number> {
	const movieFiles = await db.select().from(files).where(isNotNull(files.movieId))
	let deletedCount = 0

	for (const file of movieFiles) {
		const exists = existsSync(file.path)
		if (!exists && !file.isDeleted) {
			await db.update(files).set({ isDeleted: true }).where(eq(files.id, file.id))
			deletedCount++
		} else if (exists && file.isDeleted) {
			await db.update(files).set({ isDeleted: false }).where(eq(files.id, file.id))
		}
	}

	return deletedCount
}

async function markDeletedSeriesFilesCore(db: BunSQLiteDatabase<typeof schema>): Promise<number> {
	const seriesFiles = await db.select().from(files).where(isNotNull(files.seriesId))
	let deletedCount = 0

	for (const file of seriesFiles) {
		const exists = existsSync(file.path)
		if (!exists && !file.isDeleted) {
			await db.update(files).set({ isDeleted: true }).where(eq(files.id, file.id))
			deletedCount++
		} else if (exists && file.isDeleted) {
			await db.update(files).set({ isDeleted: false }).where(eq(files.id, file.id))
		}
	}

	return deletedCount
}

async function upsertMovieFileCore(db: BunSQLiteDatabase<typeof schema>, movieId: number, file: ScannedFile) {
	const quality = parseQuality(file.name)
	const now = new Date().toISOString()

	const existing = await db.select().from(files).where(eq(files.path, file.path)).limit(1)

	if (existing.length > 0) {
		await db
			.update(files)
			.set({
				movieId,
				size: file.size,
				quality: quality.resolution ?? 'unknown',
				source: quality.source,
				codec: quality.codec,
				isDeleted: false,
			})
			.where(eq(files.id, existing[0].id))
	} else {
		await db.insert(files).values({
			movieId,
			path: file.path,
			size: file.size,
			quality: quality.resolution ?? 'unknown',
			source: quality.source,
			codec: quality.codec,
			dateImported: now,
			isDeleted: false,
		})
	}
}

async function upsertSeriesFileCore(db: BunSQLiteDatabase<typeof schema>, seriesId: number, episodeId: number | null, file: ScannedFile) {
	const quality = parseQuality(file.name)
	const now = new Date().toISOString()

	const existing = await db.select().from(files).where(eq(files.path, file.path)).limit(1)

	if (existing.length > 0) {
		await db
			.update(files)
			.set({
				seriesId,
				episodeId,
				size: file.size,
				quality: quality.resolution ?? 'unknown',
				source: quality.source,
				codec: quality.codec,
				isDeleted: false,
			})
			.where(eq(files.id, existing[0].id))
	} else {
		await db.insert(files).values({
			seriesId,
			episodeId,
			path: file.path,
			size: file.size,
			quality: quality.resolution ?? 'unknown',
			source: quality.source,
			codec: quality.codec,
			dateImported: now,
			isDeleted: false,
		})
	}
}

interface ScanMoviesResult {
	foldersScanned: number
	matched: number
	filesImported: number
	filesMarkedDeleted: number
}

async function scanMoviesFilesCore(db: BunSQLiteDatabase<typeof schema>, movieFolders: string[]): Promise<ScanMoviesResult> {
	if (movieFolders.length === 0) {
		throw new Error('No movie folders configured')
	}

	const filesMarkedDeleted = await markDeletedMovieFilesCore(db)

	const allMovies = await db.select().from(movies)
	const movieEntries = allMovies.map((m) => ({
		id: m.id,
		title: m.title,
		alternateTitles: m.alternateTitles ? (JSON.parse(m.alternateTitles) as string[]) : null,
	}))

	const titleMap = buildTitleMap(movieEntries)

	let scannedCount = 0
	let matchedCount = 0
	let filesInserted = 0

	for (const folder of movieFolders) {
		const subfolders = listSubfolders(folder)
		scannedCount += subfolders.length

		for (const subfolder of subfolders) {
			const movieId = matchFolder(subfolder, titleMap)
			if (!movieId) continue

			matchedCount++
			const videoFiles = listVideoFiles(subfolder.path)

			for (const file of videoFiles) {
				await upsertMovieFileCore(db, movieId, file)
				filesInserted++
			}
		}
	}

	return {
		foldersScanned: scannedCount,
		matched: matchedCount,
		filesImported: filesInserted,
		filesMarkedDeleted,
	}
}

interface ScanSeriesResult {
	foldersScanned: number
	matched: number
	filesImported: number
	filesMarkedDeleted: number
}

async function scanSeriesFilesCore(db: BunSQLiteDatabase<typeof schema>, tvFolders: string[]): Promise<ScanSeriesResult> {
	if (tvFolders.length === 0) {
		throw new Error('No TV folders configured')
	}

	const filesMarkedDeleted = await markDeletedSeriesFilesCore(db)

	const allSeries = await db.select().from(series)
	const seriesEntries = allSeries.map((s) => ({
		id: s.id,
		title: s.title,
		alternateTitles: s.alternateTitles ? (JSON.parse(s.alternateTitles) as string[]) : null,
	}))

	const titleMap = buildTitleMap(seriesEntries)

	const allSeasons = await db.select().from(seasons)
	const allEpisodes = await db.select().from(episodes)

	const episodeLookup = new Map<number, Map<number, Map<number, number>>>()
	for (const season of allSeasons) {
		if (!season.seriesId) continue
		if (!episodeLookup.has(season.seriesId)) {
			episodeLookup.set(season.seriesId, new Map())
		}
		episodeLookup.get(season.seriesId)?.set(season.seasonNumber, new Map())
	}

	for (const ep of allEpisodes) {
		const season = allSeasons.find((s) => s.id === ep.seasonId)
		if (!season?.seriesId) continue

		const seriesMap = episodeLookup.get(season.seriesId)
		if (!seriesMap) continue

		const seasonMap = seriesMap.get(season.seasonNumber)
		if (!seasonMap) continue

		seasonMap.set(ep.episodeNumber, ep.id)
	}

	let scannedCount = 0
	let matchedCount = 0
	let filesInserted = 0

	for (const folder of tvFolders) {
		const subfolders = listSubfolders(folder)
		scannedCount += subfolders.length

		for (const subfolder of subfolders) {
			const seriesId = matchFolder(subfolder, titleMap)
			if (!seriesId) continue

			matchedCount++
			const videoFiles = listVideoFilesRecursive(subfolder.path)

			for (const file of videoFiles) {
				const parsed = parseEpisode(file.name)
				if (!parsed) {
					await upsertSeriesFileCore(db, seriesId, null, file)
					filesInserted++
					continue
				}

				const seriesMap = episodeLookup.get(seriesId)
				const seasonMap = seriesMap?.get(parsed.season)
				const episodeId = seasonMap?.get(parsed.episode)

				await upsertSeriesFileCore(db, seriesId, episodeId ?? null, file)
				filesInserted++
			}
		}
	}

	return {
		foldersScanned: scannedCount,
		matched: matchedCount,
		filesImported: filesInserted,
		filesMarkedDeleted,
	}
}

// Test helpers

function createTempDir(): string {
	const dir = join(tmpdir(), `tasks-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
	mkdirSync(dir, { recursive: true })
	return dir
}

function createVideoFile(dir: string, filename: string, size = 1000): string {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true })
	}
	const path = join(dir, filename)
	writeFileSync(path, Buffer.alloc(size))
	return path
}

function insertMovie(db: TestDb, id: number, title: string, year: number, alternateTitles?: string[]): void {
	db.insert(movies)
		.values({
			id,
			tmdbId: id * 1000,
			title,
			year,
			dateAdded: new Date().toISOString(),
			monitored: true,
			resolution: '1080p',
			alternateTitles: alternateTitles !== undefined ? JSON.stringify(alternateTitles) : null,
		})
		.run()
}

function insertSeries(db: TestDb, id: number, title: string, year: number, alternateTitles?: string[]): void {
	db.insert(series)
		.values({
			id,
			tmdbId: id * 1000,
			title,
			year,
			status: 'continuing',
			dateAdded: new Date().toISOString(),
			monitored: true,
			resolution: '1080p',
			alternateTitles: alternateTitles !== undefined ? JSON.stringify(alternateTitles) : null,
		})
		.run()
}

function insertSeason(db: TestDb, id: number, seriesId: number, seasonNumber: number): void {
	db.insert(seasons)
		.values({
			id,
			seriesId,
			seasonNumber,
			monitored: true,
		})
		.run()
}

function insertEpisode(db: TestDb, id: number, seasonId: number, episodeNumber: number): void {
	db.insert(episodes)
		.values({
			id,
			seasonId,
			episodeNumber,
			title: `Episode ${episodeNumber}`,
			monitored: true,
		})
		.run()
}

function insertMovieFile(db: TestDb, movieId: number, path: string, isDeleted = false): number {
	const result = db
		.insert(files)
		.values({
			movieId,
			path,
			size: 1000,
			quality: '1080p',
			dateImported: new Date().toISOString(),
			isDeleted,
		})
		.returning({ id: files.id })
		.get()
	return result.id
}

function insertSeriesFile(db: TestDb, seriesId: number, episodeId: number | null, path: string, isDeleted = false): number {
	const result = db
		.insert(files)
		.values({
			seriesId,
			episodeId,
			path,
			size: 1000,
			quality: '1080p',
			dateImported: new Date().toISOString(),
			isDeleted,
		})
		.returning({ id: files.id })
		.get()
	return result.id
}

// Tests

describe('markDeletedMovieFiles', () => {
	let db: TestDb
	let tempDir: string

	beforeEach(async () => {
		db = await setupTestDb()
		tempDir = createTempDir()
	})

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true })
		}
	})

	it('marks missing files as deleted', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const nonExistentPath = join(tempDir, 'nonexistent.mkv')
		insertMovieFile(db, 1, nonExistentPath, false)

		const count = await markDeletedMovieFilesCore(db)

		expect(count).toBe(1)
		const file = db.select().from(files).where(eq(files.movieId, 1)).get()
		expect(file?.isDeleted).toBe(true)
	})

	it('does not count already deleted files', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const nonExistentPath = join(tempDir, 'nonexistent.mkv')
		insertMovieFile(db, 1, nonExistentPath, true)

		const count = await markDeletedMovieFilesCore(db)

		expect(count).toBe(0)
	})

	it('unmarks files that reappear', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const existingPath = createVideoFile(tempDir, 'movie.mkv')
		insertMovieFile(db, 1, existingPath, true)

		await markDeletedMovieFilesCore(db)

		const file = db.select().from(files).where(eq(files.movieId, 1)).get()
		expect(file?.isDeleted).toBe(false)
	})

	it('leaves existing files unchanged', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const existingPath = createVideoFile(tempDir, 'movie.mkv')
		insertMovieFile(db, 1, existingPath, false)

		const count = await markDeletedMovieFilesCore(db)

		expect(count).toBe(0)
		const file = db.select().from(files).where(eq(files.movieId, 1)).get()
		expect(file?.isDeleted).toBe(false)
	})

	it('handles multiple files for same movie', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const existingPath = createVideoFile(tempDir, 'movie-1080p.mkv')
		const nonExistentPath = join(tempDir, 'movie-720p.mkv')
		insertMovieFile(db, 1, existingPath, false)
		insertMovieFile(db, 1, nonExistentPath, false)

		const count = await markDeletedMovieFilesCore(db)

		expect(count).toBe(1)
		const allFiles = db.select().from(files).where(eq(files.movieId, 1)).all()
		expect(allFiles.filter((f) => f.isDeleted).length).toBe(1)
		expect(allFiles.filter((f) => !f.isDeleted).length).toBe(1)
	})
})

describe('markDeletedSeriesFiles', () => {
	let db: TestDb
	let tempDir: string

	beforeEach(async () => {
		db = await setupTestDb()
		tempDir = createTempDir()
	})

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true })
		}
	})

	it('marks missing series files as deleted', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)
		const nonExistentPath = join(tempDir, 'nonexistent.mkv')
		insertSeriesFile(db, 1, 1, nonExistentPath, false)

		const count = await markDeletedSeriesFilesCore(db)

		expect(count).toBe(1)
		const file = db.select().from(files).where(eq(files.seriesId, 1)).get()
		expect(file?.isDeleted).toBe(true)
	})

	it('unmarks series files that reappear', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)
		const existingPath = createVideoFile(tempDir, 'episode.mkv')
		insertSeriesFile(db, 1, 1, existingPath, true)

		await markDeletedSeriesFilesCore(db)

		const file = db.select().from(files).where(eq(files.seriesId, 1)).get()
		expect(file?.isDeleted).toBe(false)
	})
})

describe('upsertMovieFile', () => {
	let db: TestDb
	let tempDir: string

	beforeEach(async () => {
		db = await setupTestDb()
		tempDir = createTempDir()
	})

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true })
		}
	})

	it('inserts new movie file', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const filePath = createVideoFile(tempDir, 'Inception.2010.1080p.BluRay.x264.mkv')

		await upsertMovieFileCore(db, 1, { name: 'Inception.2010.1080p.BluRay.x264.mkv', path: filePath, size: 1000 })

		const file = db.select().from(files).where(eq(files.movieId, 1)).get()
		expect(file).toBeDefined()
		expect(file?.path).toBe(filePath)
		expect(file?.quality).toBe('1080p')
		expect(file?.source).toBe('bluray')
		expect(file?.codec).toBe('x264')
	})

	it('updates existing file by path', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const filePath = createVideoFile(tempDir, 'movie.mkv')
		insertMovieFile(db, 1, filePath, false)

		await upsertMovieFileCore(db, 1, { name: 'Inception.2010.2160p.WEB-DL.mkv', path: filePath, size: 2000 })

		const allFiles = db.select().from(files).all()
		expect(allFiles.length).toBe(1)
		expect(allFiles[0].quality).toBe('2160p')
		expect(allFiles[0].size).toBe(2000)
	})

	it('unmarks deleted file on upsert', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const filePath = createVideoFile(tempDir, 'movie.mkv')
		insertMovieFile(db, 1, filePath, true)

		await upsertMovieFileCore(db, 1, { name: 'movie.mkv', path: filePath, size: 1000 })

		const file = db.select().from(files).where(eq(files.movieId, 1)).get()
		expect(file?.isDeleted).toBe(false)
	})
})

describe('upsertSeriesFile', () => {
	let db: TestDb
	let tempDir: string

	beforeEach(async () => {
		db = await setupTestDb()
		tempDir = createTempDir()
	})

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true })
		}
	})

	it('inserts new series file with episode', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)
		const filePath = createVideoFile(tempDir, 'Breaking.Bad.S01E01.720p.BluRay.mkv')

		await upsertSeriesFileCore(db, 1, 1, { name: 'Breaking.Bad.S01E01.720p.BluRay.mkv', path: filePath, size: 500 })

		const file = db.select().from(files).where(eq(files.seriesId, 1)).get()
		expect(file).toBeDefined()
		expect(file?.episodeId).toBe(1)
		expect(file?.quality).toBe('720p')
	})

	it('inserts series file without episode', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		const filePath = createVideoFile(tempDir, 'special.mkv')

		await upsertSeriesFileCore(db, 1, null, { name: 'special.mkv', path: filePath, size: 500 })

		const file = db.select().from(files).where(eq(files.seriesId, 1)).get()
		expect(file).toBeDefined()
		expect(file?.episodeId).toBeNull()
	})

	it('updates existing series file', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)
		const filePath = createVideoFile(tempDir, 'episode.mkv')
		insertSeriesFile(db, 1, null, filePath, false)

		await upsertSeriesFileCore(db, 1, 1, { name: 'Breaking.Bad.S01E01.1080p.mkv', path: filePath, size: 800 })

		const allFiles = db.select().from(files).all()
		expect(allFiles.length).toBe(1)
		expect(allFiles[0].episodeId).toBe(1)
		expect(allFiles[0].quality).toBe('1080p')
	})
})

describe('scanMoviesFiles', () => {
	let db: TestDb
	let tempDir: string
	let moviesDir: string

	beforeEach(async () => {
		db = await setupTestDb()
		tempDir = createTempDir()
		moviesDir = join(tempDir, 'movies')
		mkdirSync(moviesDir, { recursive: true })
	})

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true })
		}
	})

	it('throws when no movie folders configured', async () => {
		await expect(scanMoviesFilesCore(db, [])).rejects.toThrow('No movie folders configured')
	})

	it('scans and matches movie folders', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const movieFolder = join(moviesDir, 'Inception (2010)')
		createVideoFile(movieFolder, 'Inception.2010.1080p.mkv')

		const result = await scanMoviesFilesCore(db, [moviesDir])

		expect(result.foldersScanned).toBe(1)
		expect(result.matched).toBe(1)
		expect(result.filesImported).toBe(1)

		const file = db.select().from(files).where(eq(files.movieId, 1)).get()
		expect(file).toBeDefined()
		expect(file?.quality).toBe('1080p')
	})

	it('matches movies with alternate titles', async () => {
		insertMovie(db, 1, 'Inception', 2010, ['Origen'])
		const movieFolder = join(moviesDir, 'Origen (2010)')
		createVideoFile(movieFolder, 'Origen.2010.1080p.mkv')

		const result = await scanMoviesFilesCore(db, [moviesDir])

		expect(result.matched).toBe(1)
		expect(result.filesImported).toBe(1)
	})

	it('excludes extras folders', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const movieFolder = join(moviesDir, 'Inception (2010)')
		createVideoFile(movieFolder, 'Inception.mkv')
		createVideoFile(join(movieFolder, 'Extras'), 'deleted-scenes.mkv')

		const result = await scanMoviesFilesCore(db, [moviesDir])

		expect(result.filesImported).toBe(1)
	})

	it('excludes trailer files', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const movieFolder = join(moviesDir, 'Inception (2010)')
		createVideoFile(movieFolder, 'Inception.mkv')
		createVideoFile(movieFolder, 'Inception-trailer.mkv')

		const result = await scanMoviesFilesCore(db, [moviesDir])

		expect(result.filesImported).toBe(1)
	})

	it('handles multiple movie folders', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		insertMovie(db, 2, 'The Dark Knight', 2008)

		const folder1 = join(tempDir, 'movies1')
		const folder2 = join(tempDir, 'movies2')

		createVideoFile(join(folder1, 'Inception (2010)'), 'Inception.mkv')
		createVideoFile(join(folder2, 'The Dark Knight (2008)'), 'TDK.mkv')

		const result = await scanMoviesFilesCore(db, [folder1, folder2])

		expect(result.foldersScanned).toBe(2)
		expect(result.matched).toBe(2)
		expect(result.filesImported).toBe(2)
	})

	it('skips unmatched folders', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		createVideoFile(join(moviesDir, 'Unknown Movie (2020)'), 'movie.mkv')
		createVideoFile(join(moviesDir, 'Inception (2010)'), 'Inception.mkv')

		const result = await scanMoviesFilesCore(db, [moviesDir])

		expect(result.foldersScanned).toBe(2)
		expect(result.matched).toBe(1)
		expect(result.filesImported).toBe(1)
	})

	it('marks deleted files during scan', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const nonExistentPath = join(tempDir, 'deleted.mkv')
		insertMovieFile(db, 1, nonExistentPath, false)

		const result = await scanMoviesFilesCore(db, [moviesDir])

		expect(result.filesMarkedDeleted).toBe(1)
	})

	it('imports multiple video files per movie folder', async () => {
		insertMovie(db, 1, 'Inception', 2010)
		const movieFolder = join(moviesDir, 'Inception (2010)')
		createVideoFile(movieFolder, 'Inception.1080p.mkv')
		createVideoFile(movieFolder, 'Inception.720p.mkv')

		const result = await scanMoviesFilesCore(db, [moviesDir])

		expect(result.filesImported).toBe(2)
		const allFiles = db.select().from(files).where(eq(files.movieId, 1)).all()
		expect(allFiles.length).toBe(2)
	})
})

describe('scanSeriesFiles', () => {
	let db: TestDb
	let tempDir: string
	let tvDir: string

	beforeEach(async () => {
		db = await setupTestDb()
		tempDir = createTempDir()
		tvDir = join(tempDir, 'tv')
		mkdirSync(tvDir, { recursive: true })
	})

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true })
		}
	})

	it('throws when no TV folders configured', async () => {
		await expect(scanSeriesFilesCore(db, [])).rejects.toThrow('No TV folders configured')
	})

	it('scans and matches series folders with episode linking', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)
		insertEpisode(db, 2, 1, 2)

		const seriesFolder = join(tvDir, 'Breaking Bad')
		const seasonFolder = join(seriesFolder, 'Season 1')
		createVideoFile(seasonFolder, 'Breaking.Bad.S01E01.720p.mkv')
		createVideoFile(seasonFolder, 'Breaking.Bad.S01E02.720p.mkv')

		const result = await scanSeriesFilesCore(db, [tvDir])

		expect(result.foldersScanned).toBe(1)
		expect(result.matched).toBe(1)
		expect(result.filesImported).toBe(2)

		const allFiles = db.select().from(files).where(eq(files.seriesId, 1)).all()
		expect(allFiles.length).toBe(2)
		expect(allFiles.find((f) => f.episodeId === 1)).toBeDefined()
		expect(allFiles.find((f) => f.episodeId === 2)).toBeDefined()
	})

	it('matches series with alternate titles', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008, ['Metástasis'])
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)

		const seriesFolder = join(tvDir, 'Metástasis')
		createVideoFile(join(seriesFolder, 'Season 1'), 'Metastasis.S01E01.mkv')

		const result = await scanSeriesFilesCore(db, [tvDir])

		expect(result.matched).toBe(1)
		expect(result.filesImported).toBe(1)
	})

	it('matches series folder with year', async () => {
		insertSeries(db, 1, 'Doctor Who', 2005)
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)

		const seriesFolder = join(tvDir, 'Doctor Who (2005)')
		createVideoFile(join(seriesFolder, 'Season 1'), 'Doctor.Who.S01E01.mkv')

		const result = await scanSeriesFilesCore(db, [tvDir])

		expect(result.matched).toBe(1)
	})

	it('handles episodes without matching episode in DB', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)

		const seriesFolder = join(tvDir, 'Breaking Bad')
		createVideoFile(join(seriesFolder, 'Season 1'), 'Breaking.Bad.S01E01.mkv')
		createVideoFile(join(seriesFolder, 'Season 1'), 'Breaking.Bad.S01E99.mkv') // Episode not in DB

		const result = await scanSeriesFilesCore(db, [tvDir])

		expect(result.filesImported).toBe(2)
		const allFiles = db.select().from(files).where(eq(files.seriesId, 1)).all()
		const ep99File = allFiles.find((f) => f.path.includes('S01E99'))
		expect(ep99File?.episodeId).toBeNull()
	})

	it('handles files without parseable episode info', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)

		const seriesFolder = join(tvDir, 'Breaking Bad')
		createVideoFile(seriesFolder, 'Special.mkv')

		const result = await scanSeriesFilesCore(db, [tvDir])

		expect(result.filesImported).toBe(1)
		const file = db.select().from(files).where(eq(files.seriesId, 1)).get()
		expect(file?.episodeId).toBeNull()
	})

	it('scans recursively for season subfolders', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		insertSeason(db, 1, 1, 1)
		insertSeason(db, 2, 1, 2)
		insertEpisode(db, 1, 1, 1)
		insertEpisode(db, 2, 2, 1)

		const seriesFolder = join(tvDir, 'Breaking Bad')
		createVideoFile(join(seriesFolder, 'Season 1'), 'Breaking.Bad.S01E01.mkv')
		createVideoFile(join(seriesFolder, 'Season 2'), 'Breaking.Bad.S02E01.mkv')

		const result = await scanSeriesFilesCore(db, [tvDir])

		expect(result.filesImported).toBe(2)
		const allFiles = db.select().from(files).where(eq(files.seriesId, 1)).all()
		expect(allFiles.length).toBe(2)
	})

	it('marks deleted series files during scan', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		const nonExistentPath = join(tempDir, 'deleted.mkv')
		insertSeriesFile(db, 1, null, nonExistentPath, false)

		const result = await scanSeriesFilesCore(db, [tvDir])

		expect(result.filesMarkedDeleted).toBe(1)
	})

	it('handles 1x01 episode format', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)

		const seriesFolder = join(tvDir, 'Breaking Bad')
		createVideoFile(join(seriesFolder, 'Season 1'), 'Breaking.Bad.1x01.mkv')

		const result = await scanSeriesFilesCore(db, [tvDir])

		expect(result.filesImported).toBe(1)
		const file = db.select().from(files).where(eq(files.seriesId, 1)).get()
		expect(file?.episodeId).toBe(1)
	})

	it('excludes extras folders recursively', async () => {
		insertSeries(db, 1, 'Breaking Bad', 2008)
		insertSeason(db, 1, 1, 1)
		insertEpisode(db, 1, 1, 1)

		const seriesFolder = join(tvDir, 'Breaking Bad')
		createVideoFile(join(seriesFolder, 'Season 1'), 'Breaking.Bad.S01E01.mkv')
		createVideoFile(join(seriesFolder, 'Extras'), 'behind-the-scenes.mkv')
		createVideoFile(join(seriesFolder, 'Featurettes'), 'making-of.mkv')

		const result = await scanSeriesFilesCore(db, [tvDir])

		expect(result.filesImported).toBe(1)
	})
})
