import { existsSync } from 'node:fs'
import { eq, isNotNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../../db'
import { episodes, files, movies, seasons, series } from '../../db/schema'
import { buildTitleMap, listSubfolders, listVideoFiles, listVideoFilesRecursive, matchFolder, parseEpisode, parseQuality, type ScannedFile } from '../../lib/scan'
import { getSettings } from '../../settings'

export const scanFileSystemRoutes = new Hono()
	// Scan movies
	.post('/movies', async (c) => {
		const settings = getSettings()
		const movieFolders = settings.folders.movies

		if (movieFolders.length === 0) {
			return c.json({ error: 'No movie folders configured' }, 400)
		}

		// Check for deleted files first
		const filesMarkedDeleted = await markDeletedMovieFiles()

		// Load all movies from DB
		const allMovies = await db.select().from(movies)
		const movieEntries = allMovies.map((m) => ({
			id: m.id,
			title: m.title,
			alternateTitles: m.alternateTitles ? (JSON.parse(m.alternateTitles) as string[]) : null,
		}))

		// Build title map
		const titleMap = buildTitleMap(movieEntries)

		let scannedCount = 0
		let matchedCount = 0
		let filesInserted = 0

		for (const folder of movieFolders) {
			const subfolders = listSubfolders(folder.path)
			scannedCount += subfolders.length

			for (const subfolder of subfolders) {
				const movieId = matchFolder(subfolder, titleMap)
				if (!movieId) continue

				matchedCount++
				const videoFiles = listVideoFiles(subfolder.path)

				for (const file of videoFiles) {
					await upsertMovieFile(movieId, file)
					filesInserted++
				}
			}
		}

		return c.json({
			foldersScanned: scannedCount,
			matched: matchedCount,
			filesImported: filesInserted,
			filesMarkedDeleted,
		})
	})
	// Scan series
	.post('/series', async (c) => {
		const settings = getSettings()
		const tvFolders = settings.folders.tv

		if (tvFolders.length === 0) {
			return c.json({ error: 'No TV folders configured' }, 400)
		}

		// Check for deleted files first
		const filesMarkedDeleted = await markDeletedSeriesFiles()

		// Load all series from DB
		const allSeries = await db.select().from(series)
		const seriesEntries = allSeries.map((s) => ({
			id: s.id,
			title: s.title,
			alternateTitles: s.alternateTitles ? (JSON.parse(s.alternateTitles) as string[]) : null,
		}))

		// Build title map
		const titleMap = buildTitleMap(seriesEntries)

		// Load all seasons and episodes for lookup
		const allSeasons = await db.select().from(seasons)
		const allEpisodes = await db.select().from(episodes)

		// Build episode lookup: seriesId -> season -> episode -> episodeId
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
			const subfolders = listSubfolders(folder.path)
			scannedCount += subfolders.length

			for (const subfolder of subfolders) {
				const seriesId = matchFolder(subfolder, titleMap)
				if (!seriesId) continue

				matchedCount++
				const videoFiles = listVideoFilesRecursive(subfolder.path)

				for (const file of videoFiles) {
					const parsed = parseEpisode(file.name)
					if (!parsed) {
						// Insert as series file without episode
						await upsertSeriesFile(seriesId, null, file)
						filesInserted++
						continue
					}

					// Look up episode ID
					const seriesMap = episodeLookup.get(seriesId)
					const seasonMap = seriesMap?.get(parsed.season)
					const episodeId = seasonMap?.get(parsed.episode)

					await upsertSeriesFile(seriesId, episodeId ?? null, file)
					filesInserted++
				}
			}
		}

		return c.json({
			foldersScanned: scannedCount,
			matched: matchedCount,
			filesImported: filesInserted,
			filesMarkedDeleted,
		})
	})

// Helpers

// Check all movie files in DB and mark missing ones as deleted
async function markDeletedMovieFiles(): Promise<number> {
	const movieFiles = await db.select().from(files).where(isNotNull(files.movieId))
	let deletedCount = 0

	for (const file of movieFiles) {
		const exists = existsSync(file.path)
		if (!exists && !file.isDeleted) {
			await db.update(files).set({ isDeleted: true }).where(eq(files.id, file.id))
			deletedCount++
		} else if (exists && file.isDeleted) {
			// File reappeared, unmark
			await db.update(files).set({ isDeleted: false }).where(eq(files.id, file.id))
		}
	}

	return deletedCount
}

// Check all series files in DB and mark missing ones as deleted
async function markDeletedSeriesFiles(): Promise<number> {
	const seriesFiles = await db.select().from(files).where(isNotNull(files.seriesId))
	let deletedCount = 0

	for (const file of seriesFiles) {
		const exists = existsSync(file.path)
		if (!exists && !file.isDeleted) {
			await db.update(files).set({ isDeleted: true }).where(eq(files.id, file.id))
			deletedCount++
		} else if (exists && file.isDeleted) {
			// File reappeared, unmark
			await db.update(files).set({ isDeleted: false }).where(eq(files.id, file.id))
		}
	}

	return deletedCount
}

async function upsertMovieFile(movieId: number, file: ScannedFile) {
	const quality = parseQuality(file.name)
	const now = new Date().toISOString()

	// Check if file already exists by path
	const existing = await db.select().from(files).where(eq(files.path, file.path)).limit(1)

	if (existing.length > 0) {
		// Update existing
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
		// Insert new
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

async function upsertSeriesFile(seriesId: number, episodeId: number | null, file: ScannedFile) {
	const quality = parseQuality(file.name)
	const now = new Date().toISOString()

	// Check if file already exists by path
	const existing = await db.select().from(files).where(eq(files.path, file.path)).limit(1)

	if (existing.length > 0) {
		// Update existing
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
		// Insert new
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
