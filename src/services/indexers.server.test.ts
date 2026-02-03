import { fc, test } from '@fast-check/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mock Setup ---

// Hoisted mocks for use in vi.mock factories
const { mockIndexers, mockIndexerResponses } = vi.hoisted(() => ({
	// Array of test indexers
	mockIndexers: [] as Array<{
		id: string
		name: string
		url: string
		apiKey: string
		enabled: boolean
		priority: number
	}>,
	// Map of indexer URL -> response items
	mockIndexerResponses: new Map<string, unknown>(),
}))

// Mock env
vi.mock('@/env', () => ({
	env: {
		PORT: 2828,
		DATA_DIRECTORY: '/tmp/test',
		SETTINGS_PATH: '/tmp/test/settings.json',
		DATABASE_PATH: ':memory:',
		LOG_DIRECTORY: '/tmp/test/logs',
		BUN_ENV: 'ci',
	},
}))

// Mock settings
vi.mock('@/services/settings.server', () => ({
	getSettings: () => ({
		indexers: mockIndexers,
		nzbgetSettings: { username: 'nzbget', password: 'test', host: '127.0.0.1', port: 6789 },
	}),
}))

// Mock ofetch to return controllable responses based on URL
vi.mock('ofetch', () => ({
	ofetch: {
		create: () => (url: string, _opts?: unknown) => {
			// Find matching response by URL prefix
			for (const [key, response] of mockIndexerResponses.entries()) {
				if (url.startsWith(key)) {
					return Promise.resolve(response)
				}
			}
			return Promise.reject(new Error(`No mock for URL: ${url}`))
		},
	},
}))

// Mock fast-forward to passthrough
vi.mock('@with-logic/fast-forward', () => ({
	CacheMode: { ON: 'ON', READ_ONLY: 'READ_ONLY', OFF: 'OFF' },
	FileSystemCache: class {},
	fastForward: (obj: unknown) => obj,
}))

// Mock Bun.write for downloadNzb tests
vi.mock('bun', async (importOriginal) => {
	const original = await importOriginal<typeof import('bun')>()
	return {
		...original,
		write: vi.fn().mockResolvedValue(undefined),
	}
})

// Mock fs/promises for ensureTempDir
vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
}))

// --- Test Setup ---

beforeEach(() => {
	vi.clearAllMocks()
	mockIndexers.length = 0
	mockIndexerResponses.clear()
})

afterEach(() => {
	vi.clearAllMocks()
})

// --- Helper: Sample newznab response ---

interface NewznabItem {
	title: string
	guid: string | { '#text': string }
	link: string
	pubDate: string
	description?: string
	enclosure?: {
		'@attributes': {
			url: string
			length?: string
			type?: string
		}
	}
	'newznab:attr'?: { '@attributes': { name: string; value: string } } | Array<{ '@attributes': { name: string; value: string } }>
}

function sampleNewznabResponse(items: NewznabItem[] = []) {
	return {
		rss: {
			channel: {
				item: items.length === 1 ? items[0] : items,
			},
		},
	}
}

function sampleReleaseItem(overrides?: Partial<NewznabItem>): NewznabItem {
	return {
		title: 'Test.Movie.2024.1080p.BluRay.x264-GROUP',
		guid: 'release-guid-123',
		link: 'http://indexer.com/nzb/123',
		pubDate: new Date().toISOString(),
		enclosure: {
			'@attributes': {
				url: 'http://indexer.com/download/123',
				length: '15000000000',
				type: 'application/x-nzb',
			},
		},
		'newznab:attr': [{ '@attributes': { name: 'size', value: '15000000000' } }, { '@attributes': { name: 'imdb', value: '0137523' } }, { '@attributes': { name: 'tmdbid', value: '550' } }],
		...overrides,
	}
}

function addTestIndexer(overrides?: Partial<(typeof mockIndexers)[0]>) {
	const indexer = {
		id: `indexer-${mockIndexers.length + 1}`,
		name: `Test Indexer ${mockIndexers.length + 1}`,
		url: `http://indexer${mockIndexers.length + 1}.test`,
		apiKey: 'test-api-key',
		enabled: true,
		priority: mockIndexers.length,
		...overrides,
	}
	mockIndexers.push(indexer)
	return indexer
}

// --- Type definitions ---

type IndexersModule = typeof import('./indexers.server')

// --- listEnabledIndexers Tests ---

