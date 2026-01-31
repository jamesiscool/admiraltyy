import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { getSettings } from '@/services/settings.server'

/** Get default library folder path for media type */
export function getDefaultFolder(type: 'movies' | 'tv') {
	const { folders } = getSettings()
	const folder = folders[type].find((f) => f.isDefault) ?? folders[type][0]
	return folder?.path ?? null
}

/** Sanitize filename for filesystem (removes invalid chars) */
export function sanitizeFilename(name: string) {
	return name.replace(/[<>:"/\\|?*]/g, '').trim()
}

/** Build movie destination path: {movieFolder}/{Title} ({Year})/ */
export function buildMoviePath(title: string, year: number) {
	const folder = getDefaultFolder('movies')
	if (!folder) return null
	const safeName = sanitizeFilename(`${title} (${year})`)
	return join(folder, safeName)
}

/** Build TV destination path: {tvFolder}/{Series} [({Year})]/{Season X}/ */
export async function buildTvPath(seriesId: number, seasonNumber: number) {
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
