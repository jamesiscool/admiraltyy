import { zValidator } from '@hono/zod-validator'
import { and, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { fetchMovieDetails } from '../api/tmdb'
import { db, schema } from '../db'
import { type File, resolutions } from '../db/schema'
import { logInfo } from '../log/logs'

const idParamSchema = z.object({ id: z.string() })
const addMovieSchema = z.object({ tmdbId: z.number(), resolution: z.enum(resolutions).optional() })
const updateMovieSchema = z.object({ monitored: z.boolean().optional() })
const deleteQuerySchema = z.object({ deleteFiles: z.string().optional() })

// Aggregate file stats for movies
async function listMovieFileStats(): Promise<Map<number, { sizeBytes: number; files: File[] }>> {
	const allFiles = await db
		.select()
		.from(schema.files)
		.where(and(eq(schema.files.isDeleted, false), sql`${schema.files.movieId} IS NOT NULL`))

	const statsMap = new Map<number, { sizeBytes: number; files: File[] }>()
	for (const file of allFiles) {
		if (!file.movieId) continue
		const existing = statsMap.get(file.movieId) ?? { sizeBytes: 0, files: [] }
		existing.sizeBytes += file.size
		existing.files.push(file)
		statsMap.set(file.movieId, existing)
	}
	return statsMap
}

export const moviesRoutes = new Hono()
	// GET /api/movies - List all movies
	.get('/', async (c) => {
		const movies = await db.select().from(schema.movies)
		const fileStats = await listMovieFileStats()
		const moviesWithFiles = movies.map((movie) => {
			const stats = fileStats.get(movie.id)
			const sizeBytes = stats?.sizeBytes
			const files = stats?.files ?? []
			return { ...movie, sizeBytes, files }
		})
		return c.json({ data: moviesWithFiles, success: true as const })
	})
	// GET /api/movies/:id - Get a single movie
	.get('/:id', zValidator('param', idParamSchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			return c.json({ success: false as const, error: 'Invalid movie ID' }, 400)
		}
		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
		if (!movie.length) {
			return c.json({ success: false as const, error: 'Movie not found' }, 404)
		}
		// Get files for this movie
		const files = await db
			.select()
			.from(schema.files)
			.where(and(eq(schema.files.movieId, numId), eq(schema.files.isDeleted, false)))
		const sizeBytes = files.reduce((sum, f) => sum + f.size, 0) || undefined
		return c.json({ data: { ...movie[0], sizeBytes, files }, success: true as const })
	})
	// POST /api/movies - Create a new movie
	.post('/', zValidator('json', addMovieSchema), async (c) => {
		const body = c.req.valid('json')

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
				alternateTitles: JSON.stringify(details.alternateTitles),
				dateAdded: now,
				monitored: true,
				resolution: body.resolution ?? '1080p',
				lastInfoSync: now,
			})
			.returning()

		return c.json({ success: true as const, data: result[0] })
	})
	// PUT /api/movies/:id - Update a movie
	.put('/:id', zValidator('param', idParamSchema), zValidator('json', updateMovieSchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			return c.json({ success: false as const, error: 'Invalid movie ID' }, 400)
		}

		const body = c.req.valid('json')

		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
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

		const result = await db.update(schema.movies).set(updates).where(eq(schema.movies.id, numId)).returning()
		return c.json({ success: true as const, data: result[0] })
	})
	// DELETE /api/movies/:id - Delete a movie
	.delete('/:id', zValidator('param', idParamSchema), zValidator('query', deleteQuerySchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			return c.json({ success: false as const, error: 'Invalid movie ID' }, 400)
		}

		const { deleteFiles } = c.req.valid('query')

		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
		if (!movie.length) {
			return c.json({ success: false as const, error: 'Movie not found' }, 404)
		}

		// Delete movie folder from disk if requested
		if (deleteFiles === 'true') {
			// TODO: Implement actual folder deletion
			logInfo(`Would delete movie folder for: ${movie[0].title}`)
		}

		// Delete associated files from db
		await db.delete(schema.files).where(eq(schema.files.movieId, numId))

		// Delete associated downloads
		await db.delete(schema.downloads).where(eq(schema.downloads.movieId, numId))

		// Delete movie
		await db.delete(schema.movies).where(eq(schema.movies.id, numId))

		return c.json({ success: true as const })
	})
