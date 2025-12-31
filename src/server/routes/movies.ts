import { Hono } from 'hono'
import { db, schema } from '../db'

export const moviesRoutes = new Hono()
	// GET /api/movies - List all movies
	.get('/', async (c) => {
		const movies = await db.select().from(schema.movies)
		return c.json({ data: movies, success: true as const })
	})
	// GET /api/movies/:id - Get a single movie
	.get('/:id', async (c) => {
		const id = c.req.param('id')
		const movie = await db
			.select()
			.from(schema.movies)
			.where((m) => m.id.equals(id))
		if (!movie.length) {
			return c.json({ success: false as const, error: 'Movie not found' }, 404)
		}
		return c.json({ data: movie[0], success: true as const })
	})
	// POST /api/movies - Create a new movie
	.post('/', async (c) => {
		// TODO: Implement movie creation
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// PUT /api/movies/:id - Update a movie
	.put('/:id', async (c) => {
		// TODO: Implement movie update
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// DELETE /api/movies/:id - Delete a movie
	.delete('/:id', async (c) => {
		// TODO: Implement movie deletion
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
