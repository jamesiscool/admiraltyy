import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getNzbgetStatus = createServerFn({ method: 'GET' }).handler(async () => {
	const { fetchNzbgetStatus } = await import('./nzbget.server')
	return fetchNzbgetStatus()
})

export const getNzbgetVersion = createServerFn({ method: 'GET' }).handler(async () => {
	const { fetchNzbgetVersion } = await import('./nzbget.server')
	return fetchNzbgetVersion()
})

export const getNzbgetQueue = createServerFn({ method: 'GET' }).handler(async () => {
	const { listNzbgetQueue } = await import('./nzbget.server')
	return listNzbgetQueue()
})

export const getNzbgetHistory = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ showHidden: z.boolean().optional() }).optional())
	.handler(async ({ data }) => {
		const { listNzbgetHistory } = await import('./nzbget.server')
		return listNzbgetHistory(data?.showHidden ?? false)
	})

export const syncNzbgetHistory = createServerFn({ method: 'POST' }).handler(async () => {
	const { syncNzbgetHistory: syncImpl } = await import('./nzbget.server')
	const result = await syncImpl()
	console.log(`[NZBGet Sync] Hook triggered: synced=${result.synced}, orphans=${result.orphans}, cleared=${result.cleared}`)
	return result
})
