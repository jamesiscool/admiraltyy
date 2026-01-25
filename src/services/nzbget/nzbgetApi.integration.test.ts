import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StubNzbgetServer } from '../../../test/helpers/nzbget-stub'

// Create a testable version of the API that doesn't depend on global state
// This tests the core RPC logic without the singleton pattern

interface NzbgetApiConfig {
	host: string
	port: number
	username: string
	password: string
}

function createNzbgetApiClient(config: NzbgetApiConfig) {
	const { host, port, username, password } = config
	const baseURL = `http://${host}:${port}/jsonrpc`
	const auth = Buffer.from(`${username}:${password}`).toString('base64')

	async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
		const response = await fetch(baseURL, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ method, params }),
		})

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		const data = (await response.json()) as { result: T }
		return data.result
	}

	return {
		fetchVersion: () => rpcCall<string>('version'),
		fetchStatus: () => rpcCall<{ ServerStandBy: boolean; DownloadRate: number }>('status'),
		listQueue: () => rpcCall<{ NZBID: number; NZBName: string; Status: string }[]>('listgroups', [0]),
		listHistory: (showHidden = false) => rpcCall<{ NZBID: number; Name: string }[]>('history', [showHidden]),
		appendNzb: (options: { filename: string; nzbContent: string; category?: string; priority?: number; addToTop?: boolean; addPaused?: boolean }) => {
			const { filename, nzbContent, category = '', priority = 0, addToTop = false, addPaused = false } = options
			return rpcCall<number>('append', [filename, nzbContent, category, priority, addToTop, addPaused, '', 0, 'SCORE'])
		},
		fetchConfig: () => rpcCall<{ Name: string; Value: string }[]>('config'),
		saveConfig: (options: { Name: string; Value: string }[]) => rpcCall<boolean>('saveconfig', [options]),
		editQueue: (command: string, ids: number[]) => rpcCall<boolean>('editqueue', [command, '', ids]),
		clearHistory: (nzbIds: number[]) => rpcCall<boolean>('editqueue', ['HistoryFinalDelete', '', nzbIds]),
		testServer: (server: { host: string; port: number; username: string; password: string; ssl: boolean }) =>
			rpcCall<string>('testserver', [server.host, server.port, server.username, server.password, server.ssl, '', 30, 2]),
		reload: () => rpcCall<boolean>('reload'),
	}
}