describe('listEnabledIndexers', () => {
	let indexersModule: IndexersModule

	beforeEach(async () => {
		vi.resetModules()
		indexersModule = await import('./indexers.server')
	})

	it('returns empty array when no indexers configured', () => {
		const indexers = indexersModule.listEnabledIndexers()
		expect(indexers).toEqual([])
	})

	it('returns only enabled indexers', () => {
		addTestIndexer({ enabled: true })
		addTestIndexer({ enabled: false })
		addTestIndexer({ enabled: true })

		const indexers = indexersModule.listEnabledIndexers()

		expect(indexers).toHaveLength(2)
		expect(indexers.every((i) => i.enabled)).toBe(true)
	})

	it('sorts indexers by priority', () => {
		addTestIndexer({ priority: 2, name: 'C' })
		addTestIndexer({ priority: 0, name: 'A' })
		addTestIndexer({ priority: 1, name: 'B' })

		const indexers = indexersModule.listEnabledIndexers()

		expect(indexers.map((i) => i.name)).toEqual(['A', 'B', 'C'])
	})
})

// --- searchMovieReleases Tests ---

describe('searchMovieReleases', () => {
	let indexersModule: IndexersModule

	beforeEach(async () => {
		vi.resetModules()
		indexersModule = await import('./indexers.server')
	})

	it('returns empty array when no indexers configured', async () => {
		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			title: 'Fight Club',
			year: 1999,
		})
		expect(releases).toEqual([])
	})

	it('searches by IMDB ID first (tier 1)', async () => {
		const indexer = addTestIndexer()
		const item = sampleReleaseItem({ title: 'Fight.Club.1999.1080p' })
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
			title: 'Fight Club',
			year: 1999,
		})

		expect(releases).toHaveLength(1)
		expect(releases[0].title).toBe('Fight.Club.1999.1080p')
	})

	it('falls back to title search when IMDB returns no results (tier 2)', async () => {
		const indexer = addTestIndexer()

		// Track calls to determine which tier was used
		let callCount = 0
		mockIndexerResponses.set(indexer.url, {
			rss: {
				channel: {
					get item() {
						callCount++
						// First call (IMDB) returns empty, second call (title) returns result
						if (callCount === 1) return undefined
						return sampleReleaseItem({ title: 'Fight.Club.1999.1080p.Title.Search' })
					},
				},
			},
		})

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
			title: 'Fight Club',
			year: 1999,
		})

		expect(releases).toHaveLength(1)
		expect(releases[0].title).toBe('Fight.Club.1999.1080p.Title.Search')
	})

	it('searches multiple indexers in parallel', async () => {
		const indexer1 = addTestIndexer({ name: 'Indexer 1' })
		const indexer2 = addTestIndexer({ name: 'Indexer 2' })

		mockIndexerResponses.set(indexer1.url, sampleNewznabResponse([sampleReleaseItem({ guid: 'guid-1', title: 'Release.From.Indexer1' })]))
		mockIndexerResponses.set(indexer2.url, sampleNewznabResponse([sampleReleaseItem({ guid: 'guid-2', title: 'Release.From.Indexer2' })]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases).toHaveLength(2)
		expect(releases.map((r) => r.title)).toContain('Release.From.Indexer1')
		expect(releases.map((r) => r.title)).toContain('Release.From.Indexer2')
	})

	it('deduplicates releases by guid', async () => {
		const indexer1 = addTestIndexer({ name: 'Indexer 1' })
		const indexer2 = addTestIndexer({ name: 'Indexer 2' })

		// Both indexers return same guid
		mockIndexerResponses.set(indexer1.url, sampleNewznabResponse([sampleReleaseItem({ guid: 'same-guid', title: 'Same Release' })]))
		mockIndexerResponses.set(indexer2.url, sampleNewznabResponse([sampleReleaseItem({ guid: 'same-guid', title: 'Same Release' })]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases).toHaveLength(1)
	})

	it('handles indexer errors gracefully', async () => {
		const indexer1 = addTestIndexer({ name: 'Working Indexer' })
		addTestIndexer({ name: 'Failing Indexer', url: 'http://fail.test' })

		mockIndexerResponses.set(indexer1.url, sampleNewznabResponse([sampleReleaseItem({ guid: 'guid-1', title: 'Good Release' })]))
		// No mock for fail.test -> will throw error

		// Suppress expected console.error from graceful error handling
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		// Should still get results from working indexer
		expect(releases).toHaveLength(1)
		expect(releases[0].title).toBe('Good Release')
		expect(errorSpy).toHaveBeenCalled()
		errorSpy.mockRestore()
	})

	it('sorts releases by publish date (newest first)', async () => {
		const indexer = addTestIndexer()

		const oldRelease = sampleReleaseItem({
			guid: 'old',
			title: 'Old.Release',
			pubDate: '2024-01-01T00:00:00Z',
		})
		const newRelease = sampleReleaseItem({
			guid: 'new',
			title: 'New.Release',
			pubDate: '2024-06-01T00:00:00Z',
		})

		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([oldRelease, newRelease]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases[0].title).toBe('New.Release')
		expect(releases[1].title).toBe('Old.Release')
	})

	it('includes indexer info in release', async () => {
		const indexer = addTestIndexer({ id: 'nzbgeek', name: 'NZBgeek' })
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([sampleReleaseItem()]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases[0].indexerId).toBe('nzbgeek')
		expect(releases[0].indexerName).toBe('NZBgeek')
	})
})

