import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/db'
import { downloadNzb, searchEpisodeReleases } from '@/services/indexers'
import { appendNzb } from '@/services/nzbget/nzbgetApi'
import { notifyDownloadActivity } from '@/services/nzbget/nzbgetPoller'

// Search for episode releases
export const searchEpisodeReleasesServerFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ episodeId: z.string() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.episodeId, 10)
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
	})

// Grab an episode release
export const grabEpisodeRelease = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			episodeId: z.string(),
			guid: z.string(),
			title: z.string(),
			downloadUrl: z.string(),
			infoUrl: z.string().optional(),
			size: z.number(),
			publishDate: z.string(),
			indexerId: z.string(),
			indexerName: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		const numId = parseInt(data.episodeId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid episode ID')
		}

		const now = new Date().toISOString()

		// Download NZB
		const nzbPath = await downloadNzb(data.downloadUrl, data.title)

		// Read and encode NZB
		const { readFile } = await import('node:fs/promises')
		const nzbContent = await readFile(nzbPath)
		const base64Content = nzbContent.toString('base64')

		// Queue to NZBGet
		const sanitizedFilename = `${data.title.replace(/[^a-zA-Z0-9._-]/g, '_')}.nzb`
		const nzbId = await appendNzb({
			filename: sanitizedFilename,
			nzbContent: base64Content,
			category: 'tv',
		})

		if (nzbId <= 0) {
			console.error('[Episodes] NZBGet returned invalid ID:', nzbId)
			throw new Error('NZBGet failed to queue download')
		}

		// Trigger fast polling
		notifyDownloadActivity()

		// Create release record
		const [release] = await db
			.insert(schema.releases)
			.values({
				episodeId: numId,
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
		const [download] = await db
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

		console.log(`[Episodes] NZB queued: NZBID=${nzbId}, downloadId=${download.id}, title="${data.title}"`)
		return { release, download }
	})
