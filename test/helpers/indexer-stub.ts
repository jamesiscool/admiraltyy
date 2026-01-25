import { createServer, type Server } from 'node:http'

// Stub Indexer Server - fake Newznab API for integration tests
// Mimics real indexer responses for testing

interface NewznabAttr {
	'@attributes': {
		name: string
		value: string
	}
}

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
	'newznab:attr'?: NewznabAttr | NewznabAttr[]
}

interface NewznabResponse {
	rss: {
		channel: {
			item?: NewznabItem | NewznabItem[]
		}
	}
}

export interface StubRelease {
	title: string
	guid: string
	link: string
	downloadUrl: string
	size: number
	pubDate: string
	tmdbId?: number
	imdbId?: string
	tvdbId?: number
	season?: number
	episode?: number
}

export class StubIndexerServer {
	private server: Server | null = null
	private releases: StubRelease[] = []
	private _calls: { path: string; params: Record<string, string> }[] = []
	private nzbContent = '<?xml version="1.0"?><nzb><file/></nzb>'

	readonly apiKey = 'test-api-key-12345'
	port = 0

	get url(): string {
		return `http://localhost:${this.port}`
	}

	get calls(): { path: string; params: Record<string, string> }[] {
		return this._calls
	}

	clearCalls(): void {
		this._calls = []
	}

	// Start the stub server
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

	// Handle incoming requests
	private handleRequest(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse): void {
		// Check for simulated failures
		if (this.handleFailure(res)) {
			return
		}

		const url = new URL(req.url || '/', `http://localhost:${this.port}`)
		const params: Record<string, string> = {}
		url.searchParams.forEach((value, key) => {
			params[key] = value
		})

		this._calls.push({ path: url.pathname, params })

		// Handle NZB download requests
		if (url.pathname.startsWith('/nzb/')) {
			this.handleNzbDownload(res)
			return
		}

		// Handle API requests
		if (url.pathname === '/api') {
			// Check API key
			if (params.apikey !== this.apiKey) {
				res.writeHead(401, { 'Content-Type': 'text/plain' })
				res.end('Unauthorized: Invalid API key')
				return
			}

			this.handleApiRequest(params, res)
			return
		}

		res.writeHead(404, { 'Content-Type': 'text/plain' })
		res.end('Not found')
	}

	private handleNzbDownload(res: import('node:http').ServerResponse): void {
		res.writeHead(200, { 'Content-Type': 'application/x-nzb' })
		res.end(this.nzbContent)
	}

	private handleApiRequest(params: Record<string, string>, res: import('node:http').ServerResponse): void {
		// Filter releases based on search params
		let results = [...this.releases]

		if (params.imdbid) {
			results = results.filter((r) => r.imdbId === params.imdbid || r.imdbId === `tt${params.imdbid.padStart(7, '0')}`)
		}
		if (params.tmdbid) {
			results = results.filter((r) => r.tmdbId === Number.parseInt(params.tmdbid, 10))
		}
		if (params.tvdbid) {
			results = results.filter((r) => r.tvdbId === Number.parseInt(params.tvdbid, 10))
		}
		if (params.season) {
			results = results.filter((r) => r.season === Number.parseInt(params.season, 10))
		}
		if (params.ep) {
			results = results.filter((r) => r.episode === Number.parseInt(params.ep, 10))
		}
		if (params.q) {
			const query = params.q.toLowerCase()
			results = results.filter((r) => r.title.toLowerCase().includes(query))
		}

		// Build Newznab response
		const response = this.buildNewznabResponse(results)

		res.writeHead(200, { 'Content-Type': 'application/json' })
		res.end(JSON.stringify(response))
	}

	private buildNewznabResponse(releases: StubRelease[]): NewznabResponse {
		const items: NewznabItem[] = releases.map((r) => {
			const attrs: NewznabAttr[] = [{ '@attributes': { name: 'size', value: r.size.toString() } }]

			if (r.tmdbId) {
				attrs.push({ '@attributes': { name: 'tmdbid', value: r.tmdbId.toString() } })
			}
			if (r.imdbId) {
				// Send IMDB ID without tt prefix (some indexers do this)
				const imdbNum = r.imdbId.replace(/^tt/, '')
				attrs.push({ '@attributes': { name: 'imdb', value: imdbNum } })
			}
			if (r.tvdbId) {
				attrs.push({ '@attributes': { name: 'tvdbid', value: r.tvdbId.toString() } })
			}
			if (r.season !== undefined) {
				attrs.push({ '@attributes': { name: 'season', value: r.season.toString() } })
			}
			if (r.episode !== undefined) {
				attrs.push({ '@attributes': { name: 'episode', value: r.episode.toString() } })
			}

			return {
				title: r.title,
				guid: r.guid,
				link: r.link,
				pubDate: r.pubDate,
				enclosure: {
					'@attributes': {
						url: r.downloadUrl,
						length: r.size.toString(),
						type: 'application/x-nzb',
					},
				},
				'newznab:attr': attrs.length === 1 ? attrs[0] : attrs,
			}
		})

		return {
			rss: {
				channel: {
					item: items.length === 1 ? items[0] : items.length > 0 ? items : undefined,
				},
			},
		}
	}

	// Test helpers - manipulate internal state

	addRelease(release: StubRelease): void {
		this.releases.push(release)
	}

	addReleases(releases: StubRelease[]): void {
		this.releases.push(...releases)
	}

	setNzbContent(content: string): void {
		this.nzbContent = content
	}

	reset(): void {
		this.releases = []
		this._calls = []
		this.nzbContent = '<?xml version="1.0"?><nzb><file/></nzb>'
		this.failureMode = null
		this.failureCount = 0
	}

	// Failure simulation
	private failureMode: 'network' | 'http500' | 'http404' | 'invalidJson' | 'timeout' | null = null
	private failureCount = 0
	private maxFailures = Infinity

	setFailureMode(mode: 'network' | 'http500' | 'http404' | 'invalidJson' | 'timeout' | null, maxFailures = Infinity): void {
		this.failureMode = mode
		this.maxFailures = maxFailures
		this.failureCount = 0
	}

	private shouldFail(): boolean {
		if (!this.failureMode) return false
		if (this.failureCount >= this.maxFailures) return false
		this.failureCount++
		return true
	}

	private handleFailure(res: import('node:http').ServerResponse): boolean {
		if (!this.shouldFail()) return false

		switch (this.failureMode) {
			case 'http500':
				res.writeHead(500, { 'Content-Type': 'text/plain' })
				res.end('Internal Server Error')
				return true
			case 'http404':
				res.writeHead(404, { 'Content-Type': 'text/plain' })
				res.end('Not Found')
				return true
			case 'invalidJson':
				res.writeHead(200, { 'Content-Type': 'application/json' })
				res.end('not valid json {{{')
				return true
			case 'timeout':
				// Don't respond - let it timeout
				return true
			case 'network':
				// Close connection abruptly
				res.socket?.destroy()
				return true
		}
		return false
	}
}
