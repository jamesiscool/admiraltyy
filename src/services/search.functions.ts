import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const searchTmdbFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ q: z.string(), page: z.number().optional() }))
	.handler(async ({ data }) => {
		const { searchTmdb } = await import('./search.server')
		return searchTmdb(data.q, data.page)
	})
