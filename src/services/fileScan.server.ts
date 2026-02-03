import { existsSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { eq, isNotNull } from 'drizzle-orm'
import { db, schema } from '@/db'
import { getSettings } from '@/services/settings.server'

const { files, movies, series, seasons, episodes } = schema

// --- Constants ---

export const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v', '.ts', '.webm']

// Exclusion patterns (from Sonarr/Radarr)
const EXCLUDED_FOLDERS = /(?:extras|samples?|featurettes|behind the scenes|deleted scenes|interviews|trailers)$/i
const EXCLUDED_FILES = /-(trailer|sample|other|behindthescenes|deleted|featurette|interview|scene|short)\./i

// Quality parsing regexes
const RESOLUTION_REGEX = /\b(480p|720p|1080p|2160p|4k)\b/i
const SOURCE_REGEX = /\b(bluray|blu-ray|bdrip|brrip|hdtv|web-dl|webdl|webrip|web|dvdrip|dvd|hdcam|cam|ts|telesync|remux)\b/i
const CODEC_REGEX = /\b(x264|h\.?264|avc|x265|h\.?265|hevc|xvid|divx|av1)\b/i

// Episode parsing: S01E01, S1E1, 1x01, etc.
const EPISODE_REGEX = /(?:S(?<season>\d{1,2})E(?<episode>\d{1,3}))|(?:(?<seasonAlt>\d{1,2})x(?<episodeAlt>\d{2,3}))/i

// --- Title Simplification ---

// Simplify title for matching: lowercase, remove articles/punctuation, normalize spaces
export function simplifyTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/^(the|a|an)\s+/i, '') // Remove leading articles
		.replace(/[''`]/g, '') // Remove apostrophes
		.replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim()
}

// --- Exclusion Checks ---

export function isExcludedFolder(name: string): boolean {
	return EXCLUDED_FOLDERS.test(name)
}

export function isExcludedFile(name: string): boolean {
	return EXCLUDED_FILES.test(name)
}

export function isVideoFile(name: string): boolean {
	const ext = extname(name).toLowerCase()
	return VIDEO_EXTENSIONS.includes(ext)
}

// --- Quality Parsing ---

export interface ParsedQuality {
	resolution: string | null
	source: string | null
	codec: string | null
}

export function parseQuality(filename: string): ParsedQuality {
	const resMatch = filename.match(RESOLUTION_REGEX)
	const srcMatch = filename.match(SOURCE_REGEX)
	const codecMatch = filename.match(CODEC_REGEX)

	let resolution = resMatch?.[1]?.toLowerCase() ?? null
	if (resolution === '4k') resolution = '2160p'

	return {
		resolution,
		source: srcMatch?.[1]?.toLowerCase() ?? null,
		codec: codecMatch?.[1]?.toLowerCase().replace(/\./g, '') ?? null,
	}
}

// --- Episode Parsing ---

export interface ParsedEpisode {
	season: number
	episode: number
}

export function parseEpisode(filename: string): ParsedEpisode | null {
	const match = filename.match(EPISODE_REGEX)
	if (!match?.groups) return null

	const season = match.groups.season ?? match.groups.seasonAlt
	const episode = match.groups.episode ?? match.groups.episodeAlt

	if (!season || !episode) return null

	return {
		season: Number.parseInt(season, 10),
		episode: Number.parseInt(episode, 10),
	}
}

// --- Directory Scanning ---

export interface ScannedFolder {
	name: string
	path: string
	simplifiedName: string
}

// List immediate subfolders of a directory
export function listSubfolders(rootPath: string): ScannedFolder[] {
	try {
		const entries = readdirSync(rootPath, { withFileTypes: true })
		return entries
			.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
			.filter((e) => !isExcludedFolder(e.name))
			.map((e) => ({
				name: e.name,
				path: join(rootPath, e.name),
				simplifiedName: simplifyTitle(e.name),
			}))
	} catch {
		return []
	}
}

export interface ScannedFile {
	name: string
	path: string
	size: number
}

// List video files in a folder (non-recursive for movies)
export function listVideoFiles(folderPath: string): ScannedFile[] {
	try {
		const entries = readdirSync(folderPath, { withFileTypes: true })
		return entries
			.filter((e) => e.isFile() && isVideoFile(e.name) && !isExcludedFile(e.name))
			.map((e) => {
				const fullPath = join(folderPath, e.name)
				const stats = statSync(fullPath)
				return {
					name: e.name,
					path: fullPath,
					size: stats.size,
				}
			})
	} catch {
		return []
	}
}

// List video files recursively (for series with season subfolders)
export function listVideoFilesRecursive(folderPath: string): ScannedFile[] {
	const files: ScannedFile[] = []

	function walk(dir: string) {
		try {
			const entries = readdirSync(dir, { withFileTypes: true })
			for (const entry of entries) {
				const fullPath = join(dir, entry.name)
				if (entry.isDirectory()) {
					if (!entry.name.startsWith('.') && !isExcludedFolder(entry.name)) {
						walk(fullPath)
					}
				} else if (entry.isFile() && isVideoFile(entry.name) && !isExcludedFile(entry.name)) {
					const stats = statSync(fullPath)
					files.push({
						name: entry.name,
						path: fullPath,
						size: stats.size,
					})
				}
			}
		} catch {
			// Skip inaccessible directories
		}
	}

	walk(folderPath)
	return files
}

// --- Title Matching ---

export interface TitleEntry {
	id: number
	title: string
	alternateTitles: string[] | null
}

// Build a map of simplified title -> id for matching
export function buildTitleMap<T extends TitleEntry>(entries: T[]): Map<string, number> {
	const map = new Map<string, number>()

	for (const entry of entries) {
		// Add main title
		map.set(simplifyTitle(entry.title), entry.id)

		// Add alternate titles
		if (entry.alternateTitles) {
			for (const alt of entry.alternateTitles) {
				map.set(simplifyTitle(alt), entry.id)
			}
		}
	}

	return map
}

// Match a folder name to an entry using the title map
export function matchFolder(folder: ScannedFolder, titleMap: Map<string, number>): number | null {
	// Direct match
	const directMatch = titleMap.get(folder.simplifiedName)
	if (directMatch) return directMatch

	// Try extracting title from folder name (often: "Movie Title (2023)")
	const yearMatch = folder.name.match(/^(.+?)\s*\(\d{4}\)/)
	if (yearMatch) {
		const titleOnly = simplifyTitle(yearMatch[1])
		const match = titleMap.get(titleOnly)
		if (match) return match
	}

	return null
}

// --- File Deletion Tracking ---

// Check all movie files in DB and mark missing ones as deleted
async function markDeletedMovieFiles() {
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
async function markDeletedSeriesFiles() {
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

// --- File Upsert ---

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

// --- Scan Functions ---

// Scan movies
export async function scanMoviesFiles() {
	const settings = getSettings()
	const movieFolders = settings.folders.movies

	if (movieFolders.length === 0) {
		throw new Error('No movie folders configured')
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

	return {
		foldersScanned: scannedCount,
		matched: matchedCount,
		filesImported: filesInserted,
		filesMarkedDeleted,
	}
}

// Scan series
export async function scanSeriesFiles() {
	const settings = getSettings()
	const tvFolders = settings.folders.tv

	if (tvFolders.length === 0) {
		throw new Error('No TV folders configured')
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

	return {
		foldersScanned: scannedCount,
		matched: matchedCount,
		filesImported: filesInserted,
		filesMarkedDeleted,
	}
}
