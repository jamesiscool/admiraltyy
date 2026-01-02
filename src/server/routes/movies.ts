import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { fetchMovieDetails } from '../api/tmdb'
import { db, schema } from '../db'
import type { Resolution } from '../db/schema'

export const moviesRoutes = new Hono()
	// GET /api/movies - List all movies
	.get('/', async (c) => {
		const movies = await db.select().from(schema.movies)
		return c.json({ data: movies, success: true as const })
	})
	// GET /api/movies/:id - Get a single movie
	.get('/:id', async (c) => {
		const id = parseInt(c.req.param('id'), 10)
		if (Number.isNaN(id)) {
			return c.json({ success: false as const, error: 'Invalid movie ID' }, 400)
		}
		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, id))
		if (!movie.length) {
			return c.json({ success: false as const, error: 'Movie not found' }, 404)
		}
		return c.json({ data: movie[0], success: true as const })
	})
	// POST /api/movies - Create a new movie
	.post('/', async (c) => {
		const body = await c.req.json<{ tmdbId: number; resolution?: Resolution }>()

		if (!body.tmdbId || typeof body.tmdbId !== 'number') {
			return c.json({ success: false as const, error: 'tmdbId is required' }, 400)
		}

		// Check if movie already exists
		const existing = await db.select().from(schema.movies).where(eq(schema.movies.tmdbId, body.tmdbId))
		if (existing.length > 0) {
			return c.json({ success: false as const, error: 'Movie already exists' }, 409)
		}

		// Fetch movie details from TMDB
		const details = await fetchMovieDetails(body.tmdbId)
		const now = new Date().toISOString()

		// Insert movie into database
		const result = await db
			.insert(schema.movies)
			.values({
				tmdbId: details.tmdbId,
				imdbId: details.imdbId,
				title: details.title,
				year: details.year,
				posterUrl: details.posterUrl,
				backdropUrl: details.backdropUrl,
				synopsis: details.synopsis,
				runtimeMins: details.runtimeMins,
				genres: JSON.stringify(details.genres),
				cast: JSON.stringify(details.cast),
				cinemaReleaseDate: details.cinemaReleaseDate,
				digitalReleaseDate: details.digitalReleaseDate,
				contentRating: details.contentRating,
				dateAdded: now,
				monitored: true,
				resolution: body.resolution ?? '1080p',
				lastInfoSync: now,
			})
			.returning()

		return c.json({ success: true as const, data: result[0] })
	})
	// PUT /api/movies/:id - Update a movie
	.put('/:id', async (c) => {
		const id = parseInt(c.req.param('id'), 10)
		if (Number.isNaN(id)) {
			return c.json({ success: false as const, error: 'Invalid movie ID' }, 400)
		}

		const body = await c.req.json<{ monitored?: boolean }>()

		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, id))
		if (!movie.length) {
			return c.json({ success: false as const, error: 'Movie not found' }, 404)
		}

		const updates: Partial<{ monitored: boolean }> = {}
		if (typeof body.monitored === 'boolean') {
			updates.monitored = body.monitored
		}

		if (Object.keys(updates).length === 0) {
			return c.json({ success: true as const, data: movie[0] })
		}

		const result = await db.update(schema.movies).set(updates).where(eq(schema.movies.id, id)).returning()
		return c.json({ success: true as const, data: result[0] })
	})
	// DELETE /api/movies/:id - Delete a movie
	.delete('/:id', async (c) => {
		// TODO: Implement movie deletion
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
