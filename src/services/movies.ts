import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/db'
import { type Resolution, resolutions } from '@/db/schema'
import { downloadNzb, searchMovieReleases } from '@/services/indexers'
import { logInfo } from '@/services/logs'
import { appendNzb } from '@/services/nzbget/nzbgetApi'
import { notifyDownloadActivity } from '@/services/nzbget/nzbgetPoller'
import { fetchMovieDetails } from '@/services/tmdb'

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

// Full movie with files
export interface MovieWithFiles {
	id: number
	tmdbId: number
	imdbId: string | null
	title: string
	year: number
	posterUrl: string | null
	backdropUrl: string | null
	synopsis: string | null
	runtimeMins: number | null
	genres: string | null
	cinemaReleaseDate: string | null
	digitalReleaseDate: string | null
	contentRating: string | null
	dateAdded: string
	monitored: boolean | null
	resolution: Resolution | null
	lastSearchTime: string | null
	lastInfoSync: string | null
	rtId: string | null
	rtVanity: string | null
	alternateTitles: string | null
	sizeBytes: number | undefined
	files: (typeof schema.files.$inferSelect)[]
}

// List all movies with computed stats
export const listMoviesQueryOptions = () =>
	queryOptions({
		queryKey: ['movies'],
		queryFn: () => listMovies(),
	})

export const listMovies = createServerFn({ method: 'GET' }).handler(async (): Promise<MoviePreview[]> => {
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
})

// Get a single movie
export const getMovieOptions = (movieId: string) =>
	queryOptions({
		queryKey: ['movies', movieId],
		queryFn: () => getMovie({ data: { movieId } }),
	})

export const getMovie = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ movieId: z.string() }))
	.handler(async ({ data }): Promise<MovieWithFiles> => {
		const numId = parseInt(data.movieId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid movie ID')
		}
		const movies = await db.select().from(schema.movies).where(eq(schema.movies.id, numId)).limit(1)
		if (!movies.length) {
			throw new Error('Movie not found')
		}
		const movie = movies[0]
		// Get files for this movie
		const files = await db
			.select()
			.from(schema.files)
			.where(and(eq(schema.files.movieId, numId), eq(schema.files.isDeleted, false)))
		const sizeBytes = files.reduce((sum, f) => sum + f.size, 0) || undefined
		return { ...movie, sizeBytes, files }
	})

// Create a new movie
export const createMovie = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ tmdbId: z.number(), resolution: z.enum(resolutions).optional() }))
	.handler(async ({ data }) => {
		// Check if movie already exists
		const existing = await db.select().from(schema.movies).where(eq(schema.movies.tmdbId, data.tmdbId))
		if (existing.length > 0) {
			throw new Error('Movie already exists')
		}

		// Fetch movie details from TMDB
		const details = await fetchMovieDetails(data.tmdbId)
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
				cinemaReleaseDate: details.cinemaReleaseDate,
				digitalReleaseDate: details.digitalReleaseDate,
				contentRating: details.contentRating,
				alternateTitles: JSON.stringify(details.alternateTitles),
				dateAdded: now,
				monitored: true,
				resolution: data.resolution ?? '1080p',
				lastInfoSync: now,
			})
			.returning()

		return result[0]
	})

// Update a movie
export const updateMovie = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string(), monitored: z.boolean().optional() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.movieId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid movie ID')
		}

		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
		if (!movie.length) {
			throw new Error('Movie not found')
		}

		const updates: Partial<{ monitored: boolean }> = {}
		if (typeof data.monitored === 'boolean') {
			updates.monitored = data.monitored
		}

		if (Object.keys(updates).length === 0) {
			return movie[0]
		}

		const result = await db.update(schema.movies).set(updates).where(eq(schema.movies.id, numId)).returning()
		return result[0]
	})

// Search movie releases
export const searchMovieReleasesServerFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.movieId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid movie ID')
		}

		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
		if (!movie.length) {
			throw new Error('Movie not found')
		}

		const m = movie[0]
		const releases = await searchMovieReleases({
			tmdbId: m.tmdbId,
			imdbId: m.imdbId ?? undefined,
			title: m.title,
			year: m.year,
		})

		return releases
	})

// Grab a movie release
export const grabMovieRelease = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			movieId: z.string(),
			guid: z.string(),
			title: z.string(),
			downloadUrl: z.string(),
			infoUrl: z.string().optional(),
			size: z.number(),
			publishDate: z.string(),
			indexerId: z.string(),
			indexerName: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		const numId = parseInt(data.movieId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid movie ID')
		}

		const now = new Date().toISOString()

		// Download the NZB file
		const nzbPath = await downloadNzb(data.downloadUrl, data.title)

		// Read NZB content and encode as base64
		const { readFile } = await import('node:fs/promises')
		const nzbContent = await readFile(nzbPath)
		const base64Content = nzbContent.toString('base64')

		// Queue to NZBGet
		const sanitizedFilename = `${data.title.replace(/[^a-zA-Z0-9._-]/g, '_')}.nzb`
		const nzbId = await appendNzb({
			filename: sanitizedFilename,
			nzbContent: base64Content,
			category: 'movies',
		})

		if (nzbId <= 0) {
			console.error('[Movies] NZBGet returned invalid ID:', nzbId)
			throw new Error('NZBGet failed to queue download')
		}

		// Trigger fast polling for download progress
		notifyDownloadActivity()

		// Create release record
		const [release] = await db
			.insert(schema.releases)
			.values({
				movieId: numId,
				guid: data.guid,
				title: data.title,
				downloadUrl: data.downloadUrl,
				infoUrl: data.infoUrl,
				size: data.size,
				publishDate: data.publishDate,
				indexerId: data.indexerId,
				indexerName: data.indexerName,
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
				title: data.title,
				status: 'queued',
				size: data.size,
				queuedAt: now,
			})
			.returning()

		console.log(`[Movies] NZB queued: NZBID=${nzbId}, downloadId=${download.id}, title="${data.title}"`)
		return { release, download }
	})

// Delete a movie
export const deleteMovie = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string(), deleteFiles: z.boolean().optional() }))
	.handler(async ({ data }) => {
		const numId = parseInt(data.movieId, 10)
		if (Number.isNaN(numId)) {
			throw new Error('Invalid movie ID')
		}

		const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
		if (!movie.length) {
			throw new Error('Movie not found')
		}

		// Delete movie folder from disk if requested
		if (data.deleteFiles) {
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

		return { success: true }
	})
