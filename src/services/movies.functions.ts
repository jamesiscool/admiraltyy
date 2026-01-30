import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolutions } from '@/db/schema'
import { grabReleaseInput } from './movies'
import { createMovieFromTmdb, deleteMovie, findMovieReleases, getMovieById, grabMovieRelease, listMoviesFromDb, updateMovie } from './movies.server'

export const listMoviesFn = createServerFn({ method: 'GET' }).handler(async () => {
	return listMoviesFromDb()
})

export const getMovieFn = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ movieId: z.string() }))
	.handler(async ({ data }) => {
		return getMovieById(data.movieId)
	})

export const createMovieFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ tmdbId: z.number(), resolution: z.enum(resolutions).optional() }))
	.handler(async ({ data }) => {
		return createMovieFromTmdb(data.tmdbId, data.resolution)
	})

export const updateMovieFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string(), monitored: z.boolean().optional() }))
	.handler(async ({ data }) => {
		return updateMovie(data.movieId, data)
	})

export const searchMovieReleasesFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string() }))
	.handler(async ({ data }) => {
		return findMovieReleases(data.movieId)
	})

export const grabMovieReleaseFn = createServerFn({ method: 'POST' })
	.inputValidator(grabReleaseInput)
	.handler(async ({ data }) => {
		return grabMovieRelease(data)
	})

export const deleteMovieFn = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ movieId: z.string(), deleteFiles: z.boolean().optional() }))
	.handler(async ({ data }) => {
		return deleteMovie(data.movieId, data.deleteFiles)
	})
