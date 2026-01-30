import { queryOptions } from '@tanstack/react-query'
import { getMovie, listMovies } from '@/services/movies.functions'

export const listMoviesQueryOptions = () =>
	queryOptions({
		queryKey: ['movies'],
		queryFn: () => listMovies(),
	})

export const getMovieOptions = (movieId: string) =>
	queryOptions({
		queryKey: ['movies', movieId],
		queryFn: () => getMovie({ data: { movieId } }),
	})
