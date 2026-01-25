import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { MOVIE_GENRES, mapMovieResult, mapTvResult, TV_GENRES } from './tmdb-mappers'

// TMDB paths always start with / followed by alphanumeric + extension
const arbTmdbPath = fc.stringMatching(/^[a-zA-Z0-9]{5,20}$/).map((s) => `/${s}.jpg`)

// Valid YYYY-MM-DD date string
const arbDateString = fc
	.tuple(
		fc.integer({ min: 1900, max: 2030 }),
		fc.integer({ min: 1, max: 12 }),
		fc.integer({ min: 1, max: 28 }), // Keep to 28 to avoid invalid dates
	)
	.map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)

// Title: alphanumeric with spaces, 1-100 chars
const arbTitle = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ]{0,99}$/)

// Arbitrary for TMDB movie result (matches internal TmdbMovieResult type)
const arbTmdbMovieResult = fc.record({
	id: fc.integer({ min: 1, max: 999999 }),
	media_type: fc.constant('movie' as const),
	popularity: fc.double({ min: 0, max: 10000, noNaN: true }),
	poster_path: fc.option(arbTmdbPath, { nil: undefined }),
	backdrop_path: fc.option(arbTmdbPath, { nil: undefined }),
	vote_count: fc.integer({ min: 0, max: 1000000 }),
	vote_average: fc.double({ min: 0, max: 10, noNaN: true }),
	genre_ids: fc.array(fc.constantFrom(...Object.keys(MOVIE_GENRES).map(Number)), { maxLength: 5 }),
	overview: fc.string({ maxLength: 500 }),
	original_language: fc.stringMatching(/^[a-z]{2}$/),
	title: arbTitle,
	original_title: arbTitle,
	release_date: arbDateString, // Required string in TMDB response
	adult: fc.boolean(),
	video: fc.boolean(),
})

// Arbitrary for TMDB TV result (matches internal TmdbTvResult type)
const arbTmdbTvResult = fc.record({
	id: fc.integer({ min: 1, max: 999999 }),
	media_type: fc.constant('tv' as const),
	popularity: fc.double({ min: 0, max: 10000, noNaN: true }),
	poster_path: fc.option(arbTmdbPath, { nil: undefined }),
	backdrop_path: fc.option(arbTmdbPath, { nil: undefined }),
	vote_count: fc.integer({ min: 0, max: 1000000 }),
	vote_average: fc.double({ min: 0, max: 10, noNaN: true }),
	genre_ids: fc.array(fc.constantFrom(...Object.keys(TV_GENRES).map(Number)), { maxLength: 5 }),
	overview: fc.string({ maxLength: 500 }),
	original_language: fc.stringMatching(/^[a-z]{2}$/),
	name: arbTitle,
	original_name: arbTitle,
	origin_country: fc.array(fc.stringMatching(/^[A-Z]{2}$/), { maxLength: 5 }),
	first_air_date: arbDateString, // Required string in TMDB response
})

describe('mapMovieResult', () => {
	it('maps basic movie fields', () => {
		const movie = {
			id: 27205,
			media_type: 'movie' as const,
			popularity: 100.5,
			poster_path: '/poster.jpg',
			backdrop_path: '/backdrop.jpg',
			vote_count: 10000,
			vote_average: 8.5,
			genre_ids: [28, 12],
			overview: 'A test movie',
			original_language: 'en',
			title: 'Inception',
			original_title: 'Inception',
			release_date: '2010-07-16',
			adult: false,
			video: false,
		}

		const result = mapMovieResult(movie)

		expect(result.tmdbId).toBe(27205)
		expect(result.title).toBe('Inception')
		expect(result.mediaType).toBe('movie')
		expect(result.posterPath).toBe('https://image.tmdb.org/t/p/w500/poster.jpg')
		expect(result.backdropPath).toBe('https://image.tmdb.org/t/p/w780/backdrop.jpg')
		expect(result.releaseDate).toBe('2010-07-16')
		expect(result.voteAverage).toBe(8.5)
		expect(result.voteCount).toBe(10000)
		expect(result.genreIds).toEqual([28, 12])
	})

	it('handles missing poster/backdrop', () => {
		const movie = {
			id: 1,
			media_type: 'movie' as const,
			popularity: 1,
			poster_path: undefined,
			backdrop_path: undefined,
			vote_count: 0,
			vote_average: 0,
			genre_ids: [],
			overview: '',
			original_language: 'en',
			title: 'No Poster',
			original_title: 'No Poster',
			release_date: '',
			adult: false,
			video: false,
		}

		const result = mapMovieResult(movie)

		expect(result.posterPath).toBeUndefined()
		expect(result.backdropPath).toBeUndefined()
	})
})

