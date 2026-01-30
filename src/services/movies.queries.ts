import { queryOptions } from '@tanstack/react-query'
import { getMovieFn, listMoviesFn } from '@/services/movies.functions'

export const listMoviesQueryOptions = () =>
	queryOptions({
		queryKey: ['movies'],
		queryFn: () => listMoviesFn(),
	})

export const getMovieOptions = (movieId: string) =>
	queryOptions({
		queryKey: ['movies', movieId],
		queryFn: () => getMovieFn({ data: { movieId } }),
	})
