import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import { type SearchDeps, type SearchResponse, searchTmdbCore } from './search-core'

// Helper to create fresh mocks for each test
function createMockDeps() {
	const mockSearchMultiFn = vi.fn<(query: string, page: number) => Promise<SearchResponse>>()
	const deps: SearchDeps = { searchMultiFn: mockSearchMultiFn }
	return { mockSearchMultiFn, deps }
}

describe('searchTmdbCore', () => {
	describe('empty query handling', () => {
		it('returns empty results for empty string query', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()

			const result = await searchTmdbCore({ q: '' }, deps)

			expect(result).toEqual({
				movies: [],
				tv: [],
				page: 1,
				totalPages: 0,
				totalResults: 0,
			})
			expect(mockSearchMultiFn).not.toHaveBeenCalled()
		})

		it('returns empty results for whitespace-only query', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()

			const result = await searchTmdbCore({ q: '   ' }, deps)

			expect(result).toEqual({
				movies: [],
				tv: [],
				page: 1,
				totalPages: 0,
				totalResults: 0,
			})
			expect(mockSearchMultiFn).not.toHaveBeenCalled()
		})

		it('returns empty results for tab/newline whitespace', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()

			const result = await searchTmdbCore({ q: '\t\n  \r' }, deps)

			expect(result).toEqual({
				movies: [],
				tv: [],
				page: 1,
				totalPages: 0,
				totalResults: 0,
			})
			expect(mockSearchMultiFn).not.toHaveBeenCalled()
		})
	})

	describe('pagination', () => {
		it('passes page parameter to searchMultiFn', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()
			mockSearchMultiFn.mockResolvedValue({
				movies: [],
				tv: [],
				page: 3,
				totalPages: 10,
				totalResults: 200,
			})

			await searchTmdbCore({ q: 'test', page: 3 }, deps)

			expect(mockSearchMultiFn).toHaveBeenCalledWith('test', 3)
		})

		it('defaults to page 1 when not specified', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()
			mockSearchMultiFn.mockResolvedValue({
				movies: [],
				tv: [],
				page: 1,
				totalPages: 5,
				totalResults: 100,
			})

			await searchTmdbCore({ q: 'test' }, deps)

			expect(mockSearchMultiFn).toHaveBeenCalledWith('test', 1)
		})

		it('returns pagination info from searchMultiFn', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()
			mockSearchMultiFn.mockResolvedValue({
				movies: [],
				tv: [],
				page: 5,
				totalPages: 20,
				totalResults: 400,
			})

			const result = await searchTmdbCore({ q: 'matrix', page: 5 }, deps)

			expect(result.page).toBe(5)
			expect(result.totalPages).toBe(20)
			expect(result.totalResults).toBe(400)
		})
	})

	describe('movie vs TV result aggregation', () => {
		it('returns both movies and TV results from searchMultiFn', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()
			const mockResults: SearchResponse = {
				movies: [
					{
						tmdbId: 1,
						title: 'Movie 1',
						mediaType: 'movie',
						voteCount: 100,
						voteAverage: 7.5,
						genreIds: [28],
						releaseDate: '2020-01-01',
						overview: 'A movie',
					},
					{
						tmdbId: 2,
						title: 'Movie 2',
						mediaType: 'movie',
						voteCount: 50,
						voteAverage: 6.0,
						genreIds: [35],
						releaseDate: '2021-05-15',
						overview: 'Another movie',
					},
				],
				tv: [
					{
						tmdbId: 100,
						title: 'TV Show',
						mediaType: 'tv',
						voteCount: 200,
						voteAverage: 8.0,
						genreIds: [18],
						releaseDate: '2019-06-01',
						overview: 'A TV show',
					},
				],
				page: 1,
				totalPages: 1,
				totalResults: 3,
			}
			mockSearchMultiFn.mockResolvedValue(mockResults)

			const result = await searchTmdbCore({ q: 'test' }, deps)

			expect(result.movies).toHaveLength(2)
			expect(result.tv).toHaveLength(1)
			expect(result.movies[0].mediaType).toBe('movie')
			expect(result.tv[0].mediaType).toBe('tv')
		})

		it('separates movie and TV results correctly', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()
			const mockResults: SearchResponse = {
				movies: [
					{
						tmdbId: 27205,
						title: 'Inception',
						mediaType: 'movie',
						voteCount: 100,
						voteAverage: 8.5,
						genreIds: [28, 878],
						releaseDate: '2010-07-16',
						overview: 'A dream heist',
					},
				],
				tv: [
					{
						tmdbId: 1396,
						title: 'Breaking Bad',
						mediaType: 'tv',
						voteCount: 200,
						voteAverage: 9.0,
						genreIds: [18, 80],
						releaseDate: '2008-01-20',
						overview: 'A chemistry teacher',
					},
				],
				page: 1,
				totalPages: 1,
				totalResults: 2,
			}
			mockSearchMultiFn.mockResolvedValue(mockResults)

			const result = await searchTmdbCore({ q: 'Breaking' }, deps)

			expect(result.movies.every((m) => m.mediaType === 'movie')).toBe(true)
			expect(result.tv.every((t) => t.mediaType === 'tv')).toBe(true)
		})

		it('handles response with only movies', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()
			const mockResults: SearchResponse = {
				movies: [
					{
						tmdbId: 1,
						title: 'Solo Movie',
						mediaType: 'movie',
						voteCount: 50,
						voteAverage: 6.5,
						genreIds: [],
						releaseDate: '2022-01-01',
						overview: 'Only movie',
					},
				],
				tv: [],
				page: 1,
				totalPages: 1,
				totalResults: 1,
			}
			mockSearchMultiFn.mockResolvedValue(mockResults)

			const result = await searchTmdbCore({ q: 'solo' }, deps)

			expect(result.movies).toHaveLength(1)
			expect(result.tv).toHaveLength(0)
		})

		it('handles response with only TV shows', async () => {
			const { mockSearchMultiFn, deps } = createMockDeps()
			const mockResults: SearchResponse = {
				movies: [],
				tv: [
					{
						tmdbId: 1,
						title: 'Solo TV',
						mediaType: 'tv',
						voteCount: 100,
						voteAverage: 7.0,
						genreIds: [],
						releaseDate: '2021-01-01',
						overview: 'Only TV',
					},
				],
				page: 1,
				totalPages: 1,
				totalResults: 1,
			}
			mockSearchMultiFn.mockResolvedValue(mockResults)

			const result = await searchTmdbCore({ q: 'only tv' }, deps)

			expect(result.movies).toHaveLength(0)
			expect(result.tv).toHaveLength(1)
		})
	})

	describe('property-based tests', () => {
		// Whitespace strings - spaces, tabs, newlines
		const arbWhitespace = fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 20 }).map((arr) => arr.join(''))

		it('never calls searchMultiFn for whitespace-only queries', async () => {
			await fc.assert(
				fc.asyncProperty(arbWhitespace, async (whitespace) => {
					const { mockSearchMultiFn, deps } = createMockDeps()
					await searchTmdbCore({ q: whitespace }, deps)
					expect(mockSearchMultiFn).not.toHaveBeenCalled()
				}),
				{ numRuns: 50 },
			)
		})

		it('returns consistent empty response structure for empty queries', async () => {
			await fc.assert(
				fc.asyncProperty(arbWhitespace, async (whitespace) => {
					const { deps } = createMockDeps()
					const result = await searchTmdbCore({ q: whitespace }, deps)
					expect(result.movies).toEqual([])
					expect(result.tv).toEqual([])
					expect(result.page).toBe(1)
					expect(result.totalPages).toBe(0)
					expect(result.totalResults).toBe(0)
				}),
				{ numRuns: 50 },
			)
		})

		// Non-empty query (has at least one non-whitespace char)
		const arbNonEmptyQuery = fc
			.tuple(
				arbWhitespace,
				fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
				arbWhitespace,
			)
			.map(([pre, mid, post]) => pre + mid + post)

		it('calls searchMultiFn for non-empty queries', async () => {
			await fc.assert(
				fc.asyncProperty(arbNonEmptyQuery, async (query) => {
					const { mockSearchMultiFn, deps } = createMockDeps()
					mockSearchMultiFn.mockResolvedValue({
						movies: [],
						tv: [],
						page: 1,
						totalPages: 0,
						totalResults: 0,
					})
					await searchTmdbCore({ q: query }, deps)
					expect(mockSearchMultiFn).toHaveBeenCalled()
				}),
				{ numRuns: 50 },
			)
		})

		it('passes correct page to searchMultiFn', async () => {
			await fc.assert(
				fc.asyncProperty(arbNonEmptyQuery, fc.integer({ min: 1, max: 100 }), async (query, page) => {
					const { mockSearchMultiFn, deps } = createMockDeps()
					mockSearchMultiFn.mockResolvedValue({
						movies: [],
						tv: [],
						page,
						totalPages: 100,
						totalResults: 2000,
					})
					await searchTmdbCore({ q: query, page }, deps)
					expect(mockSearchMultiFn).toHaveBeenCalledWith(query, page)
				}),
				{ numRuns: 50 },
			)
		})
	})
})
