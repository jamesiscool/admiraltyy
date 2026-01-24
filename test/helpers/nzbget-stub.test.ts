import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { StubNzbgetServer } from './nzbget-stub'

describe('StubNzbgetServer', () => {
	let server: StubNzbgetServer

	beforeEach(async () => {
		server = new StubNzbgetServer()
		await server.start()
	})

	afterEach(async () => {
		await server.stop()
	})

	// Helper to make authenticated RPC calls
	async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
		const auth = Buffer.from(`${server.username}:${server.password}`).toString('base64')
		const response = await fetch(server.url, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ method, params }),
		})
		const data = (await response.json()) as { result: T }
		return data.result
	}

	test('starts on random port', () => {
		expect(server.port).toBeGreaterThan(0)
		expect(server.url).toBe(`http://localhost:${server.port}/jsonrpc`)
	})

	test('rejects unauthorized requests', async () => {
		const response = await fetch(server.url, {
			method: 'POST',
			body: JSON.stringify({ method: 'version', params: [] }),
		})
		expect(response.status).toBe(401)
	})

	test('version returns 21.0', async () => {
		const version = await rpcCall<string>('version')
		expect(version).toBe('21.0')
	})

	test('status returns server state', async () => {
		const status = await rpcCall<{ ServerStandBy: boolean }>('status')
		expect(status.ServerStandBy).toBe(true)
	})

	test('listgroups returns queue', async () => {
		server.addToQueue({ NZBName: 'Test.Movie' })

		const queue = await rpcCall<{ NZBName: string }[]>('listgroups')
		expect(queue).toHaveLength(1)
		expect(queue[0].NZBName).toBe('Test.Movie')
	})

	test('append adds to queue', async () => {
		const nzbId = await rpcCall<number>('append', ['Test.nzb', 'base64content', 'movies', 0, false, false, '', 0, 'SCORE'])
		expect(nzbId).toBe(1)

		const queue = await rpcCall<{ NZBID: number; NZBName: string }[]>('listgroups')
		expect(queue).toHaveLength(1)
		expect(queue[0].NZBID).toBe(1)
		expect(queue[0].NZBName).toBe('Test')
	})

	test('editqueue GroupDelete removes from queue', async () => {
		const item = server.addToQueue({ NZBName: 'ToDelete' })

		const result = await rpcCall<boolean>('editqueue', ['GroupDelete', '', [item.NZBID]])
		expect(result).toBe(true)

		const queue = await rpcCall<unknown[]>('listgroups')
		expect(queue).toHaveLength(0)
	})

	test('history returns history items', async () => {
		server.addToHistory({ Name: 'Completed.Download', Status: 'SUCCESS' })

		const history = await rpcCall<{ Name: string }[]>('history')
		expect(history).toHaveLength(1)
		expect(history[0].Name).toBe('Completed.Download')
	})

	test('editqueue HistoryFinalDelete removes from history', async () => {
		const item = server.addToHistory({ Name: 'ToDelete' })

		const result = await rpcCall<boolean>('editqueue', ['HistoryFinalDelete', '', [item.NZBID]])
		expect(result).toBe(true)

		const history = await rpcCall<unknown[]>('history')
		expect(history).toHaveLength(0)
	})

	test('config returns config options', async () => {
		server.setConfig([{ Name: 'Server1.Host', Value: 'news.example.com' }])

		const config = await rpcCall<{ Name: string; Value: string }[]>('config')
		expect(config).toHaveLength(1)
		expect(config[0].Name).toBe('Server1.Host')
	})

	test('saveconfig updates config', async () => {
		const result = await rpcCall<boolean>('saveconfig', [[{ Name: 'Server1.Host', Value: 'new.host.com' }]])
		expect(result).toBe(true)

		const config = await rpcCall<{ Name: string; Value: string }[]>('config')
		expect(config[0].Value).toBe('new.host.com')
	})

	test('testserver returns success', async () => {
		const result = await rpcCall<string>('testserver', ['host', 563, 'user', 'pass', true, '', 30, 2])
		expect(result).toBe('Connection success')
	})

	test('reload returns true', async () => {
		const result = await rpcCall<boolean>('reload')
		expect(result).toBe(true)
	})

	test('tracks RPC calls', async () => {
		await rpcCall('version')
		await rpcCall('status')

		expect(server.calls).toHaveLength(2)
		expect(server.calls[0].method).toBe('version')
		expect(server.calls[1].method).toBe('status')
	})

	test('clearCalls resets call tracking', async () => {
		await rpcCall('version')
		server.clearCalls()
		expect(server.calls).toHaveLength(0)
	})

	test('reset clears all state', async () => {
		server.addToQueue({ NZBName: 'Test' })
		server.addToHistory({ Name: 'Test' })
		await rpcCall('version')

		server.reset()

		const queue = await rpcCall<unknown[]>('listgroups')
		const history = await rpcCall<unknown[]>('history')

		expect(queue).toHaveLength(0)
		expect(history).toHaveLength(0)
		// Calls from the checks above are tracked, but the pre-reset call is gone
		// We need to check that the ID counter also reset
		server.reset()
		const item = server.addToQueue({})
		expect(item.NZBID).toBe(1) // ID resets to 1
	})

	test('editqueue GroupPause pauses items', async () => {
		const item = server.addToQueue({ NZBName: 'ToPause', Status: 'QUEUED' })

		await rpcCall<boolean>('editqueue', ['GroupPause', '', [item.NZBID]])

		const queue = await rpcCall<{ Status: string; PausedSizeMB: number }[]>('listgroups')
		expect(queue[0].Status).toBe('PAUSED')
		expect(queue[0].PausedSizeMB).toBeGreaterThan(0)
	})

	test('editqueue GroupResume resumes items', async () => {
		const item = server.addToQueue({ NZBName: 'ToResume', Status: 'PAUSED', PausedSizeMB: 1000 })

		await rpcCall<boolean>('editqueue', ['GroupResume', '', [item.NZBID]])

		const queue = await rpcCall<{ Status: string; PausedSizeMB: number }[]>('listgroups')
		expect(queue[0].Status).toBe('QUEUED')
		expect(queue[0].PausedSizeMB).toBe(0)
	})
})
