import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { buildMoviePath, buildTvPath } from '@/services/path.server'
import type { ImportResult } from './fileImport'

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

// Import files for a completed download
async function fileImport(downloadId: number): Promise<ImportResult> {
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

// --- Status Updates ---

async function updateDownloadStatus(downloadId: number, status: schema.DownloadStatus, errorMessage?: string) {
	await db.update(schema.downloads).set({ status, errorMessage }).where(eq(schema.downloads.id, downloadId))
}

/** Orchestrates import: sets importing status, runs import, updates final status */
export async function processDownloadImport(downloadId: number): Promise<ImportResult> {
	console.log(`[Import] Starting import for download id=${downloadId}`)
	await updateDownloadStatus(downloadId, 'importing')

	const result = await fileImport(downloadId)
	if (result.success) {
		await updateDownloadStatus(downloadId, 'imported')
		console.log(`[Import] Complete: ${result.filesImported} file(s)`)
	} else {
		await updateDownloadStatus(downloadId, 'failed', result.error)
		console.log(`[Import] Failed: ${result.error}`)
	}

	return result
}
