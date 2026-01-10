import { zValidator } from '@hono/zod-validator'
import { and, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { fetchMovieDetails } from '../api/tmdb'
import { db, schema } from '../db'
import { type Resolution, resolutions } from '../db/schema'
import { downloadNzb, searchMovieReleases } from '../lib/indexer'
import { logInfo } from '../log/logs'
import { appendNzb } from '../nzbget/nzbgetApi'

const idParamSchema = z.object({ id: z.string() })
const addMovieSchema = z.object({ tmdbId: z.number(), resolution: z.enum(resolutions).optional() })
const updateMovieSchema = z.object({ monitored: z.boolean().optional() })
const deleteQuerySchema = z.object({ deleteFiles: z.string().optional() })
const grabSchema = z.object({
	guid: z.string(),
	title: z.string(),
	downloadUrl: z.string(),
	infoUrl: z.string().optional(),
	size: z.number(),
	publishDate: z.string(),
	indexerId: z.string(),
	indexerName: z.string(),
})

// Preview type for list/card display (minimal fields)
export interface MoviePreview {
	id: number
	title: string
	year: number
	posterUrl: string | null
	resolution: Resolution | null
	monitored: boolean | null
	dateAdded: string
	cinemaReleaseDate: string | null
	sizeBytes: number
}

// List all movies with computed stats (for list page)
async function listMoviePreviews(): Promise<MoviePreview[]> {
	const results = await db.all<MoviePreview>(sql`
		SELECT 
			m.id,
			m.title,
			m.year,
			m.poster_url as posterUrl,
			m.resolution,
			m.monitored,
			m.date_added as dateAdded,
			m.cinema_release_date as cinemaReleaseDate,
			COALESCE(file_stats.size_bytes, 0) as sizeBytes
		FROM movies m
		LEFT JOIN (
			SELECT movie_id, SUM(size) as size_bytes
			FROM files 
			WHERE is_deleted = 0 AND movie_id IS NOT NULL
			GROUP BY movie_id
		) file_stats ON file_stats.movie_id = m.id
	`)
	return results
}

export const moviesRoutes = new Hono()
	// GET /api/movies - List all movies (preview data only)
	.get('/', async (c) => {
		const movies = await listMoviePreviews()
		return c.json(movies)
	})
	// GET /api/movies/:id - Get a single movie
	.get('/:id', zValidator('param', idParamSchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid movie ID' })
		}
		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
		if (!movie.length) {
			throw new HTTPException(404, { message: 'Movie not found' })
		}
		// Get files for this movie
		const files = await db
			.select()
			.from(schema.files)
			.where(and(eq(schema.files.movieId, numId), eq(schema.files.isDeleted, false)))
		const sizeBytes = files.reduce((sum, f) => sum + f.size, 0) || undefined
		return c.json({ ...movie[0], sizeBytes, files })
	})
	// POST /api/movies - Create a new movie
	.post('/', zValidator('json', addMovieSchema), async (c) => {
		const body = c.req.valid('json')

		// Check if movie already exists
		const existing = await db.select().from(schema.movies).where(eq(schema.movies.tmdbId, body.tmdbId))
		if (existing.length > 0) {
			throw new HTTPException(409, { message: 'Movie already exists' })
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

		return c.json(result[0])
	})
	// PUT /api/movies/:id - Update a movie
	.put('/:id', zValidator('param', idParamSchema), zValidator('json', updateMovieSchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid movie ID' })
		}

		const body = c.req.valid('json')

		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
		if (!movie.length) {
			throw new HTTPException(404, { message: 'Movie not found' })
		}

		const updates: Partial<{ monitored: boolean }> = {}
		if (typeof body.monitored === 'boolean') {
			updates.monitored = body.monitored
		}

		if (Object.keys(updates).length === 0) {
			return c.json(movie[0])
		}

		const result = await db.update(schema.movies).set(updates).where(eq(schema.movies.id, numId)).returning()
		return c.json(result[0])
	})
	// POST /api/movies/:id/search - Manual search for movie releases
	.post('/:id/search', zValidator('param', idParamSchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid movie ID' })
		}

		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
		if (!movie.length) {
			throw new HTTPException(404, { message: 'Movie not found' })
		}

		const m = movie[0]
		const releases = await searchMovieReleases({
			tmdbId: m.tmdbId,
			imdbId: m.imdbId ?? undefined,
			title: m.title,
			year: m.year,
		})

		return c.json(releases)
	})
	// POST /api/movies/:id/grab - Download NZB and queue to NZBGet
	.post('/:id/grab', zValidator('param', idParamSchema), zValidator('json', grabSchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid movie ID' })
		}

		const releaseData = c.req.valid('json')
		const now = new Date().toISOString()

		try {
			// Download the NZB file
			const nzbPath = await downloadNzb(releaseData.downloadUrl, releaseData.title)

			// Read NZB content and encode as base64
			const nzbFile = Bun.file(nzbPath)
			const nzbContent = await nzbFile.arrayBuffer()
			const base64Content = Buffer.from(nzbContent).toString('base64')

			// Queue to NZBGet
			const sanitizedFilename = `${releaseData.title.replace(/[^a-zA-Z0-9._-]/g, '_')}.nzb`
			const nzbId = await appendNzb({
				filename: sanitizedFilename,
				nzbContent: base64Content,
				category: 'movies',
			})

			if (nzbId <= 0) {
				console.error('[Movies] NZBGet returned invalid ID:', nzbId)
				throw new HTTPException(500, { message: 'NZBGet failed to queue download' })
			}

			// Create release record
			const [release] = await db
				.insert(schema.releases)
				.values({
					movieId: numId,
					guid: releaseData.guid,
					title: releaseData.title,
					downloadUrl: releaseData.downloadUrl,
					infoUrl: releaseData.infoUrl,
					size: releaseData.size,
					publishDate: releaseData.publishDate,
					indexerId: releaseData.indexerId,
					indexerName: releaseData.indexerName,
					nzbPath,
					grabbedAt: now,
				})
				.returning()

			// Create download record
			const [download] = await db
				.insert(schema.downloads)
				.values({
					releaseId: release.id,
					nzbId,
					title: releaseData.title,
					status: 'queued',
					size: releaseData.size,
					queuedAt: now,
				})
				.returning()

			console.log(`[Movies] NZB queued (NZBID: ${nzbId}) download: ${download.id}`)
			return c.json({ release, download })
		} catch (error) {
			console.error('[Movies] Failed to grab release:', error)
			if (error instanceof HTTPException) throw error
			throw new HTTPException(500, { message: 'Failed to download NZB' })
		}
	})
	// DELETE /api/movies/:id - Delete a movie
	.delete('/:id', zValidator('param', idParamSchema), zValidator('query', deleteQuerySchema), async (c) => {
		const { id } = c.req.valid('param')
		const numId = parseInt(id, 10)
		if (Number.isNaN(numId)) {
			throw new HTTPException(400, { message: 'Invalid movie ID' })
		}

		const { deleteFiles } = c.req.valid('query')

		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
		if (!movie.length) {
			throw new HTTPException(404, { message: 'Movie not found' })
		}

		// Delete movie folder from disk if requested
		if (deleteFiles === 'true') {
			// TODO: Implement actual folder deletion
			logInfo(`Would delete movie folder for: ${movie[0].title}`)
		}

		// Delete associated files from db
		await db.delete(schema.files).where(eq(schema.files.movieId, numId))

		// Get releases for this movie to delete their downloads
		const movieReleases = await db.select({ id: schema.releases.id }).from(schema.releases).where(eq(schema.releases.movieId, numId))
		for (const release of movieReleases) {
			await db.delete(schema.downloads).where(eq(schema.downloads.releaseId, release.id))
		}

		// Delete releases
		await db.delete(schema.releases).where(eq(schema.releases.movieId, numId))

		// Delete movie
		await db.delete(schema.movies).where(eq(schema.movies.id, numId))

		return c.body(null, 204)
	})
