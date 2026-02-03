import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import { MOVIE_GENRES, mapMovieResult, mapTvResult, type TmdbMovieResult, type TmdbTvResult, TV_GENRES } from './tmdb-mappers'

// Date arbitrary that generates valid ISO date strings (YYYY-MM-DD)
const arbDateString = fc
	.tuple(fc.integer({ min: 1900, max: 2099 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
	.map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)

// Arbitraries for TMDB response types
const arbTmdbMovieResult = fc.record<TmdbMovieResult>({
	id: fc.integer({ min: 1 }),
	media_type: fc.constant('movie'),
	title: fc.string({ minLength: 1 }),
	original_title: fc.string({ minLength: 1 }),
	release_date: arbDateString,
	overview: fc.string(),
	poster_path: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
	backdrop_path: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
	vote_count: fc.integer({ min: 0 }),
	vote_average: fc.float({ min: 0, max: 10, noNaN: true }),
	genre_ids: fc.array(fc.integer({ min: 1 }), { maxLength: 5 }),
	popularity: fc.float({ min: 0, noNaN: true }),
	original_language: fc.constantFrom('en', 'es', 'fr', 'de', 'ja'),
	adult: fc.boolean(),
	video: fc.boolean(),
})

const arbTmdbTvResult = fc.record<TmdbTvResult>({
	id: fc.integer({ min: 1 }),
	media_type: fc.constant('tv'),
	name: fc.string({ minLength: 1 }),
	original_name: fc.string({ minLength: 1 }),
	first_air_date: arbDateString,
	overview: fc.string(),
	poster_path: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
	backdrop_path: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
	vote_count: fc.integer({ min: 0 }),
	vote_average: fc.float({ min: 0, max: 10, noNaN: true }),
	genre_ids: fc.array(fc.integer({ min: 1 }), { maxLength: 5 }),
	popularity: fc.float({ min: 0, noNaN: true }),
	original_language: fc.constantFrom('en', 'es', 'fr', 'de', 'ja'),
	origin_country: fc.array(fc.string({ minLength: 2, maxLength: 2 }), { maxLength: 3 }),
})

describe('mapMovieResult', () => {
	test.prop([arbTmdbMovieResult])('preserves id as tmdbId', (movie) => {
		const result = mapMovieResult(movie)
		expect(result.tmdbId).toBe(movie.id)
	})

	test.prop([arbTmdbMovieResult])('preserves title', (movie) => {
		const result = mapMovieResult(movie)
		expect(result.title).toBe(movie.title)
	})

	test.prop([arbTmdbMovieResult])('sets mediaType to movie', (movie) => {
		const result = mapMovieResult(movie)
		expect(result.mediaType).toBe('movie')
	})

	test.prop([arbTmdbMovieResult])('formats poster path with TMDB CDN url', (movie) => {
		const result = mapMovieResult(movie)
		if (movie.poster_path) {
			expect(result.posterPath).toBe(`https://image.tmdb.org/t/p/w500${movie.poster_path}`)
		} else {
			expect(result.posterPath).toBeUndefined()
		}
	})

	test.prop([arbTmdbMovieResult])('formats backdrop path with TMDB CDN url', (movie) => {
		const result = mapMovieResult(movie)
		if (movie.backdrop_path) {
			expect(result.backdropPath).toBe(`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`)
		} else {
			expect(result.backdropPath).toBeUndefined()
		}
	})

	test.prop([arbTmdbMovieResult])('preserves genre_ids as genreIds', (movie) => {
		const result = mapMovieResult(movie)
		expect(result.genreIds).toEqual(movie.genre_ids)
	})
})

describe('mapTvResult', () => {
	test.prop([arbTmdbTvResult])('preserves id as tmdbId', (tv) => {
		const result = mapTvResult(tv)
		expect(result.tmdbId).toBe(tv.id)
	})

	test.prop([arbTmdbTvResult])('maps name to title', (tv) => {
		const result = mapTvResult(tv)
		expect(result.title).toBe(tv.name)
	})

	test.prop([arbTmdbTvResult])('sets mediaType to tv', (tv) => {
		const result = mapTvResult(tv)
		expect(result.mediaType).toBe('tv')
	})

	test.prop([arbTmdbTvResult])('maps first_air_date to releaseDate', (tv) => {
		const result = mapTvResult(tv)
		expect(result.releaseDate).toBe(tv.first_air_date)
	})
})

describe('genre mappings', () => {
	it('MOVIE_GENRES covers common genres', () => {
		expect(MOVIE_GENRES[28]).toBe('Action')
		expect(MOVIE_GENRES[35]).toBe('Comedy')
		expect(MOVIE_GENRES[18]).toBe('Drama')
		expect(MOVIE_GENRES[27]).toBe('Horror')
		expect(MOVIE_GENRES[878]).toBe('Sci-Fi')
	})

	it('TV_GENRES covers common genres', () => {
		expect(TV_GENRES[18]).toBe('Drama')
		expect(TV_GENRES[35]).toBe('Comedy')
		expect(TV_GENRES[10765]).toBe('Sci-Fi & Fantasy')
		expect(TV_GENRES[80]).toBe('Crime')
	})
})
