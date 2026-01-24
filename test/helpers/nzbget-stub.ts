import { createServer, type Server } from 'node:http'
import type { NzbgetConfigOption, NzbgetHistoryItem, NzbgetQueueItem, NzbgetRpcResponse, NzbgetStatus } from '@/services/nzbget/nzbgetSchema'

type RpcRequest = { method: string; params: unknown[] }

// Stub NZBGet server - fake JSON-RPC server for integration tests
// Uses actual HTTP but with controlled responses
export class StubNzbgetServer {
	private server: Server | null = null
	private queue: NzbgetQueueItem[] = []
	private history: NzbgetHistoryItem[] = []
	private configOptions: NzbgetConfigOption[] = []
	private nextNzbId = 1
	private _calls: RpcRequest[] = []

	readonly username = 'nzbget'
	readonly password = 'nzbget'
	port = 0

	get url(): string {
		return `http://localhost:${this.port}/jsonrpc`
	}

	get calls(): RpcRequest[] {
		return this._calls
	}

	clearCalls(): void {
		this._calls = []
	}

	// Start the stub server on a random available port
	async start(): Promise<void> {
		return new Promise((resolve) => {
			this.server = createServer((req, res) => this.handleRequest(req, res))
			this.server.listen(0, () => {
				const addr = this.server?.address()
				if (addr && typeof addr === 'object') {
					this.port = addr.port
				}
				resolve()
			})
		})
	}

	// Stop the server
	async stop(): Promise<void> {
		return new Promise((resolve) => {
			if (this.server) {
				this.server.close(() => {
					this.server = null
					this.port = 0
					resolve()
				})
			} else {
				resolve()
			}
		})
	}

