import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import type * as schemaTypes from '@/db/schema'
import type { resolutions } from '@/db/schema'
import type { MovieDetails } from '@/services/tmdb'
import type { GrabReleaseInput, MoviePreview, MovieWithFiles } from './movies'

export async function listMoviesFromDb(): Promise<MoviePreview[]> {
	const { sql } = await import('drizzle-orm')
	const { db } = await import('@/db')
	return db.all<MoviePreview>(sql`
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
}

export async function getMovieById(movieId: string): Promise<MovieWithFiles> {
	const { and, eq } = await import('drizzle-orm')
	const { db, schema } = await import('@/db')
	const numId = parseInt(movieId, 10)
	if (Number.isNaN(numId)) {
		throw new Error('Invalid movie ID')
	}
	const movies = await db.select().from(schema.movies).where(eq(schema.movies.id, numId)).limit(1)
	if (!movies.length) {
		throw new Error('Movie not found')
	}
	const movie = movies[0]
	const files = await db
		.select()
		.from(schema.files)
		.where(and(eq(schema.files.movieId, numId), eq(schema.files.isDeleted, false)))
	const sizeBytes = files.reduce((sum, f) => sum + f.size, 0) || undefined
	return { ...movie, sizeBytes, files } as MovieWithFiles
}

export async function insertMovieFromTmdb(database: BunSQLiteDatabase<typeof schemaTypes>, details: MovieDetails, resolution?: (typeof resolutions)[number]) {
	const schema = await import('@/db/schema')
	const now = new Date().toISOString()

	const result = await database
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
			resolution: resolution ?? '1080p',
			lastInfoSync: now,
		})
		.returning()

	return result[0]
}

export async function movieExistsByTmdbId(database: BunSQLiteDatabase<typeof schemaTypes>, tmdbId: number) {
	const { eq } = await import('drizzle-orm')
	const schema = await import('@/db/schema')
	const existing = await database.select().from(schema.movies).where(eq(schema.movies.tmdbId, tmdbId))
	return existing.length > 0
}

export async function createMovieFromTmdb(tmdbId: number, resolution?: (typeof resolutions)[number]) {
	const { db } = await import('@/db')
	const { fetchMovieDetails } = await import('@/services/tmdb')
	if (await movieExistsByTmdbId(db, tmdbId)) {
		throw new Error('Movie already exists')
	}
	const details = await fetchMovieDetails(tmdbId)
	return insertMovieFromTmdb(db, details, resolution)
}

export async function updateMovieImpl(movieId: string, data: { monitored?: boolean }) {
	const { eq } = await import('drizzle-orm')
	const { db, schema } = await import('@/db')
	const numId = parseInt(movieId, 10)
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
}

export async function searchMovieReleasesImpl(movieId: string) {
	const { eq } = await import('drizzle-orm')
	const { db, schema } = await import('@/db')
	const { searchMovieReleases } = await import('@/services/indexers')
	const numId = parseInt(movieId, 10)
	if (Number.isNaN(numId)) {
		throw new Error('Invalid movie ID')
	}

	const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
	if (!movie.length) {
		throw new Error('Movie not found')
	}

	const m = movie[0]
	return searchMovieReleases({
		tmdbId: m.tmdbId,
		imdbId: m.imdbId ?? undefined,
		title: m.title,
		year: m.year,
	})
}

export async function grabMovieReleaseImpl(data: GrabReleaseInput) {
	const { readFile } = await import('node:fs/promises')
	const { db, schema } = await import('@/db')
	const { downloadNzb } = await import('@/services/indexers')
	const { appendNzb, notifyDownloadActivity } = await import('@/services/nzbget.server')

	const numId = parseInt(data.movieId, 10)
	if (Number.isNaN(numId)) {
		throw new Error('Invalid movie ID')
	}

	const now = new Date().toISOString()

	const nzbPath = await downloadNzb(data.downloadUrl, data.title)
	const nzbContent = await readFile(nzbPath)
	const base64Content = nzbContent.toString('base64')

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

	notifyDownloadActivity()

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
}

export async function deleteMovieImpl(movieId: string, deleteFiles?: boolean) {
	const { eq } = await import('drizzle-orm')
	const { db, schema } = await import('@/db')
	const { logInfo } = await import('@/services/logs')

	const numId = parseInt(movieId, 10)
	if (Number.isNaN(numId)) {
		throw new Error('Invalid movie ID')
	}

	const movie = await db.select().from(schema.movies).where(eq(schema.movies.id, numId))
	if (!movie.length) {
		throw new Error('Movie not found')
	}

	if (deleteFiles) {
		logInfo(`Would delete movie folder for: ${movie[0].title}`)
	}

	await db.delete(schema.files).where(eq(schema.files.movieId, numId))

	const movieReleases = await db.select().from(schema.releases).where(eq(schema.releases.movieId, numId))
	for (const release of movieReleases) {
		await db.delete(schema.downloads).where(eq(schema.downloads.releaseId, release.id))
	}

	await db.delete(schema.releases).where(eq(schema.releases.movieId, numId))
	await db.delete(schema.movies).where(eq(schema.movies.id, numId))

	return { success: true }
}
