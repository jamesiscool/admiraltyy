import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getNzbgetStatusFn = createServerFn({ method: 'GET' }).handler(async () => {
	const { fetchNzbgetStatus } = await import('./nzbget.server')
	return fetchNzbgetStatus()
})

export const getNzbgetVersionFn = createServerFn({ method: 'GET' }).handler(async () => {
	const { fetchNzbgetVersion } = await import('./nzbget.server')
	return fetchNzbgetVersion()
})

export const getNzbgetQueueFn = createServerFn({ method: 'GET' }).handler(async () => {
	const { listNzbgetQueue } = await import('./nzbget.server')
	return listNzbgetQueue()
})

export const getNzbgetHistoryFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ showHidden: z.boolean().optional() }).optional())
	.handler(async ({ data }) => {
		const { listNzbgetHistory } = await import('./nzbget.server')
		return listNzbgetHistory(data?.showHidden ?? false)
	})

export const syncNzbgetHistoryFn = createServerFn({ method: 'POST' }).handler(async () => {
	const { syncNzbgetHistory } = await import('./nzbget.server')
	const result = await syncNzbgetHistory()
	console.log(`[NZBGet Sync] Hook triggered: synced=${result.synced}, orphans=${result.orphans}, cleared=${result.cleared}`)
	return result
})