describe('mapTvResult', () => {
	it('maps basic TV fields', () => {
		const tv = {
			id: 1399,
			media_type: 'tv' as const,
			popularity: 500.5,
			poster_path: '/got.jpg',
			backdrop_path: '/got_backdrop.jpg',
			vote_count: 20000,
			vote_average: 9.0,
			genre_ids: [18, 10765],
			overview: 'A fantasy series',
			original_language: 'en',
			name: 'Game of Thrones',
			original_name: 'Game of Thrones',
			origin_country: ['US'],
			first_air_date: '2011-04-17',
		}

		const result = mapTvResult(tv)

		expect(result.tmdbId).toBe(1399)
		expect(result.title).toBe('Game of Thrones')
		expect(result.mediaType).toBe('tv')
		expect(result.posterPath).toBe('https://image.tmdb.org/t/p/w500/got.jpg')
		expect(result.backdropPath).toBe('https://image.tmdb.org/t/p/w780/got_backdrop.jpg')
		expect(result.releaseDate).toBe('2011-04-17')
		expect(result.voteAverage).toBe(9.0)
		expect(result.voteCount).toBe(20000)
		expect(result.genreIds).toEqual([18, 10765])
	})

	it('handles missing poster/backdrop', () => {
		const tv = {
			id: 1,
			media_type: 'tv' as const,
			popularity: 1,
			poster_path: undefined,
			backdrop_path: undefined,
			vote_count: 0,
			vote_average: 0,
			genre_ids: [],
			overview: '',
			original_language: 'en',
			name: 'No Poster Show',
			original_name: 'No Poster Show',
			origin_country: [],
			first_air_date: '',
		}

		const result = mapTvResult(tv)

		expect(result.posterPath).toBeUndefined()
		expect(result.backdropPath).toBeUndefined()
	})
})

describe('property-based tests', () => {
	it('mapMovieResult never throws for valid inputs', () => {
		fc.assert(
			fc.property(arbTmdbMovieResult, (movie) => {
				expect(() => mapMovieResult(movie)).not.toThrow()
			}),
		)
	})

	it('mapMovieResult always returns correct mediaType', () => {
		fc.assert(
			fc.property(arbTmdbMovieResult, (movie) => {
				const result = mapMovieResult(movie)
				expect(result.mediaType).toBe('movie')
			}),
		)
	})

	it('mapMovieResult preserves tmdbId', () => {
		fc.assert(
			fc.property(arbTmdbMovieResult, (movie) => {
				const result = mapMovieResult(movie)
				expect(result.tmdbId).toBe(movie.id)
			}),
		)
	})

	it('mapMovieResult preserves title', () => {
		fc.assert(
			fc.property(arbTmdbMovieResult, (movie) => {
				const result = mapMovieResult(movie)
				expect(result.title).toBe(movie.title)
			}),
		)
	})

	it('mapMovieResult poster URL has correct prefix when present', () => {
		fc.assert(
			fc.property(arbTmdbMovieResult, (movie) => {
				const result = mapMovieResult(movie)
				if (movie.poster_path) {
					expect(result.posterPath).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w500\//)
				} else {
					expect(result.posterPath).toBeUndefined()
				}
			}),
		)
	})

	it('mapMovieResult backdrop URL has correct prefix when present', () => {
		fc.assert(
			fc.property(arbTmdbMovieResult, (movie) => {
				const result = mapMovieResult(movie)
				if (movie.backdrop_path) {
					expect(result.backdropPath).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w780\//)
				} else {
					expect(result.backdropPath).toBeUndefined()
				}
			}),
		)
	})

	it('mapTvResult never throws for valid inputs', () => {
		fc.assert(
			fc.property(arbTmdbTvResult, (tv) => {
				expect(() => mapTvResult(tv)).not.toThrow()
			}),
		)
	})

	it('mapTvResult always returns correct mediaType', () => {
		fc.assert(
			fc.property(arbTmdbTvResult, (tv) => {
				const result = mapTvResult(tv)
				expect(result.mediaType).toBe('tv')
			}),
		)
	})

	it('mapTvResult preserves tmdbId', () => {
		fc.assert(
			fc.property(arbTmdbTvResult, (tv) => {
				const result = mapTvResult(tv)
				expect(result.tmdbId).toBe(tv.id)
			}),
		)
	})

	it('mapTvResult uses name as title', () => {
		fc.assert(
			fc.property(arbTmdbTvResult, (tv) => {
				const result = mapTvResult(tv)
				expect(result.title).toBe(tv.name)
			}),
		)
	})

	it('mapTvResult uses first_air_date as releaseDate', () => {
		fc.assert(
			fc.property(arbTmdbTvResult, (tv) => {
				const result = mapTvResult(tv)
				expect(result.releaseDate).toBe(tv.first_air_date)
			}),
		)
	})

	it('mapTvResult poster URL has correct prefix when present', () => {
		fc.assert(
			fc.property(arbTmdbTvResult, (tv) => {
				const result = mapTvResult(tv)
				if (tv.poster_path) {
					expect(result.posterPath).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w500\//)
				} else {
					expect(result.posterPath).toBeUndefined()
				}
			}),
		)
	})

	it('vote counts and averages are preserved', () => {
		fc.assert(
			fc.property(arbTmdbMovieResult, (movie) => {
				const result = mapMovieResult(movie)
				expect(result.voteCount).toBe(movie.vote_count)
				expect(result.voteAverage).toBe(movie.vote_average)
			}),
		)
	})

	it('genre_ids are preserved as-is', () => {
		fc.assert(
			fc.property(arbTmdbMovieResult, (movie) => {
				const result = mapMovieResult(movie)
				expect(result.genreIds).toEqual(movie.genre_ids)
			}),
		)
	})
})