	// Handle incoming JSON-RPC requests
	private handleRequest(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse): void {
		// Check basic auth
		const authHeader = req.headers.authorization
		const expected = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`
		if (authHeader !== expected) {
			res.writeHead(401, { 'Content-Type': 'text/plain' })
			res.end('Unauthorized')
			return
		}

		// Only accept POST
		if (req.method !== 'POST') {
			res.writeHead(405, { 'Content-Type': 'text/plain' })
			res.end('Method not allowed')
			return
		}

		// Read body
		let body = ''
		req.on('data', (chunk) => {
			body += chunk
		})
		req.on('end', () => {
			try {
				const rpcReq = JSON.parse(body) as RpcRequest
				this._calls.push({ method: rpcReq.method, params: rpcReq.params })

				const result = this.handleMethod(rpcReq.method, rpcReq.params)
				const response: NzbgetRpcResponse<unknown> = { version: '1.1', result }

				res.writeHead(200, { 'Content-Type': 'application/json' })
				res.end(JSON.stringify(response))
			} catch {
				res.writeHead(400, { 'Content-Type': 'text/plain' })
				res.end('Bad request')
			}
		})
	}

	// Route RPC methods to handlers
	private handleMethod(method: string, params: unknown[]): unknown {
		switch (method) {
			case 'version':
				return '21.0'

			case 'status':
				return this.getStatus()

			case 'listgroups':
				return this.queue

			case 'history':
				return this.history

			case 'append':
				return this.handleAppend(params)

			case 'config':
				return this.configOptions

			case 'saveconfig':
				return this.handleSaveConfig(params)

			case 'editqueue':
				return this.handleEditQueue(params)

			case 'reload':
				return true

			case 'testserver':
				return 'Connection success'

			default:
				return null
		}
	}

	private getStatus(): NzbgetStatus {
		return {
			RemainingSizeMB: this.queue.reduce((acc, item) => acc + item.RemainingSizeMB, 0),
			DownloadedSizeMB: 0,
			DownloadRate: 0,
			DownloadPaused: false,
			PostPaused: false,
			ServerStandBy: this.queue.length === 0,
			UpTimeSec: 3600,
			DownloadTimeSec: 0,
			FreeDiskSpaceMB: 100000,
			PostJobCount: 0,
			UrlCount: 0,
			ThreadCount: 1,
			DownloadLimit: 0,
			AverageDownloadRate: 0,
			MonthSizeMB: 0,
			DaySizeMB: 0,
			ArticleCacheMB: 0,
			NewsServers: [],
		}
	}

	private handleAppend(params: unknown[]): number {
		const [filename, , category = '', priority = 0, addToTop = false, addPaused = false] = params as [string, string, string, number, boolean, boolean]

		const nzbId = this.nextNzbId++
		const name = filename.replace('.nzb', '')

		const item: NzbgetQueueItem = {
			NZBID: nzbId,
			NZBName: name,
			NZBFilename: filename,
			Kind: 'NZB',
			URL: '',
			DestDir: `/downloads/inter/${name}`,
			FinalDir: '',
			Category: category,
			FileSizeMB: 1000,
			RemainingSizeMB: 1000,
			PausedSizeMB: addPaused ? 1000 : 0,
			FileCount: 10,
			RemainingFileCount: 10,
			Status: addPaused ? 'PAUSED' : 'QUEUED',
			Health: 1000,
			CriticalHealth: 900,
			DownloadedSizeMB: 0,
			DownloadTimeSec: 0,
			ActiveDownloads: 0,
			MaxPriority: priority,
			PostInfoText: '',
			PostStageProgress: 0,
		}

		if (addToTop) {
			this.queue.unshift(item)
		} else {
			this.queue.push(item)
		}

		return nzbId
	}

	private handleSaveConfig(params: unknown[]): boolean {
		const [options] = params as [NzbgetConfigOption[]]
		for (const opt of options) {
			const existing = this.configOptions.find((c) => c.Name === opt.Name)
			if (existing) {
				existing.Value = opt.Value
			} else {
				this.configOptions.push({ ...opt })
			}
		}
		return true
	}

	private handleEditQueue(params: unknown[]): boolean {
		const [command, , ids] = params as [string, string, number[]]

		switch (command) {
			case 'GroupDelete':
				this.queue = this.queue.filter((item) => !ids.includes(item.NZBID))
				break
			case 'HistoryFinalDelete':
				this.history = this.history.filter((item) => !ids.includes(item.NZBID))
				break
			case 'GroupPause':
				for (const item of this.queue) {
					if (ids.includes(item.NZBID)) {
						item.Status = 'PAUSED'
						item.PausedSizeMB = item.RemainingSizeMB
					}
				}
				break
			case 'GroupResume':
				for (const item of this.queue) {
					if (ids.includes(item.NZBID)) {
						item.Status = 'QUEUED'
						item.PausedSizeMB = 0
					}
				}
				break
		}

		return true
	}

	// Test helpers - manipulate internal state

	addToQueue(item: Partial<NzbgetQueueItem>): NzbgetQueueItem {
		const nzbId = this.nextNzbId++
		const fullItem: NzbgetQueueItem = {
			NZBID: nzbId,
			NZBName: 'Test.Download',
			NZBFilename: 'Test.Download.nzb',
			Kind: 'NZB',
			URL: '',
			DestDir: '/downloads/inter/Test.Download',
			FinalDir: '',
			Category: '',
			FileSizeMB: 1000,
			RemainingSizeMB: 1000,
			PausedSizeMB: 0,
			FileCount: 10,
			RemainingFileCount: 10,
			Status: 'QUEUED',
			Health: 1000,
			CriticalHealth: 900,
			DownloadedSizeMB: 0,
			DownloadTimeSec: 0,
			ActiveDownloads: 0,
			MaxPriority: 0,
			PostInfoText: '',
			PostStageProgress: 0,
			...item,
		}
		this.queue.push(fullItem)
		return fullItem
	}

	addToHistory(item: Partial<NzbgetHistoryItem>): NzbgetHistoryItem {
		const nzbId = item.NZBID ?? this.nextNzbId++
		const fullItem: NzbgetHistoryItem = {
			ID: nzbId,
			NZBID: nzbId,
			Kind: 'NZB',
			Name: 'Test.Download',
			NZBFilename: 'Test.Download.nzb',
			URL: '',
			DestDir: '/downloads/inter/Test.Download',
			FinalDir: '/downloads/completed/Test.Download',
			Category: '',
			FileSizeMB: 1000,
			FileSizeLo: 1000 * 1024 * 1024,
			FileSizeHi: 0,
			FileCount: 10,
			RemainingFileCount: 0,
			MinPostTime: Date.now() / 1000 - 3600,
			MaxPostTime: Date.now() / 1000,
			TotalArticles: 100,
			SuccessArticles: 100,
			FailedArticles: 0,
			Health: 1000,
			CriticalHealth: 900,
			HistoryTime: Date.now() / 1000,
			Status: 'SUCCESS',
			DownloadedSizeMB: 1000,
			DownloadedSizeLo: 1000 * 1024 * 1024,
			DownloadedSizeHi: 0,
			DownloadTimeSec: 600,
			PostTotalTimeSec: 60,
			ParTimeSec: 30,
			RepairTimeSec: 0,
			UnpackTimeSec: 30,
			DeleteStatus: 'NONE',
			MarkStatus: 'NONE',
			UrlStatus: 'NONE',
			ParStatus: 'SUCCESS',
			UnpackStatus: 'SUCCESS',
			MoveStatus: 'SUCCESS',
			DupeKey: '',
			DupeScore: 0,
			DupeMode: 'SCORE',
			RetryData: false,
			Parameters: [],
			ScriptStatuses: [],
			ServerStats: [],
			...item,
		}
		this.history.push(fullItem)
		return fullItem
	}

	setConfig(options: NzbgetConfigOption[]): void {
		this.configOptions = [...options]
	}

	reset(): void {
		this.queue = []
		this.history = []
		this.configOptions = []
		this.nextNzbId = 1
		this._calls = []
	}
}
