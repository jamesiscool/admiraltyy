import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
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
			return c.json(results)
		} catch (error) {
			console.error('Search error:', error)
			throw new HTTPException(500, { message: 'Failed to search TMDB' })
		}
	})
	// GET /api/search/movies - Search for movies only (TMDB)
	.get('/movies', zValidator('query', searchQuerySchema), async (c) => {
		const { q: query, page: pageStr } = c.req.valid('query')
		const page = pageStr ? Number(pageStr) : 1

		try {
			const results = await searchMulti(query, page)

			return c.json({ movies: results.movies, page: results.page, totalPages: results.totalPages })
		} catch (error) {
			console.error('Search error:', error)
			throw new HTTPException(500, { message: 'Failed to search TMDB' })
		}
	})
	// GET /api/search/tv - Search for TV shows only (TMDB)
	.get('/tv', zValidator('query', searchQuerySchema), async (c) => {
		const { q: query, page: pageStr } = c.req.valid('query')
		const page = pageStr ? Number(pageStr) : 1

		try {
			const results = await searchMulti(query, page)
			return c.json({ tv: results.tv, page: results.page, totalPages: results.totalPages })
		} catch (error) {
			console.error('Search error:', error)
			throw new HTTPException(500, { message: 'Failed to search TMDB' })
		}
	})
