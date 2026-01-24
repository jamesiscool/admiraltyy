import { beforeEach, describe, expect, it } from 'vitest'
import { createNzbgetClient, MockNzbgetClient } from './mocks'

describe('MockNzbgetClient', () => {
	let client: MockNzbgetClient

	beforeEach(() => {
		client = new MockNzbgetClient()
	})

	it('returns version', async () => {
		const version = await client.version()
		expect(version).toBe('21.0')
	})

	it('returns status', async () => {
		const status = await client.status()
		expect(status).toHaveProperty('RemainingSizeMB')
		expect(status).toHaveProperty('DownloadRate')
		expect(status.ServerStandBy).toBe(true)
	})

	it('starts with empty queue', async () => {
		const queue = await client.listQueue()
		expect(queue).toHaveLength(0)
	})

	it('append adds to queue and returns nzbId', async () => {
		const nzbId = await client.append({
			filename: 'Test.Download.nzb',
			nzbContent: btoa('test content'),
			category: 'movies',
		})

		expect(nzbId).toBe(1)

		const queue = await client.listQueue()
		expect(queue).toHaveLength(1)
		expect(queue[0].NZBID).toBe(1)
		expect(queue[0].NZBName).toBe('Test.Download')
	})

	it('append with addToTop inserts at front', async () => {
		await client.append({ filename: 'First.nzb', nzbContent: '' })
		await client.append({ filename: 'Second.nzb', nzbContent: '', addToTop: true })

		const queue = await client.listQueue()
		expect(queue[0].NZBName).toBe('Second')
		expect(queue[1].NZBName).toBe('First')
	})

	it('editQueue GroupDelete removes items', async () => {
		const id1 = await client.append({ filename: 'One.nzb', nzbContent: '' })
		const id2 = await client.append({ filename: 'Two.nzb', nzbContent: '' })
		await client.append({ filename: 'Three.nzb', nzbContent: '' })

		await client.editQueue('GroupDelete', [id1, id2])

		const queue = await client.listQueue()
		expect(queue).toHaveLength(1)
		expect(queue[0].NZBName).toBe('Three')
	})

	it('addToQueue helper adds item directly', () => {
		const item = client.addToQueue({ NZBName: 'Direct.Add' })

		expect(item.NZBName).toBe('Direct.Add')
		expect(item.NZBID).toBe(1)
	})

	it('addToHistory helper adds item directly', () => {
		const item = client.addToHistory({
			Name: 'Completed.Download',
			Status: 'SUCCESS',
		})

		expect(item.Name).toBe('Completed.Download')
		expect(item.Status).toBe('SUCCESS')
	})

	it('listHistory returns history items', async () => {
		client.addToHistory({ Name: 'Old.Download' })

		const history = await client.listHistory()
		expect(history).toHaveLength(1)
		expect(history[0].Name).toBe('Old.Download')
	})

	it('clearHistory removes items', async () => {
		const item = client.addToHistory({ Name: 'ToRemove' })

		await client.clearHistory([item.NZBID])

		const history = await client.listHistory()
		expect(history).toHaveLength(0)
	})

	it('tracks all calls', async () => {
		await client.version()
		await client.status()
		await client.listQueue()

		expect(client.calls).toHaveLength(3)
		expect(client.calls[0].method).toBe('version')
		expect(client.calls[1].method).toBe('status')
		expect(client.calls[2].method).toBe('listgroups')
	})

	it('clearCalls resets call history', async () => {
		await client.version()
		client.clearCalls()
		expect(client.calls).toHaveLength(0)
	})

	it('reset clears all state', async () => {
		await client.append({ filename: 'Test.nzb', nzbContent: '' })
		client.addToHistory({ Name: 'Complete' })
		client.setConfig([{ Name: 'Option1', Value: 'Value1' }])

		client.reset()

		expect(await client.listQueue()).toHaveLength(0)
		expect(await client.listHistory()).toHaveLength(0)
		expect(await client.config()).toHaveLength(0)
		expect(client.calls).toHaveLength(3) // The list calls above
	})

	it('saveConfig updates config', async () => {
		await client.saveConfig([
			{ Name: 'Server1.Host', Value: 'news.example.com' },
			{ Name: 'Server1.Port', Value: '563' },
		])

		const config = await client.config()
		expect(config).toHaveLength(2)
		expect(config.find((c) => c.Name === 'Server1.Host')?.Value).toBe('news.example.com')
	})
})

describe('createNzbgetClient', () => {
	it('returns MockNzbgetClient by default', () => {
		const client = createNzbgetClient()
		expect(client).toBeInstanceOf(MockNzbgetClient)
	})
})
