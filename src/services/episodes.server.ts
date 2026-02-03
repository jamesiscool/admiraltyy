import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { grabRelease } from '@/services/downloads.server'
import { searchEpisodeReleases } from '@/services/indexers.server'
import { getSettings } from '@/services/settings.server'
import type { GrabEpisodeReleaseInput } from './episodes'

// --- Helpers ---

/** Sanitize a title for use as a folder name */
function sanitizeFolderName(name: string) {
	return name.replace(/[<>:"/\\|?*]/g, '').trim()
}

/** Build episode folder path: {rootFolder}/{Series Title} ({Year})/Season {N} - always absolute */
function buildEpisodeFolderPath(rootFolder: string, seriesTitle: string, seriesYear: number, seasonNumber: number) {
	const seriesFolder = sanitizeFolderName(`${seriesTitle} (${seriesYear})`)
	const seasonFolder = `Season ${String(seasonNumber).padStart(2, '0')}`
	return resolve(rootFolder, seriesFolder, seasonFolder)
}

export async function findEpisodeReleases(episodeId: string) {
	const numId = parseInt(episodeId, 10)
	if (Number.isNaN(numId)) {
		throw new Error('Invalid episode ID')
	}

	// Get episode with season and series info
	const episode = await db.select().from(schema.episodes).where(eq(schema.episodes.id, numId))
	if (!episode.length) {
		throw new Error('Episode not found')
	}

	const ep = episode[0]
	if (!ep.seasonId) {
		throw new Error('Episode has no season')
	}

	// Get season
	const season = await db.select().from(schema.seasons).where(eq(schema.seasons.id, ep.seasonId))
	if (!season.length) {
		throw new Error('Season not found')
	}

	const s = season[0]
	if (!s.seriesId) {
		throw new Error('Season has no series')
	}

	// Get series
	const series = await db.select().from(schema.series).where(eq(schema.series.id, s.seriesId))
	if (!series.length) {
		throw new Error('Series not found')
	}

	const show = series[0]

	console.log(`[Episodes] Searching for ${show.title} S${s.seasonNumber}E${ep.episodeNumber}`)

	const releases = await searchEpisodeReleases({
		tmdbId: show.tmdbId,
		tvdbId: show.tvdbId ?? undefined,
		season: s.seasonNumber,
		episode: ep.episodeNumber,
		title: show.title,
	})

	console.log(`[Episodes] Found ${releases.length} releases`)
	return releases
}

export async function grabEpisodeRelease(data: GrabEpisodeReleaseInput) {
	const episodeId = parseInt(data.episodeId, 10)
	if (Number.isNaN(episodeId)) {
		throw new Error('Invalid episode ID')
	}

	// Get episode -> season -> series for destination path
	const episode = await db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId)).limit(1)
	if (!episode.length || !episode[0].seasonId) {
		throw new Error('Episode not found')
	}

	const season = await db.select().from(schema.seasons).where(eq(schema.seasons.id, episode[0].seasonId)).limit(1)
	if (!season.length || !season[0].seriesId) {
		throw new Error('Season not found')
	}

	const series = await db.select().from(schema.series).where(eq(schema.series.id, season[0].seriesId)).limit(1)
	if (!series.length) {
		throw new Error('Series not found')
	}

	// Get default TV folder
	const settings = getSettings()
	const defaultFolder = settings.folders.tv.find((f) => f.isDefault) ?? settings.folders.tv[0]
	const destDir = defaultFolder ? buildEpisodeFolderPath(defaultFolder.path, series[0].title, series[0].year, season[0].seasonNumber) : undefined

	return grabRelease(
		{
			guid: data.guid,
			title: data.title,
			downloadUrl: data.downloadUrl,
			infoUrl: data.infoUrl,
			size: data.size,
			publishDate: data.publishDate,
			indexerId: data.indexerId,
			indexerName: data.indexerName,
		},
		{ episodeId, category: 'tv', destDir },
	)
}
