import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StubIndexerServer, type StubRelease } from '../../test/helpers'

// Mock settings module before importing indexers
vi.mock('@/services/settings.server', () => ({
	getSettings: vi.fn(),
}))

import { getSettings } from '@/services/settings.server'
import { downloadNzb, listEnabledIndexers, searchEpisodeReleases, searchMovieReleases } from './indexers'

describe('Indexer Service Integration', () => {
	let indexerServer: StubIndexerServer

	beforeEach(async () => {
		indexerServer = new StubIndexerServer()
		await indexerServer.start()

		// Configure mock settings to use stub server
		vi.mocked(getSettings).mockReturnValue({
			indexers: [
				{
					id: 'test-indexer-1',
					name: 'TestIndexer',
					url: indexerServer.url,
					apiKey: indexerServer.apiKey,
					enabled: true,
					priority: 1,
				},
			],
			folders: { movies: [], tv: [] },
			downloadFolder: '',
			usenetServers: [],
			resolutions: [],
			defaultQuality: '1080p',
			languageSettings: {
				subtitleLanguages: [],
				audioLanguages: [],
				preferOriginalAudio: true,
				acceptAnyAudioFallback: true,
			},
			formatSettings: { codecs: [], hdrFormats: [], audioFormats: [] },
			authSettings: { enabled: false, method: 'none', username: '', apiKey: '' },
			nzbgetSettings: { username: 'nzbget', password: 'nzbget', host: '127.0.0.1', port: 6789 },
			tmdbApiKey: 'test-key',
		})
	})

	afterEach(async () => {
		await indexerServer.stop()
		vi.clearAllMocks()
	})

	describe('listEnabledIndexers', () => {
		it('returns enabled indexers sorted by priority', () => {
			vi.mocked(getSettings).mockReturnValue({
				indexers: [
					{ id: 'idx-3', name: 'Third', url: 'http://c.test', apiKey: 'key3', enabled: true, priority: 3 },
					{ id: 'idx-1', name: 'First', url: 'http://a.test', apiKey: 'key1', enabled: true, priority: 1 },
					{ id: 'idx-2', name: 'Second', url: 'http://b.test', apiKey: 'key2', enabled: false, priority: 2 },
				],
				folders: { movies: [], tv: [] },
				downloadFolder: '',
				usenetServers: [],
				resolutions: [],
				defaultQuality: '1080p',
				languageSettings: {
					subtitleLanguages: [],
					audioLanguages: [],
					preferOriginalAudio: true,
					acceptAnyAudioFallback: true,
				},
				formatSettings: { codecs: [], hdrFormats: [], audioFormats: [] },
				authSettings: { enabled: false, method: 'none', username: '', apiKey: '' },
				nzbgetSettings: { username: 'nzbget', password: 'nzbget', host: '127.0.0.1', port: 6789 },
				tmdbApiKey: 'test-key',
			})

			const indexers = listEnabledIndexers()

			expect(indexers).toHaveLength(2)
			expect(indexers[0].name).toBe('First')
			expect(indexers[1].name).toBe('Third')
		})

		it('returns empty array when no indexers enabled', () => {
			vi.mocked(getSettings).mockReturnValue({
				indexers: [{ id: 'idx-1', name: 'Disabled', url: 'http://a.test', apiKey: 'key', enabled: false, priority: 1 }],
				folders: { movies: [], tv: [] },
				downloadFolder: '',
				usenetServers: [],
				resolutions: [],
				defaultQuality: '1080p',
				languageSettings: {
					subtitleLanguages: [],
					audioLanguages: [],
					preferOriginalAudio: true,
					acceptAnyAudioFallback: true,
				},
				formatSettings: { codecs: [], hdrFormats: [], audioFormats: [] },
				authSettings: { enabled: false, method: 'none', username: '', apiKey: '' },
				nzbgetSettings: { username: 'nzbget', password: 'nzbget', host: '127.0.0.1', port: 6789 },
				tmdbApiKey: 'test-key',
			})

			const indexers = listEnabledIndexers()
			expect(indexers).toHaveLength(0)
		})
	})

	describe('Newznab API response parsing', () => {
		it('parses single release response', async () => {
			indexerServer.addRelease({
				title: 'Inception.2010.1080p.BluRay.x264',
				guid: 'abc123',
				link: `${indexerServer.url}/details/abc123`,
				downloadUrl: `${indexerServer.url}/nzb/abc123`,
				size: 8_500_000_000,
				pubDate: '2023-06-15T12:00:00Z',
				imdbId: 'tt1375666',
				tmdbId: 27205,
			})

			const releases = await searchMovieReleases({ tmdbId: 27205, imdbId: 'tt1375666' })

			expect(releases).toHaveLength(1)
			expect(releases[0].title).toBe('Inception.2010.1080p.BluRay.x264')
			expect(releases[0].guid).toBe('abc123')
			expect(releases[0].size).toBe(8_500_000_000)
			expect(releases[0].imdbId).toBe('tt1375666')
			expect(releases[0].tmdbId).toBe(27205)
		})

		it('parses multiple releases response', async () => {
			indexerServer.addReleases([
				{
					title: 'Inception.2010.720p.BluRay',
					guid: 'release-1',
					link: `${indexerServer.url}/details/1`,
					downloadUrl: `${indexerServer.url}/nzb/1`,
					size: 4_000_000_000,
					pubDate: '2023-06-14T12:00:00Z',
					imdbId: 'tt1375666',
				},
				{
					title: 'Inception.2010.1080p.BluRay',
					guid: 'release-2',
					link: `${indexerServer.url}/details/2`,
					downloadUrl: `${indexerServer.url}/nzb/2`,
					size: 8_500_000_000,
					pubDate: '2023-06-15T12:00:00Z',
					imdbId: 'tt1375666',
				},
				{
					title: 'Inception.2010.2160p.UHD',
					guid: 'release-3',
					link: `${indexerServer.url}/details/3`,
					downloadUrl: `${indexerServer.url}/nzb/3`,
					size: 25_000_000_000,
					pubDate: '2023-06-16T12:00:00Z',
					imdbId: 'tt1375666',
				},
			])

			const releases = await searchMovieReleases({ tmdbId: 27205, imdbId: 'tt1375666' })

			expect(releases).toHaveLength(3)
			// Should be sorted by pubDate newest first
			expect(releases[0].title).toBe('Inception.2010.2160p.UHD')
			expect(releases[1].title).toBe('Inception.2010.1080p.BluRay')
			expect(releases[2].title).toBe('Inception.2010.720p.BluRay')
		})

		it('parses empty response correctly', async () => {
			// No releases added to server
			const releases = await searchMovieReleases({ tmdbId: 99999, imdbId: 'tt9999999' })

			expect(releases).toHaveLength(0)
		})
	})

	describe('Search result normalization', () => {
		it('normalizes release with all attributes', async () => {
			const testRelease: StubRelease = {
				title: 'Breaking.Bad.S01E01.720p.BluRay',
				guid: 'tv-release-1',
				link: `${indexerServer.url}/details/tv1`,
				downloadUrl: `${indexerServer.url}/nzb/tv1`,
				size: 1_200_000_000,
				pubDate: '2023-05-10T08:00:00Z',
				tvdbId: 81189,
				tmdbId: 1396,
				season: 1,
				episode: 1,
			}
			indexerServer.addRelease(testRelease)

			const releases = await searchEpisodeReleases({ tmdbId: 1396, season: 1, episode: 1 })

			expect(releases).toHaveLength(1)
			const release = releases[0]
			expect(release.indexerId).toBe('test-indexer-1')
			expect(release.indexerName).toBe('TestIndexer')
			expect(release.downloadUrl).toBe(`${indexerServer.url}/nzb/tv1`)
			expect(release.infoUrl).toBe(`${indexerServer.url}/details/tv1`)
			expect(release.tvdbId).toBe(81189)
			expect(release.season).toBe(1)
			expect(release.episode).toBe(1)
			expect(release.publishDate).toEqual(new Date('2023-05-10T08:00:00Z'))
		})

		it('handles missing optional attributes', async () => {
			// Title includes "SomeMovie 2023" to match the search query format
			indexerServer.addRelease({
				title: 'SomeMovie 2023 WEBRip x264',
				guid: 'minimal-1',
				link: `${indexerServer.url}/details/min1`,
				downloadUrl: `${indexerServer.url}/nzb/min1`,
				size: 2_000_000_000,
				pubDate: '2023-07-01T00:00:00Z',
				// No tmdbId, imdbId, tvdbId, season, episode
			})

			// Search with title - will search for "SomeMovie 2023" after tier 1 fails
			const releases = await searchMovieReleases({ tmdbId: 12345, title: 'SomeMovie', year: 2023 })

			expect(releases).toHaveLength(1)
			const release = releases[0]
			expect(release.tmdbId).toBeUndefined()
			expect(release.imdbId).toBeUndefined()
			expect(release.tvdbId).toBeUndefined()
			expect(release.season).toBeUndefined()
			expect(release.episode).toBeUndefined()
		})

		it('normalizes IMDB ID format from various inputs', async () => {
			// Add release with short numeric IMDB (some indexers omit padding/prefix)
			indexerServer.addRelease({
				title: 'Test.Movie.2020',
				guid: 'imdb-test-1',
				link: `${indexerServer.url}/details/imdb1`,
				downloadUrl: `${indexerServer.url}/nzb/imdb1`,
				size: 5_000_000_000,
				pubDate: '2023-01-01T00:00:00Z',
				imdbId: '1234567', // Without tt prefix
			})

			const releases = await searchMovieReleases({ tmdbId: 1, imdbId: '1234567' })

			expect(releases).toHaveLength(1)
			// Should be normalized to tt-prefixed, 7-digit format
			expect(releases[0].imdbId).toBe('tt1234567')
		})
	})

	describe('Attribute extraction from Newznab response', () => {
		it('extracts size from enclosure length', async () => {
			indexerServer.addRelease({
				title: 'Movie.With.Enclosure.Size',
				guid: 'enclosure-test',
				link: `${indexerServer.url}/details/enc1`,
				downloadUrl: `${indexerServer.url}/nzb/enc1`,
				size: 7_777_777_777,
				pubDate: '2023-02-02T00:00:00Z',
			})

			const releases = await searchMovieReleases({ tmdbId: 1, title: 'Movie' })

			expect(releases).toHaveLength(1)
			expect(releases[0].size).toBe(7_777_777_777)
		})

		it('extracts download URL from enclosure', async () => {
			const downloadUrl = `${indexerServer.url}/nzb/custom-download`
			indexerServer.addRelease({
				title: 'Movie.Download.URL',
				guid: 'url-test',
				link: `${indexerServer.url}/details/url1`,
				downloadUrl,
				size: 1_000_000_000,
				pubDate: '2023-03-03T00:00:00Z',
			})

			const releases = await searchMovieReleases({ tmdbId: 1, title: 'Movie' })

			expect(releases).toHaveLength(1)
			expect(releases[0].downloadUrl).toBe(downloadUrl)
		})

		it('correctly parses publish date', async () => {
			const pubDate = '2023-08-15T14:30:00Z'
			indexerServer.addRelease({
				title: 'Movie.PubDate.Test',
				guid: 'date-test',
				link: `${indexerServer.url}/details/date1`,
				downloadUrl: `${indexerServer.url}/nzb/date1`,
				size: 1_000_000_000,
				pubDate,
			})

			const releases = await searchMovieReleases({ tmdbId: 1, title: 'Movie' })

			expect(releases).toHaveLength(1)
			expect(releases[0].publishDate).toEqual(new Date(pubDate))
		})
	})

	describe('Network error handling', () => {
		it('returns empty array on HTTP 500 error', async () => {
			indexerServer.setFailureMode('http500')

			const releases = await searchMovieReleases({ tmdbId: 27205, imdbId: 'tt1375666' })

			expect(releases).toHaveLength(0)
		})

		it('returns empty array on network error', async () => {
			indexerServer.setFailureMode('network')

			const releases = await searchMovieReleases({ tmdbId: 27205, imdbId: 'tt1375666' })

			expect(releases).toHaveLength(0)
		})

		it('returns empty array on invalid JSON response', async () => {
			indexerServer.setFailureMode('invalidJson')

			const releases = await searchMovieReleases({ tmdbId: 27205, imdbId: 'tt1375666' })

			expect(releases).toHaveLength(0)
		})

		it('continues searching other indexers when one fails', async () => {
			// Add a second indexer that works
			const secondServer = new StubIndexerServer()
			await secondServer.start()

			secondServer.addRelease({
				title: 'Inception.2010.1080p.BluRay',
				guid: 'working-release',
				link: `${secondServer.url}/details/1`,
				downloadUrl: `${secondServer.url}/nzb/1`,
				size: 8_500_000_000,
				pubDate: '2023-06-15T12:00:00Z',
				imdbId: 'tt1375666',
			})

			vi.mocked(getSettings).mockReturnValue({
				indexers: [
					{
						id: 'failing-indexer',
						name: 'FailingIndexer',
						url: indexerServer.url,
						apiKey: indexerServer.apiKey,
						enabled: true,
						priority: 1,
					},
					{
						id: 'working-indexer',
						name: 'WorkingIndexer',
						url: secondServer.url,
						apiKey: secondServer.apiKey,
						enabled: true,
						priority: 2,
					},
				],
				folders: { movies: [], tv: [] },
				downloadFolder: '',
				usenetServers: [],
				resolutions: [],
				defaultQuality: '1080p',
				languageSettings: {
					subtitleLanguages: [],
					audioLanguages: [],
					preferOriginalAudio: true,
					acceptAnyAudioFallback: true,
				},
				formatSettings: { codecs: [], hdrFormats: [], audioFormats: [] },
				authSettings: { enabled: false, method: 'none', username: '', apiKey: '' },
				nzbgetSettings: { username: 'nzbget', password: 'nzbget', host: '127.0.0.1', port: 6789 },
				tmdbApiKey: 'test-key',
			})

			// First indexer fails
			indexerServer.setFailureMode('http500')

			const releases = await searchMovieReleases({ tmdbId: 27205, imdbId: 'tt1375666' })

			// Should still get results from second indexer
			expect(releases).toHaveLength(1)
			expect(releases[0].indexerName).toBe('WorkingIndexer')

			await secondServer.stop()
		})
	})

	describe('NZB download', () => {
		it('downloads NZB content successfully', async () => {
			const customNzbContent = '<?xml version="1.0"?><nzb><file subject="test"/></nzb>'
			indexerServer.setNzbContent(customNzbContent)

			const downloadUrl = `${indexerServer.url}/nzb/test-file`
			const nzbPath = await downloadNzb(downloadUrl, 'Test.Movie.2023')

			// Dots are allowed in filenames, so Test.Movie.2023 stays as-is
			expect(nzbPath).toContain('Test.Movie.2023.nzb')

			// Verify file was downloaded (read it back)
			const content = await Bun.file(nzbPath).text()
			expect(content).toBe(customNzbContent)

			// Verify request was made
			const nzbCall = indexerServer.calls.find((c) => c.path.startsWith('/nzb/'))
			expect(nzbCall).toBeDefined()
		})

		it('throws error on download failure', async () => {
			indexerServer.setFailureMode('http500')

			const downloadUrl = `${indexerServer.url}/nzb/test-file`

			await expect(downloadNzb(downloadUrl, 'Test.Movie.2023')).rejects.toThrow('Failed to download NZB')
		})

		it('sanitizes filename for safe storage', async () => {
			const downloadUrl = `${indexerServer.url}/nzb/test-file`
			const nzbPath = await downloadNzb(downloadUrl, 'Movie: The [Special] Edition (2023)')

			// Check filename is sanitized - special chars replaced with underscores
			expect(nzbPath).toContain('Movie__The__Special__Edition__2023_')
			expect(nzbPath.endsWith('.nzb')).toBe(true)
		})
	})

	describe('Movie search tiers', () => {
		it('searches by IMDB ID first (tier 1)', async () => {
			indexerServer.addRelease({
				title: 'Inception.2010.1080p',
				guid: 'imdb-release',
				link: `${indexerServer.url}/details/1`,
				downloadUrl: `${indexerServer.url}/nzb/1`,
				size: 8_000_000_000,
				pubDate: '2023-06-15T12:00:00Z',
				imdbId: 'tt1375666',
			})

			await searchMovieReleases({ tmdbId: 27205, imdbId: 'tt1375666', title: 'Inception', year: 2010 })

			// Should have made one search call with imdbid
			const searchCalls = indexerServer.calls.filter((c) => c.path === '/api')
			expect(searchCalls).toHaveLength(1)
			expect(searchCalls[0].params.imdbid).toBe('1375666')
		})

		it('falls back to title search (tier 2) when IMDB returns no results', async () => {
			// Release title includes the search terms "Inception 2010" that tier 2 searches for
			indexerServer.addRelease({
				title: 'Inception 2010 1080p BluRay',
				guid: 'title-release',
				link: `${indexerServer.url}/details/1`,
				downloadUrl: `${indexerServer.url}/nzb/1`,
				size: 8_000_000_000,
				pubDate: '2023-06-15T12:00:00Z',
				// No imdbId - won't match IMDB search
			})

			const releases = await searchMovieReleases({ tmdbId: 27205, imdbId: 'tt0000000', title: 'Inception', year: 2010 })

			// Should have made two search calls: IMDB first, then title
			const searchCalls = indexerServer.calls.filter((c) => c.path === '/api')
			expect(searchCalls).toHaveLength(2)
			expect(searchCalls[1].params.q).toBe('Inception 2010')

			expect(releases).toHaveLength(1)
		})
	})

	describe('Episode search tiers', () => {
		it('searches by TMDB ID with season/episode (tier 1)', async () => {
			indexerServer.addRelease({
				title: 'Breaking.Bad.S01E01.720p',
				guid: 'tmdb-release',
				link: `${indexerServer.url}/details/1`,
				downloadUrl: `${indexerServer.url}/nzb/1`,
				size: 1_200_000_000,
				pubDate: '2023-05-10T08:00:00Z',
				tmdbId: 1396,
				season: 1,
				episode: 1,
			})

			await searchEpisodeReleases({ tmdbId: 1396, tvdbId: 81189, season: 1, episode: 1, title: 'Breaking Bad' })

			const searchCalls = indexerServer.calls.filter((c) => c.path === '/api')
			expect(searchCalls).toHaveLength(1)
			expect(searchCalls[0].params.tmdbid).toBe('1396')
			expect(searchCalls[0].params.season).toBe('1')
			expect(searchCalls[0].params.ep).toBe('1')
		})

		it('falls back to TVDB search (tier 2) when TMDB returns no results', async () => {
			indexerServer.addRelease({
				title: 'Breaking.Bad.S01E01.720p',
				guid: 'tvdb-release',
				link: `${indexerServer.url}/details/1`,
				downloadUrl: `${indexerServer.url}/nzb/1`,
				size: 1_200_000_000,
				pubDate: '2023-05-10T08:00:00Z',
				tvdbId: 81189,
				season: 1,
				episode: 1,
			})

			const releases = await searchEpisodeReleases({ tmdbId: 9999999, tvdbId: 81189, season: 1, episode: 1, title: 'Breaking Bad' })

			const searchCalls = indexerServer.calls.filter((c) => c.path === '/api')
			expect(searchCalls).toHaveLength(2)
			expect(searchCalls[1].params.tvdbid).toBe('81189')

			expect(releases).toHaveLength(1)
		})

		it('falls back to title search (tier 3) when ID searches return no results', async () => {
			// Release title includes "Breaking Bad S01E01" that tier 3 searches for
			indexerServer.addRelease({
				title: 'Breaking Bad S01E01 720p BluRay',
				guid: 'title-release',
				link: `${indexerServer.url}/details/1`,
				downloadUrl: `${indexerServer.url}/nzb/1`,
				size: 1_200_000_000,
				pubDate: '2023-05-10T08:00:00Z',
				season: 1,
				episode: 1,
				// No tmdbId or tvdbId
			})

			const releases = await searchEpisodeReleases({ tmdbId: 9999999, tvdbId: 9999999, season: 1, episode: 1, title: 'Breaking Bad' })

			const searchCalls = indexerServer.calls.filter((c) => c.path === '/api')
			expect(searchCalls).toHaveLength(3)
			expect(searchCalls[2].params.q).toBe('Breaking Bad S01E01')

			expect(releases).toHaveLength(1)
		})
	})

	describe('Deduplication', () => {
		it('deduplicates releases by guid across indexers', async () => {
			const secondServer = new StubIndexerServer()
			await secondServer.start()

			// Both indexers have same release (same guid)
			const sharedRelease: StubRelease = {
				title: 'Inception.2010.1080p.BluRay',
				guid: 'shared-guid-123',
				link: `${indexerServer.url}/details/1`,
				downloadUrl: `${indexerServer.url}/nzb/1`,
				size: 8_500_000_000,
				pubDate: '2023-06-15T12:00:00Z',
				imdbId: 'tt1375666',
			}

			indexerServer.addRelease(sharedRelease)
			secondServer.addRelease({
				...sharedRelease,
				link: `${secondServer.url}/details/1`,
				downloadUrl: `${secondServer.url}/nzb/1`,
			})

			vi.mocked(getSettings).mockReturnValue({
				indexers: [
					{
						id: 'indexer-1',
						name: 'Indexer1',
						url: indexerServer.url,
						apiKey: indexerServer.apiKey,
						enabled: true,
						priority: 1,
					},
					{
						id: 'indexer-2',
						name: 'Indexer2',
						url: secondServer.url,
						apiKey: secondServer.apiKey,
						enabled: true,
						priority: 2,
					},
				],
				folders: { movies: [], tv: [] },
				downloadFolder: '',
				usenetServers: [],
				resolutions: [],
				defaultQuality: '1080p',
				languageSettings: {
					subtitleLanguages: [],
					audioLanguages: [],
					preferOriginalAudio: true,
					acceptAnyAudioFallback: true,
				},
				formatSettings: { codecs: [], hdrFormats: [], audioFormats: [] },
				authSettings: { enabled: false, method: 'none', username: '', apiKey: '' },
				nzbgetSettings: { username: 'nzbget', password: 'nzbget', host: '127.0.0.1', port: 6789 },
				tmdbApiKey: 'test-key',
			})

			const releases = await searchMovieReleases({ tmdbId: 27205, imdbId: 'tt1375666' })

			// Should only have one release despite two indexers returning same guid
			expect(releases).toHaveLength(1)
			expect(releases[0].guid).toBe('shared-guid-123')

			await secondServer.stop()
		})
	})
})
