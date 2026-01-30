import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolutions } from '@/db/schema'
import { grabReleaseInput } from './movies'

export const listMovies = createServerFn({ method: 'GET' }).handler(async () => {
	const { listMoviesFromDb } = await import('./movies.server')
	return listMoviesFromDb()
})

export const getMovie = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ movieId: z.string() }))
	.handler(async ({ data }) => {
		const { getMovieById } = await import('./movies.server')
		return getMovieById(data.movieId)
	})

export const createMovie = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ tmdbId: z.number(), resolution: z.enum(resolutions).optional() }))
	.handler(async ({ data }) => {
		const { createMovieFromTmdb } = await import('./movies.server')
		return createMovieFromTmdb(data.tmdbId, data.resolution)
	})

export const updateMovie = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string(), monitored: z.boolean().optional() }))
	.handler(async ({ data }) => {
		const { updateMovieImpl } = await import('./movies.server')
		return updateMovieImpl(data.movieId, data)
	})

export const searchMovieReleasesServerFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string() }))
	.handler(async ({ data }) => {
		const { searchMovieReleasesImpl } = await import('./movies.server')
		return searchMovieReleasesImpl(data.movieId)
	})

export const grabMovieRelease = createServerFn({ method: 'POST' })
	.inputValidator(grabReleaseInput)
	.handler(async ({ data }) => {
		const { grabMovieReleaseImpl } = await import('./movies.server')
		return grabMovieReleaseImpl(data)
	})

export const deleteMovie = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string(), deleteFiles: z.boolean().optional() }))
	.handler(async ({ data }) => {
		const { deleteMovieImpl } = await import('./movies.server')
		return deleteMovieImpl(data.movieId, data.deleteFiles)
	})
