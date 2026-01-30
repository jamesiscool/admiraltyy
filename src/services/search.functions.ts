import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { searchTmdb } from './search.server'

export const searchTmdbFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ q: z.string(), page: z.number().optional() }))
	.handler(async ({ data }) => {
		return searchTmdb(data.q, data.page)
	})
