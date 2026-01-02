import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { searchMulti } from '../api/tmdb'

const searchQuerySchema = z.object({ q: z.string(), page: z.string().optional() })

export const searchRoutes = new Hono()
	// GET /api/search?q=query - Search for movies and TV shows (TMDB)
	.get('/', zValidator('query', searchQuerySchema), async (c) => {
		const { q: query, page: pageStr } = c.req.valid('query')
		const page = pageStr ? Number(pageStr) : 1

		try {
			const results = await searchMulti(query, page)
			return c.json({ success: true as const, data: results })
		} catch (error) {
			console.error('Search error:', error)
			return c.json({ success: false as const, error: 'Failed to search TMDB' }, 500)
		}
	})
	// GET /api/search/movies - Search for movies only (TMDB)
	.get('/movies', zValidator('query', searchQuerySchema), async (c) => {
		const { q: query, page: pageStr } = c.req.valid('query')
		const page = pageStr ? Number(pageStr) : 1

		try {
			const results = await searchMulti(query, page)

			return c.json({ success: true as const, data: { movies: results.movies, page: results.page, totalPages: results.totalPages } })
		} catch (error) {
			console.error('Search error:', error)
			return c.json({ success: false as const, error: 'Failed to search TMDB' }, 500)
		}
	})
	// GET /api/search/tv - Search for TV shows only (TMDB)
	.get('/tv', zValidator('query', searchQuerySchema), async (c) => {
		const { q: query, page: pageStr } = c.req.valid('query')
		const page = pageStr ? Number(pageStr) : 1

		try {
			const results = await searchMulti(query, page)
			return c.json({ success: true as const, data: { tv: results.tv, page: results.page, totalPages: results.totalPages } })
		} catch (error) {
			console.error('Search error:', error)
			return c.json({ success: false as const, error: 'Failed to search TMDB' }, 500)
		}
	})
