import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const searchTmdb = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ q: z.string(), page: z.number().optional() }))
	.handler(async ({ data }) => {
		const { searchTmdbImpl } = await import('./search.server')
		return searchTmdbImpl(data.q, data.page)
	})
