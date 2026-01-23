import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/db'
import { fetchNzbgetStatus, fetchNzbgetVersion, listNzbgetHistory, listNzbgetQueue, syncNzbgetHistory } from '@/services/nzbget/nzbgetApi'

// List downloads from database
export const listDownloadsQueryOptions = () =>
	queryOptions({
		queryKey: ['downloads'],
		queryFn: () => listDownloads(),
	})

export const listDownloads = createServerFn({ method: 'GET' }).handler(async () => {
	const downloads = await db.select().from(schema.downloads).orderBy(desc(schema.downloads.queuedAt)).limit(100)
	return downloads
})

// Get NZBGet status
export const getNzbgetStatusOptions = () =>
	queryOptions({
		queryKey: ['nzbget', 'status'],
		queryFn: () => getNzbgetStatus(),
	})

export const getNzbgetStatus = createServerFn({ method: 'GET' }).handler(async () => {
	const status = await fetchNzbgetStatus()
	return status
})

// Get NZBGet version
export const getNzbgetVersionOptions = () =>
	queryOptions({
		queryKey: ['nzbget', 'version'],
		queryFn: () => getNzbgetVersion(),
	})

export const getNzbgetVersion = createServerFn({ method: 'GET' }).handler(async () => {
	const version = await fetchNzbgetVersion()
	return version
})

// Get NZBGet queue
export const getNzbgetQueueOptions = () =>
	queryOptions({
		queryKey: ['nzbget', 'queue'],
		queryFn: () => getNzbgetQueue(),
	})

export const getNzbgetQueue = createServerFn({ method: 'GET' }).handler(async () => {
	const queue = await listNzbgetQueue()
	return queue
})

// Get NZBGet history
export const getNzbgetHistoryOptions = (showHidden?: boolean) =>
	queryOptions({
		queryKey: ['nzbget', 'history', showHidden],
		queryFn: () => getNzbgetHistory({ data: { showHidden } }),
	})

export const getNzbgetHistory = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ showHidden: z.boolean().optional() }).optional())
	.handler(async ({ data }) => {
		const showHidden = data?.showHidden ?? false
		const history = await listNzbgetHistory(showHidden)
		return history
	})

// Sync NZBGet history to database
export const syncNzbget = createServerFn({ method: 'POST' }).handler(async () => {
	const result = await syncNzbgetHistory()
	console.log(`[NZBGet Sync] Hook triggered: synced=${result.synced}, orphans=${result.orphans}, cleared=${result.cleared}`)
	return result
})

// Delete a download record
export const deleteDownload = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ downloadId: z.string() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.downloadId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid download ID')
		}
		const existing = await db.select().from(schema.downloads).where(eq(schema.downloads.id, numId))
		if (!existing.length) {
			throw new Error('Download not found')
		}
		await db.delete(schema.downloads).where(eq(schema.downloads.id, numId))
		return { success: true }
	})
