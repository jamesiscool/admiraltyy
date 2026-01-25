import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StubIndexerServer, type StubRelease } from './indexer-stub'

describe('StubIndexerServer', () => {
	let server: StubIndexerServer

	beforeEach(async () => {
		server = new StubIndexerServer()
		await server.start()
	})

	afterEach(async () => {
		await server.stop()
	})

	describe('lifecycle', () => {
		it('starts on random port', async () => {
			expect(server.port).toBeGreaterThan(0)
			expect(server.url).toBe(`http://localhost:${server.port}`)
		})

		it('stops cleanly', async () => {
			await server.stop()
			expect(server.port).toBe(0)
		})
	})

	describe('API authentication', () => {
		it('rejects requests with wrong API key', async () => {
			const response = await fetch(`${server.url}/api?apikey=wrong-key&o=json&t=movie`)
			expect(response.status).toBe(401)
		})

		it('accepts requests with correct API key', async () => {
			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie`)
			expect(response.status).toBe(200)
		})
	})

	describe('release filtering', () => {
		const baseRelease: StubRelease = {
			title: 'Test.Movie.2023.1080p',
			guid: 'test-guid',
			link: 'http://test/details/1',
			downloadUrl: 'http://test/nzb/1',
			size: 5_000_000_000,
			pubDate: '2023-06-15T12:00:00Z',
		}

		it('filters by imdb ID', async () => {
			server.addRelease({ ...baseRelease, imdbId: 'tt1234567' })
			server.addRelease({ ...baseRelease, guid: 'other', imdbId: 'tt9999999' })

			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie&imdbid=1234567`)
			const data = (await response.json()) as { rss: { channel: { item: { guid: string } } } }

			expect(data.rss.channel.item.guid).toBe('test-guid')
		})

		it('filters by tmdb ID', async () => {
			server.addRelease({ ...baseRelease, tmdbId: 27205 })
			server.addRelease({ ...baseRelease, guid: 'other', tmdbId: 99999 })

			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie&tmdbid=27205`)
			const data = (await response.json()) as { rss: { channel: { item: { guid: string } } } }

			expect(data.rss.channel.item.guid).toBe('test-guid')
		})

		it('filters by tvdb ID', async () => {
			server.addRelease({ ...baseRelease, tvdbId: 81189 })
			server.addRelease({ ...baseRelease, guid: 'other', tvdbId: 99999 })

			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=tvsearch&tvdbid=81189`)
			const data = (await response.json()) as { rss: { channel: { item: { guid: string } } } }

			expect(data.rss.channel.item.guid).toBe('test-guid')
		})

		it('filters by season and episode', async () => {
			server.addRelease({ ...baseRelease, season: 1, episode: 1 })
			server.addRelease({ ...baseRelease, guid: 'other', season: 2, episode: 1 })

			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=tvsearch&season=1&ep=1`)
			const data = (await response.json()) as { rss: { channel: { item: { guid: string } } } }

			expect(data.rss.channel.item.guid).toBe('test-guid')
		})

		it('filters by title query', async () => {
			server.addRelease({ ...baseRelease, title: 'Inception 2010 1080p' })
			server.addRelease({ ...baseRelease, guid: 'other', title: 'Other Movie 2020' })

			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie&q=Inception`)
			const data = (await response.json()) as { rss: { channel: { item: { guid: string } } } }

			expect(data.rss.channel.item.guid).toBe('test-guid')
		})
	})

	describe('NZB download', () => {
		it('serves NZB content', async () => {
			const response = await fetch(`${server.url}/nzb/test-file`)
			expect(response.status).toBe(200)
			expect(response.headers.get('Content-Type')).toBe('application/x-nzb')
			const content = await response.text()
			expect(content).toContain('<nzb>')
		})

		it('serves custom NZB content', async () => {
			server.setNzbContent('<?xml version="1.0"?><nzb><custom/></nzb>')
			const response = await fetch(`${server.url}/nzb/test-file`)
			const content = await response.text()
			expect(content).toContain('<custom/>')
		})
	})

	describe('failure simulation', () => {
		it('simulates HTTP 500 error', async () => {
			server.setFailureMode('http500')
			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie`)
			expect(response.status).toBe(500)
		})

		it('simulates HTTP 404 error', async () => {
			server.setFailureMode('http404')
			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie`)
			expect(response.status).toBe(404)
		})

		it('simulates invalid JSON response', async () => {
			server.setFailureMode('invalidJson')
			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie`)
			expect(response.status).toBe(200)
			const text = await response.text()
			expect(() => JSON.parse(text)).toThrow()
		})

		it('limits failures to maxFailures count', async () => {
			server.setFailureMode('http500', 1)

			// First request fails
			const response1 = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie`)
			expect(response1.status).toBe(500)

			// Second request succeeds
			const response2 = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie`)
			expect(response2.status).toBe(200)
		})
	})

	describe('call tracking', () => {
		it('tracks API calls', async () => {
			await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie&imdbid=1234567`)

			expect(server.calls).toHaveLength(1)
			expect(server.calls[0].path).toBe('/api')
			expect(server.calls[0].params.t).toBe('movie')
			expect(server.calls[0].params.imdbid).toBe('1234567')
		})

		it('clears calls', async () => {
			await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie`)
			expect(server.calls).toHaveLength(1)

			server.clearCalls()
			expect(server.calls).toHaveLength(0)
		})
	})

	describe('reset', () => {
		it('clears all state', async () => {
			server.addRelease({
				title: 'Test',
				guid: 'test',
				link: 'http://test',
				downloadUrl: 'http://test/nzb',
				size: 1000,
				pubDate: '2023-01-01T00:00:00Z',
			})
			server.setFailureMode('http500')
			await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie`)

			server.reset()

			// Failures cleared
			const response = await fetch(`${server.url}/api?apikey=${server.apiKey}&o=json&t=movie`)
			expect(response.status).toBe(200)

			// Releases cleared
			const data = (await response.json()) as { rss: { channel: object } }
			expect(data.rss.channel).toEqual({})

			// Calls cleared
			expect(server.calls).toHaveLength(1) // Only the new call
		})
	})
})