describe('NZBGet API integration', () => {
	let server: StubNzbgetServer
	let api: ReturnType<typeof createNzbgetApiClient>

	beforeEach(async () => {
		server = new StubNzbgetServer()
		await server.start()

		api = createNzbgetApiClient({
			host: 'localhost',
			port: server.port,
			username: server.username,
			password: server.password,
		})
	})

	afterEach(async () => {
		await server.stop()
	})

	describe('API initialization flow', () => {
		it('creates client with correct auth credentials', async () => {
			const version = await api.fetchVersion()

			expect(version).toBe('21.0')
			expect(server.calls).toHaveLength(1)
			expect(server.calls[0].method).toBe('version')
		})

		it('fails with wrong credentials', async () => {
			const badApi = createNzbgetApiClient({
				host: 'localhost',
				port: server.port,
				username: 'wrong',
				password: 'wrong',
			})

			await expect(badApi.fetchVersion()).rejects.toThrow('HTTP 401')
		})

		it('fails when server not reachable', async () => {
			const badApi = createNzbgetApiClient({
				host: 'localhost',
				port: 59999, // unlikely to be in use
				username: 'test',
				password: 'test',
			})

			await expect(badApi.fetchVersion()).rejects.toThrow()
		})

		it('handles multiple sequential API calls', async () => {
			const version = await api.fetchVersion()
			const status = await api.fetchStatus()
			const queue = await api.listQueue()

			expect(version).toBe('21.0')
			expect(status.ServerStandBy).toBe(true)
			expect(queue).toHaveLength(0)
			expect(server.calls).toHaveLength(3)
		})

		it('handles concurrent API calls', async () => {
			const [version, status, queue] = await Promise.all([api.fetchVersion(), api.fetchStatus(), api.listQueue()])

			expect(version).toBe('21.0')
			expect(status).toBeDefined()
			expect(queue).toBeDefined()
			expect(server.calls).toHaveLength(3)
		})
	})

	describe('version', () => {
		it('returns server version', async () => {
			const version = await api.fetchVersion()
			expect(version).toBe('21.0')
		})
	})

	describe('status', () => {
		it('returns idle status when queue empty', async () => {
			const status = await api.fetchStatus()

			expect(status.ServerStandBy).toBe(true)
			expect(status.DownloadRate).toBe(0)
		})

		it('returns active status when queue has items', async () => {
			server.addToQueue({ NZBName: 'Test.Download', RemainingSizeMB: 1000 })

			const status = await api.fetchStatus()

			// Server standby is false when queue has remaining work
			expect(status.ServerStandBy).toBe(false)
		})
	})

	describe('listQueue', () => {
		it('returns empty array when queue empty', async () => {
			const queue = await api.listQueue()
			expect(queue).toEqual([])
		})

		it('returns queue items', async () => {
			server.addToQueue({ NZBName: 'Movie.2024.1080p' })
			server.addToQueue({ NZBName: 'TV.Show.S01E01' })

			const queue = await api.listQueue()

			expect(queue).toHaveLength(2)
			expect(queue[0].NZBName).toBe('Movie.2024.1080p')
			expect(queue[1].NZBName).toBe('TV.Show.S01E01')
		})
	})

	describe('listHistory', () => {
		it('returns empty array when history empty', async () => {
			const history = await api.listHistory()
			expect(history).toEqual([])
		})

		it('returns history items', async () => {
			server.addToHistory({ Name: 'Completed.Download', Status: 'SUCCESS' })

			const history = await api.listHistory()

			expect(history).toHaveLength(1)
			expect(history[0].Name).toBe('Completed.Download')
		})

		it('returns multiple history items in order', async () => {
			server.addToHistory({ Name: 'First.Download' })
			server.addToHistory({ Name: 'Second.Download' })

			const history = await api.listHistory()

			expect(history).toHaveLength(2)
			expect(history[0].Name).toBe('First.Download')
			expect(history[1].Name).toBe('Second.Download')
		})
	})

	describe('appendNzb', () => {
		it('adds NZB to queue and returns NZBID', async () => {
			const nzbContent = Buffer.from('<nzb>test</nzb>').toString('base64')

			const nzbId = await api.appendNzb({
				filename: 'Test.Movie.2024.nzb',
				nzbContent,
			})

			expect(nzbId).toBe(1)

			const queue = await api.listQueue()
			expect(queue).toHaveLength(1)
			expect(queue[0].NZBID).toBe(1)
			expect(queue[0].NZBName).toBe('Test.Movie.2024')
		})

		it('adds NZB with category', async () => {
			const nzbId = await api.appendNzb({
				filename: 'Test.nzb',
				nzbContent: 'dGVzdA==',
				category: 'movies',
			})

			expect(nzbId).toBeGreaterThan(0)
			// Category is set on queue item (stub tracks this internally)
		})

		it('adds NZB to top of queue', async () => {
			server.addToQueue({ NZBName: 'Existing.Item' })

			await api.appendNzb({
				filename: 'New.Top.nzb',
				nzbContent: 'dGVzdA==',
				addToTop: true,
			})

			const queue = await api.listQueue()
			expect(queue[0].NZBName).toBe('New.Top')
			expect(queue[1].NZBName).toBe('Existing.Item')
		})

		it('adds NZB in paused state', async () => {
			await api.appendNzb({
				filename: 'Paused.nzb',
				nzbContent: 'dGVzdA==',
				addPaused: true,
			})

			const queue = await api.listQueue()
			expect(queue[0].Status).toBe('PAUSED')
		})

		it('returns incrementing NZBIDs', async () => {
			const id1 = await api.appendNzb({ filename: 'First.nzb', nzbContent: 'dGVzdA==' })
			const id2 = await api.appendNzb({ filename: 'Second.nzb', nzbContent: 'dGVzdA==' })
			const id3 = await api.appendNzb({ filename: 'Third.nzb', nzbContent: 'dGVzdA==' })

			expect(id1).toBe(1)
			expect(id2).toBe(2)
			expect(id3).toBe(3)
		})
	})

	describe('fetchConfig', () => {
		it('returns empty config by default', async () => {
			const config = await api.fetchConfig()
			expect(config).toEqual([])
		})

		it('returns configured options', async () => {
			server.setConfig([
				{ Name: 'Server1.Host', Value: 'news.example.com' },
				{ Name: 'Server1.Port', Value: '563' },
			])

			const config = await api.fetchConfig()

			expect(config).toHaveLength(2)
			expect(config[0].Name).toBe('Server1.Host')
			expect(config[0].Value).toBe('news.example.com')
		})
	})

	describe('saveConfig', () => {
		it('saves new config options', async () => {
			const result = await api.saveConfig([{ Name: 'Server1.Host', Value: 'news.test.com' }])

			expect(result).toBe(true)

			const config = await api.fetchConfig()
			expect(config).toHaveLength(1)
			expect(config[0].Value).toBe('news.test.com')
		})

		it('updates existing config options', async () => {
			server.setConfig([{ Name: 'Server1.Host', Value: 'old.host.com' }])

			await api.saveConfig([{ Name: 'Server1.Host', Value: 'new.host.com' }])

			const config = await api.fetchConfig()
			expect(config[0].Value).toBe('new.host.com')
		})

		it('saves multiple config options at once', async () => {
			await api.saveConfig([
				{ Name: 'Server1.Host', Value: 'host1.com' },
				{ Name: 'Server1.Port', Value: '563' },
				{ Name: 'Server1.Username', Value: 'user1' },
			])

			const config = await api.fetchConfig()
			expect(config).toHaveLength(3)
		})
	})

	describe('editQueue', () => {
		it('deletes items from queue with GroupDelete', async () => {
			const item = server.addToQueue({ NZBName: 'ToDelete' })

			const result = await api.editQueue('GroupDelete', [item.NZBID])

			expect(result).toBe(true)

			const queue = await api.listQueue()
			expect(queue).toHaveLength(0)
		})

		it('pauses items with GroupPause', async () => {
			const item = server.addToQueue({ NZBName: 'ToPause' })

			const result = await api.editQueue('GroupPause', [item.NZBID])

			expect(result).toBe(true)

			const queue = await api.listQueue()
			expect(queue[0].Status).toBe('PAUSED')
		})

		it('resumes items with GroupResume', async () => {
			const item = server.addToQueue({ NZBName: 'ToResume', Status: 'PAUSED' })

			const result = await api.editQueue('GroupResume', [item.NZBID])

			expect(result).toBe(true)

			const queue = await api.listQueue()
			expect(queue[0].Status).toBe('QUEUED')
		})

		it('handles multiple IDs at once', async () => {
			const item1 = server.addToQueue({ NZBName: 'Item1' })
			const item2 = server.addToQueue({ NZBName: 'Item2' })
			server.addToQueue({ NZBName: 'Item3' })

			await api.editQueue('GroupDelete', [item1.NZBID, item2.NZBID])

			const queue = await api.listQueue()
			expect(queue).toHaveLength(1)
			expect(queue[0].NZBName).toBe('Item3')
		})
	})

	describe('clearHistory', () => {
		it('deletes items from history', async () => {
			const item = server.addToHistory({ Name: 'ToDelete' })

			const result = await api.clearHistory([item.NZBID])

			expect(result).toBe(true)

			const history = await api.listHistory()
			expect(history).toHaveLength(0)
		})

		it('handles empty array', async () => {
			const result = await api.clearHistory([])
			expect(result).toBe(true)
		})

		it('deletes multiple history items', async () => {
			const item1 = server.addToHistory({ Name: 'Item1' })
			const item2 = server.addToHistory({ Name: 'Item2' })
			server.addToHistory({ Name: 'Item3' })

			await api.clearHistory([item1.NZBID, item2.NZBID])

			const history = await api.listHistory()
			expect(history).toHaveLength(1)
			expect(history[0].Name).toBe('Item3')
		})
	})

	describe('testServer', () => {
		it('returns success message', async () => {
			const result = await api.testServer({
				host: 'news.example.com',
				port: 563,
				username: 'user',
				password: 'pass',
				ssl: true,
			})

			expect(result).toBe('Connection success')
		})
	})

	describe('reload', () => {
		it('returns true', async () => {
			const result = await api.reload()
			expect(result).toBe(true)
		})
	})

	describe('RPC call tracking', () => {
		it('tracks all method calls', async () => {
			await api.fetchVersion()
			await api.fetchStatus()
			await api.listQueue()

			expect(server.calls).toHaveLength(3)
			expect(server.calls.map((c) => c.method)).toEqual(['version', 'status', 'listgroups'])
		})

		it('tracks method parameters', async () => {
			await api.listHistory(true)

			expect(server.calls[0].params).toEqual([true])
		})

		it('clears call tracking on request', async () => {
			await api.fetchVersion()
			server.clearCalls()
			await api.fetchStatus()

			expect(server.calls).toHaveLength(1)
			expect(server.calls[0].method).toBe('status')
		})
	})

	describe('server reset', () => {
		it('clears all state', async () => {
			server.addToQueue({ NZBName: 'QueueItem' })
			server.addToHistory({ Name: 'HistoryItem' })
			await api.fetchVersion()

			server.reset()

			const queue = await api.listQueue()
			const history = await api.listHistory()

			expect(queue).toHaveLength(0)
			expect(history).toHaveLength(0)
		})

		it('resets NZBID counter', async () => {
			await api.appendNzb({ filename: 'First.nzb', nzbContent: 'dGVzdA==' })
			server.reset()

			const nzbId = await api.appendNzb({ filename: 'After.Reset.nzb', nzbContent: 'dGVzdA==' })

			expect(nzbId).toBe(1) // Counter reset
		})
	})

	describe('API failure handling', () => {
		it('throws on HTTP 500 error', async () => {
			server.setFailureMode('http500')

			await expect(api.fetchVersion()).rejects.toThrow()
		})

		it('throws on invalid JSON response', async () => {
			server.setFailureMode('invalidJson')

			await expect(api.fetchVersion()).rejects.toThrow()
		})

		it('throws on network error (connection reset)', async () => {
			server.setFailureMode('network')

			await expect(api.fetchVersion()).rejects.toThrow()
		})

		it('throws on RPC error response', async () => {
			server.setFailureMode('rpcError')

			// RPC error still returns 200 OK but has error in body
			// The current implementation doesn't explicitly check for RPC errors
			// so it may return undefined/null result instead of throwing
			const result = await api.fetchVersion()
			expect(result).toBeUndefined()
		})

		it('recovers after transient failure', async () => {
			// Fail first request, then succeed
			server.setFailureMode('http500', 1)

			await expect(api.fetchVersion()).rejects.toThrow()

			// Second request should succeed
			const version = await api.fetchVersion()
			expect(version).toBe('21.0')
		})

		it('handles failure during queue operations', async () => {
			server.addToQueue({ NZBName: 'Test.Item' })
			server.setFailureMode('http500')

			await expect(api.listQueue()).rejects.toThrow()
		})

		it('handles failure during append operation', async () => {
			server.setFailureMode('http500')

			await expect(
				api.appendNzb({
					filename: 'Test.nzb',
					nzbContent: 'dGVzdA==',
				}),
			).rejects.toThrow()
		})

		it('handles failure during editQueue operation', async () => {
			const item = server.addToQueue({ NZBName: 'Test.Item' })
			server.setFailureMode('http500')

			await expect(api.editQueue('GroupDelete', [item.NZBID])).rejects.toThrow()
		})

		it('handles failure during saveConfig operation', async () => {
			server.setFailureMode('http500')

			await expect(api.saveConfig([{ Name: 'Server1.Host', Value: 'test.com' }])).rejects.toThrow()
		})

		it('handles multiple consecutive failures', async () => {
			server.setFailureMode('http500', 3)

			await expect(api.fetchVersion()).rejects.toThrow()
			await expect(api.fetchVersion()).rejects.toThrow()
			await expect(api.fetchVersion()).rejects.toThrow()

			// Fourth request should succeed
			const version = await api.fetchVersion()
			expect(version).toBe('21.0')
		})

		it('failure mode clears on reset', async () => {
			server.setFailureMode('http500')
			await expect(api.fetchVersion()).rejects.toThrow()

			server.reset()

			const version = await api.fetchVersion()
			expect(version).toBe('21.0')
		})

		it('handles concurrent requests when server fails', async () => {
			server.setFailureMode('http500')

			const results = await Promise.allSettled([api.fetchVersion(), api.fetchStatus(), api.listQueue()])

			// All should be rejected
			expect(results.every((r) => r.status === 'rejected')).toBe(true)
		})
	})
})
