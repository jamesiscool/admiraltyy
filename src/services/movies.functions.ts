import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolutions } from '@/db/schema'
import { grabReleaseInput } from './movies'

export const listMoviesFn = createServerFn({ method: 'GET' }).handler(async () => {
	const { listMoviesFromDb } = await import('./movies.server')
	return listMoviesFromDb()
})

export const getMovieFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ movieId: z.string() }))
	.handler(async ({ data }) => {
		const { getMovieById } = await import('./movies.server')
		return getMovieById(data.movieId)
	})

export const createMovieFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ tmdbId: z.number(), resolution: z.enum(resolutions).optional() }))
	.handler(async ({ data }) => {
		const { createMovieFromTmdb } = await import('./movies.server')
		return createMovieFromTmdb(data.tmdbId, data.resolution)
	})

export const updateMovieFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string(), monitored: z.boolean().optional() }))
	.handler(async ({ data }) => {
		const { updateMovie } = await import('./movies.server')
		return updateMovie(data.movieId, data)
	})

export const searchMovieReleasesFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string() }))
	.handler(async ({ data }) => {
		const { findMovieReleases } = await import('./movies.server')
		return findMovieReleases(data.movieId)
	})

export const grabMovieReleaseFn = createServerFn({ method: 'POST' })
	.inputValidator(grabReleaseInput)
	.handler(async ({ data }) => {
		const { grabMovieRelease } = await import('./movies.server')
		return grabMovieRelease(data)
	})

export const deleteMovieFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string(), deleteFiles: z.boolean().optional() }))
	.handler(async ({ data }) => {
		const { deleteMovie } = await import('./movies.server')
		return deleteMovie(data.movieId, data.deleteFiles)
	})
