import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { getSettings } from '@/services/settings.server'

const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.m4v', '.mov', '.wmv']
const SUBTITLE_EXTENSIONS = ['.srt', '.sub', '.ssa', '.ass', '.vtt']

// Recursively find files with given extensions
function findFiles(dir: string, extensions: string[]) {
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

// Get default folder path for media type
function getDefaultFolder(type: 'movies' | 'tv') {
	const { folders } = getSettings()
	const folder = folders[type].find((f) => f.isDefault) ?? folders[type][0]
	return folder?.path ?? null
}

// Sanitize filename for filesystem
function sanitizeFilename(name: string) {
	return name.replace(/[<>:"/\\|?*]/g, '').trim()
}

// Build movie destination path: {movieFolder}/{Title} ({Year})/
function buildMoviePath(title: string, year: number) {
	const folder = getDefaultFolder('movies')
	if (!folder) return null
	const safeName = sanitizeFilename(`${title} (${year})`)
	return join(folder, safeName)
}

// Build TV destination path, checking useYearInFolder
async function buildTvPath(seriesId: number, seasonNumber: number) {
	const folder = getDefaultFolder('tv')
	if (!folder) return null

	const seriesRow = await db.query.series.findFirst({
		where: eq(schema.series.id, seriesId),
	})
	if (!seriesRow) return null

	const seriesFolder = seriesRow.useYearInFolder ? sanitizeFilename(`${seriesRow.title} (${seriesRow.year})`) : sanitizeFilename(seriesRow.title)

	const seasonFolder = `Season ${seasonNumber}`
	return join(folder, seriesFolder, seasonFolder)
}

// Parse quality from release title
function parseQuality(title: string) {
	const match = title.match(/\b(2160p|1080p|720p|480p)\b/i)
	return match ? match[1] : 'Unknown'
}

// Move file to destination
async function moveFile(src: string, destDir: string) {
	if (!existsSync(destDir)) {
		mkdirSync(destDir, { recursive: true })
	}
	const destPath = join(destDir, basename(src))
	await Bun.write(destPath, Bun.file(src))
	rmSync(src)
	return destPath
}

// Delete source directory recursively
function deleteSourceDir(dir: string) {
	if (existsSync(dir)) {
		rmSync(dir, { recursive: true, force: true })
	}
}

import type { ImportResult } from './fileImport'

// Import files for a completed download
export async function fileImport(downloadId: number): Promise<ImportResult> {
	const download = await db.query.downloads.findFirst({
		where: eq(schema.downloads.id, downloadId),
	})

	if (!download) {
		return { success: false, filesImported: 0, error: 'Download not found' } as ImportResult
	}

	if (!download.finalDir || !existsSync(download.finalDir)) {
		return { success: false, filesImported: 0, error: `finalDir not found: ${download.finalDir}` } as ImportResult
	}

	if (!download.releaseId) {
		return { success: false, filesImported: 0, error: 'No releaseId linked' } as ImportResult
	}

	// Get the release to find movie/episode
	const release = await db.query.releases.findFirst({
		where: eq(schema.releases.id, download.releaseId),
	})

	if (!release) {
		return { success: false, filesImported: 0, error: 'Release not found' } as ImportResult
	}

	// Find video and subtitle files
	const videoFiles = findFiles(download.finalDir, VIDEO_EXTENSIONS)
	const subtitleFiles = findFiles(download.finalDir, SUBTITLE_EXTENSIONS)

	if (videoFiles.length === 0) {
		return { success: false, filesImported: 0, error: 'No video files found' } as ImportResult
	}

	let destDir: string | null = null
	let movieId: number | null = null
	let seriesId: number | null = null
	let episodeId: number | null = null

	if (release.movieId) {
		// Movie import
		const movie = await db.query.movies.findFirst({
			where: eq(schema.movies.id, release.movieId),
		})
		if (!movie) {
			return { success: false, filesImported: 0, error: 'Movie not found' } as ImportResult
		}
		destDir = buildMoviePath(movie.title, movie.year)
		movieId = movie.id
	} else if (release.episodeId) {
		// Episode import
		const episode = await db.query.episodes.findFirst({
			where: eq(schema.episodes.id, release.episodeId),
		})
		if (!episode?.seasonId) {
			return { success: false, filesImported: 0, error: 'Episode or season not found' } as ImportResult
		}

		const season = await db.query.seasons.findFirst({
			where: eq(schema.seasons.id, episode.seasonId),
		})
		if (!season?.seriesId) {
			return { success: false, filesImported: 0, error: 'Season or series not found' } as ImportResult
		}

		destDir = await buildTvPath(season.seriesId, season.seasonNumber)
		seriesId = season.seriesId
		episodeId = episode.id
	}

	if (!destDir) {
		return { success: false, filesImported: 0, error: 'Could not determine destination path' } as ImportResult
	}

	const quality = parseQuality(release.title)
	const now = new Date().toISOString()
	let filesImported = 0

	// Move video files and insert into files table
	for (const videoPath of videoFiles) {
		const newPath = await moveFile(videoPath, destDir)
		const size = statSync(newPath).size

		await db.insert(schema.files).values({
			movieId,
			seriesId,
			episodeId,
			path: newPath,
			size,
			quality,
			dateImported: now,
		})
		filesImported++
	}

	// Move subtitle files (no db entry needed)
	for (const subPath of subtitleFiles) {
		await moveFile(subPath, destDir)
	}

	// Delete source folder
	deleteSourceDir(download.finalDir)

	console.log(`[Import] Imported ${filesImported} file(s) to ${destDir}`)
	return { success: true, filesImported } as ImportResult
}
