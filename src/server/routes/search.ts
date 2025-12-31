import { Hono } from 'hono'
import { searchMulti } from '../api/tmdb'

export const searchRoutes = new Hono()
	// GET /api/search?q=query - Search for movies and TV shows (TMDB)
	.get('/', async (c) => {
		const query = c.req.query('q')
		if (!query) {
			return c.json({ success: false as const, error: 'Query parameter "q" is required' }, 400)
		}

		const page = Number(c.req.query('page')) || 1

		try {
			const results = await searchMulti(query, page)
			return c.json({ success: true as const, data: results })
		} catch (error) {
			console.error('Search error:', error)
			return c.json({ success: false as const, error: 'Failed to search TMDB' }, 500)
		}
	})
	// GET /api/search/movies - Search for movies only (TMDB)
	.get('/movies', async (c) => {
		const query = c.req.query('q')
		if (!query) {
			return c.json({ success: false as const, error: 'Query parameter "q" is required' }, 400)
		}

		const page = Number(c.req.query('page')) || 1

		try {
			const results = await searchMulti(query, page)

			return c.json({ success: true as const, data: { movies: results.movies, page: results.page, totalPages: results.totalPages } })
		} catch (error) {
			console.error('Search error:', error)
			return c.json({ success: false as const, error: 'Failed to search TMDB' }, 500)
		}
	})
	// GET /api/search/tv - Search for TV shows only (TMDB)
	.get('/tv', async (c) => {
		const query = c.req.query('q')
		if (!query) {
			return c.json({ success: false as const, error: 'Query parameter "q" is required' }, 400)
		}

		const page = Number(c.req.query('page')) || 1

		try {
			const results = await searchMulti(query, page)
			return c.json({ success: true as const, data: { tv: results.tv, page: results.page, totalPages: results.totalPages } })
		} catch (error) {
			console.error('Search error:', error)
			return c.json({ success: false as const, error: 'Failed to search TMDB' }, 500)
		}
	})