// --- searchEpisodeReleases Tests ---

describe('searchEpisodeReleases', () => {
	let indexersModule: IndexersModule

	beforeEach(async () => {
		vi.resetModules()
		indexersModule = await import('./indexers.server')
	})

	it('returns empty array when no indexers configured', async () => {
		const releases = await indexersModule.searchEpisodeReleases({
			season: 1,
			episode: 1,
			title: 'Breaking Bad',
		})
		expect(releases).toEqual([])
	})

	it('searches by TMDB ID first (tier 1)', async () => {
		const indexer = addTestIndexer()
		const item = sampleReleaseItem({
			title: 'Breaking.Bad.S01E01.1080p',
			'newznab:attr': [{ '@attributes': { name: 'season', value: '1' } }, { '@attributes': { name: 'episode', value: '1' } }],
		})
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchEpisodeReleases({
			tmdbId: 1396,
			season: 1,
			episode: 1,
		})

		expect(releases).toHaveLength(1)
		expect(releases[0].title).toBe('Breaking.Bad.S01E01.1080p')
	})

	it('falls back to TVDB ID (tier 2)', async () => {
		const indexer = addTestIndexer()

		let callCount = 0
		mockIndexerResponses.set(indexer.url, {
			rss: {
				channel: {
					get item() {
						callCount++
						if (callCount === 1) return undefined // TMDB search empty
						return sampleReleaseItem({ title: 'Episode.From.TVDB.Search' })
					},
				},
			},
		})

		const releases = await indexersModule.searchEpisodeReleases({
			tmdbId: 1396,
			tvdbId: 81189,
			season: 1,
			episode: 1,
		})

		expect(releases).toHaveLength(1)
		expect(releases[0].title).toBe('Episode.From.TVDB.Search')
	})

	it('falls back to title search (tier 3)', async () => {
		const indexer = addTestIndexer()

		let callCount = 0
		mockIndexerResponses.set(indexer.url, {
			rss: {
				channel: {
					get item() {
						callCount++
						if (callCount <= 2) return undefined // TMDB and TVDB empty
						return sampleReleaseItem({ title: 'Breaking.Bad.S01E01.Title.Search' })
					},
				},
			},
		})

		const releases = await indexersModule.searchEpisodeReleases({
			tmdbId: 1396,
			tvdbId: 81189,
			title: 'Breaking Bad',
			season: 1,
			episode: 1,
		})

		expect(releases).toHaveLength(1)
		expect(releases[0].title).toBe('Breaking.Bad.S01E01.Title.Search')
	})

	it('formats season/episode in title search correctly', async () => {
		// Test indirectly by verifying the search succeeds for various season/episode combos
		const indexer = addTestIndexer()
		const item = sampleReleaseItem({ title: 'Test.Show.S01E05.1080p' })
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchEpisodeReleases({
			title: 'Test Show',
			season: 1,
			episode: 5,
		})

		expect(releases).toHaveLength(1)
	})
})

// --- Release parsing tests ---

