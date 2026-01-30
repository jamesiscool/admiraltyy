import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { fetchNzbgetStatus, fetchNzbgetVersion, listNzbgetHistory, listNzbgetQueue, syncNzbgetHistory } from './nzbget.server'

export const getNzbgetStatusFn = createServerFn({ method: 'GET' }).handler(async () => {
	return fetchNzbgetStatus()
})

export const getNzbgetVersionFn = createServerFn({ method: 'GET' }).handler(async () => {
	return fetchNzbgetVersion()
})

export const getNzbgetQueueFn = createServerFn({ method: 'GET' }).handler(async () => {
	return listNzbgetQueue()
})

export const getNzbgetHistoryFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ showHidden: z.boolean().optional() }).optional())
	.handler(async ({ data }) => {
		return listNzbgetHistory(data?.showHidden ?? false)
	})

export const syncNzbgetHistoryFn = createServerFn({ method: 'POST' }).handler(async () => {
	const result = await syncNzbgetHistory()
	console.log(`[NZBGet Sync] Hook triggered: synced=${result.synced}, orphans=${result.orphans}, cleared=${result.cleared}`)
	return result
})
