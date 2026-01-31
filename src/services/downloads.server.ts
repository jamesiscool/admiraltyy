import { readFile } from 'node:fs/promises'
import { db, schema } from '@/db'
import { downloadNzb } from '@/services/indexers.server'
import { appendNzb, notifyDownloadActivity } from '@/services/nzbget.server'

export interface GrabReleaseData {
	guid: string
	title: string
	downloadUrl: string
	infoUrl?: string
	size: number
	publishDate: string
	indexerId: string
	indexerName: string
}

export interface GrabReleaseOptions {
	/** Movie ID (mutually exclusive with episodeId) */
	movieId?: number
	/** Episode ID (mutually exclusive with movieId) */
	episodeId?: number
	/** NZBGet category (e.g. 'movies', 'tv') */
	category: string
}

/** Orchestrates full download: NZB fetch -> queue to NZBGet -> create DB records */
export async function grabRelease(data: GrabReleaseData, options: GrabReleaseOptions) {
	const now = new Date().toISOString()
	const logPrefix = options.movieId ? '[Movies]' : '[Episodes]'

	// Download NZB from indexer
	const nzbPath = await downloadNzb(data.downloadUrl, data.title)

	// Read and encode NZB for NZBGet
	const nzbContent = await readFile(nzbPath)
	const base64Content = nzbContent.toString('base64')

	// Queue to NZBGet
	const sanitizedFilename = `${data.title.replace(/[^a-zA-Z0-9._-]/g, '_')}.nzb`
	const nzbId = await appendNzb({
		filename: sanitizedFilename,
		nzbContent: base64Content,
		category: options.category,
	})

	if (nzbId <= 0) {
		console.error(`${logPrefix} NZBGet returned invalid ID:`, nzbId)
		throw new Error('NZBGet failed to queue download')
	}

	// Trigger fast polling for download status
	notifyDownloadActivity()

	// Create release record
	const [release] = await db
		.insert(schema.releases)
		.values({
			movieId: options.movieId ?? null,
			episodeId: options.episodeId ?? null,
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

	console.log(`${logPrefix} NZB queued: NZBID=${nzbId}, downloadId=${download.id}, title="${data.title}"`)
	return { release, download }
}