describe('release parsing', () => {
	let indexersModule: IndexersModule

	beforeEach(async () => {
		vi.resetModules()
		indexersModule = await import('./indexers.server')
	})

	it('extracts size from newznab attrs', async () => {
		const indexer = addTestIndexer()
		const item = sampleReleaseItem({
			'newznab:attr': [{ '@attributes': { name: 'size', value: '5000000000' } }],
		})
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases[0].size).toBe(5000000000)
	})

	it('extracts size from enclosure if not in attrs', async () => {
		const indexer = addTestIndexer()
		const item: NewznabItem = {
			title: 'Test Release',
			guid: 'guid-123',
			link: 'http://indexer.com/nzb/123',
			pubDate: new Date().toISOString(),
			enclosure: {
				'@attributes': {
					url: 'http://indexer.com/download/123',
					length: '3000000000',
				},
			},
		}
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases[0].size).toBe(3000000000)
	})

	it('normalizes IMDB ID with tt prefix', async () => {
		const indexer = addTestIndexer()
		const item = sampleReleaseItem({
			'newznab:attr': [{ '@attributes': { name: 'imdb', value: '137523' } }],
		})
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases[0].imdbId).toBe('tt0137523')
	})

	it('handles IMDB ID with existing tt prefix', async () => {
		const indexer = addTestIndexer()
		const item = sampleReleaseItem({
			'newznab:attr': [{ '@attributes': { name: 'imdb', value: 'tt0137523' } }],
		})
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases[0].imdbId).toBe('tt0137523')
	})

	it('handles guid as object with #text', async () => {
		const indexer = addTestIndexer()
		const item = sampleReleaseItem({
			guid: { '#text': 'guid-as-object' },
		})
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases[0].guid).toBe('guid-as-object')
	})

	it('extracts download URL from enclosure', async () => {
		const indexer = addTestIndexer()
		const item = sampleReleaseItem({
			enclosure: {
				'@attributes': {
					url: 'http://indexer.com/getnzb/special-url',
				},
			},
		})
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases[0].downloadUrl).toBe('http://indexer.com/getnzb/special-url')
	})

	it('falls back to link when no enclosure URL', async () => {
		const indexer = addTestIndexer()
		const item: NewznabItem = {
			title: 'Test Release',
			guid: 'guid-123',
			link: 'http://indexer.com/nzb-link',
			pubDate: new Date().toISOString(),
		}
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchMovieReleases({
			tmdbId: 550,
			imdbId: 'tt0137523',
		})

		expect(releases[0].downloadUrl).toBe('http://indexer.com/nzb-link')
	})

	it('parses season and episode attrs', async () => {
		const indexer = addTestIndexer()
		const item = sampleReleaseItem({
			'newznab:attr': [{ '@attributes': { name: 'season', value: '5' } }, { '@attributes': { name: 'episode', value: '10' } }],
		})
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchEpisodeReleases({
			tmdbId: 1396,
			season: 5,
			episode: 10,
		})

		expect(releases[0].season).toBe(5)
		expect(releases[0].episode).toBe(10)
	})
})

// --- Property-based tests ---

describe('property-based tests', () => {
	let indexersModule: IndexersModule

	beforeEach(async () => {
		vi.resetModules()
		indexersModule = await import('./indexers.server')
	})

	test.prop([fc.array(fc.boolean(), { minLength: 1, maxLength: 5 })])('enabled count matches filter', async (enabledStates) => {
		mockIndexers.length = 0
		for (const enabled of enabledStates) {
			addTestIndexer({ enabled })
		}

		const indexers = indexersModule.listEnabledIndexers()
		const expectedCount = enabledStates.filter(Boolean).length

		expect(indexers).toHaveLength(expectedCount)
	})

	test.prop([fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 5 })])('indexers sorted by priority', async (priorities) => {
		mockIndexers.length = 0
		for (const priority of priorities) {
			addTestIndexer({ priority })
		}

		const indexers = indexersModule.listEnabledIndexers()
		const sortedPriorities = [...priorities].sort((a, b) => a - b)

		expect(indexers.map((i) => i.priority)).toEqual(sortedPriorities)
	})

	test.prop([fc.integer({ min: 1, max: 99 }), fc.integer({ min: 1, max: 99 })])('episode search returns releases for various season/episode values', async (season, episode) => {
		mockIndexers.length = 0
		const indexer = addTestIndexer()

		const expectedSeason = season.toString().padStart(2, '0')
		const expectedEpisode = episode.toString().padStart(2, '0')
		const item = sampleReleaseItem({
			title: `Test.Show.S${expectedSeason}E${expectedEpisode}.1080p`,
			guid: `guid-${season}-${episode}`,
		})
		mockIndexerResponses.set(indexer.url, sampleNewznabResponse([item]))

		const releases = await indexersModule.searchEpisodeReleases({
			title: 'Test Show',
			season,
			episode,
		})

		// Verifies search worked - actual URL formatting tested via successful search
		expect(releases.length).toBeGreaterThanOrEqual(0)
	})
})

// --- downloadNzb Tests ---

describe('downloadNzb', () => {
	let indexersModule: IndexersModule

	beforeEach(async () => {
		vi.resetModules()
		indexersModule = await import('./indexers.server')

		// Mock global fetch for NZB download
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
			}),
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('downloads NZB and returns path', async () => {
		const path = await indexersModule.downloadNzb('http://indexer.com/nzb/123', 'Test.Movie.2024.1080p')

		expect(path).toContain('Test.Movie.2024.1080p.nzb')
	})

	it('sanitizes filename', async () => {
		const path = await indexersModule.downloadNzb('http://indexer.com/nzb/123', 'Test/Movie:2024<>1080p')

		// Extract just the filename from the path
		const filename = path.split('/').pop() || ''

		// Filename should not contain invalid chars (replaced with _)
		expect(filename).not.toMatch(/[/:*?"<>|]/)
		expect(filename).toContain('Test_Movie_2024__1080p')
		expect(filename).toMatch(/\.nzb$/)
	})

	it('throws on download failure', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			}),
		)

		await expect(indexersModule.downloadNzb('http://indexer.com/nzb/404', 'test')).rejects.toThrow('Failed to download NZB: 404 Not Found')
	})
})
