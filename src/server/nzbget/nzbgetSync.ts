import { eq } from 'drizzle-orm'
import { db, schema } from '../db'
import { clearNzbgetHistory, listNzbgetHistory } from './nzbgetApi'
import type { NzbgetHistoryItem } from './nzbgetSchema'

// Map NZBGet status to our download status
function mapNzbgetStatus(item: NzbgetHistoryItem): 'completed' | 'failed' {
	// SUCCESS, FAILURE, DELETED, or prefixed variants like SUCCESS/GOOD
	if (item.Status.startsWith('SUCCESS')) return 'completed'
	return 'failed'
}

// Sync NZBGet history to database and clear it
export async function syncNzbgetHistory(): Promise<{ synced: number; orphans: number; cleared: number }> {
	const history = await listNzbgetHistory()

	if (history.length === 0) {
		return { synced: 0, orphans: 0, cleared: 0 }
	}

	let synced = 0
	let orphans = 0
	const syncedNzbIds: number[] = []

	for (const item of history) {
		// Find download by nzbId
		const download = await db.query.downloads.findFirst({
			where: eq(schema.downloads.nzbId, item.NZBID),
		})

		if (!download) {
			console.log(`[NZBGet Sync] Orphan history item: ${item.Name} (NZBID: ${item.NZBID})`)
			orphans++
			// Still track for clearing - we don't want orphans cluttering history
			syncedNzbIds.push(item.NZBID)
			continue
		}

		// Update download with final state
		const status = mapNzbgetStatus(item)
		const completedAt = new Date(item.HistoryTime * 1000).toISOString()

		await db
			.update(schema.downloads)
			.set({
				status,
				parStatus: item.ParStatus,
				unpackStatus: item.UnpackStatus,
				finalDir: item.FinalDir || null,
				downloadedSizeMb: item.DownloadedSizeMB,
				downloadTimeSec: item.DownloadTimeSec,
				completedAt,
				progress: 100,
			})
			.where(eq(schema.downloads.id, download.id))

		syncedNzbIds.push(item.NZBID)
		synced++
		console.log(`[NZBGet Sync] Updated download: ${item.Name} -> ${status}`)
	}

	// Clear synced history items from NZBGet
	if (syncedNzbIds.length > 0) {
		await clearNzbgetHistory(syncedNzbIds)
		console.log(`[NZBGet Sync] Cleared ${syncedNzbIds.length} history items`)
	}

	return { synced, orphans, cleared: syncedNzbIds.length }
}
