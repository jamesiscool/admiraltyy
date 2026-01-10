import { type $Fetch, ofetch } from 'ofetch'
import { getSettings, type UsenetServer } from '../settings'

// Module-level fetch client (initialized once on process start)
let nzbgetFetch: $Fetch | null = null

// Initialize the API client (call once after NZBGet process starts)
export function initNzbgetApi(): void {
	const { username, password, host, port } = getSettings().nzbgetSettings
	const baseURL = `http://${host}:${port}/jsonrpc`
	const auth = Buffer.from(`${username}:${password}`).toString('base64')
	nzbgetFetch = ofetch.create({
		baseURL,
		method: 'POST',
		headers: { Authorization: `Basic ${auth}` },
	})
}

// JSON-RPC response wrapper
interface NzbgetRpcResponse<T> {
	version: '1.1'
	result: T
}

// Status response from NZBGet
export interface NzbgetStatus {
	RemainingSizeMB: number
	DownloadedSizeMB: number
	DownloadRate: number
	DownloadPaused: boolean
	PostPaused: boolean
	ServerStandBy: boolean
	UpTimeSec: number
	DownloadTimeSec: number
	FreeDiskSpaceMB: number
	PostJobCount: number
	UrlCount: number
	ThreadCount: number
	DownloadLimit: number
	AverageDownloadRate: number
	MonthSizeMB: number
	DaySizeMB: number
	ArticleCacheMB: number
	NewsServers: NzbgetNewsServer[]
}

export interface NzbgetNewsServer {
	ID: number
	Active: boolean
}

// Queue item from listgroups
export interface NzbgetQueueItem {
	NZBID: number
	NZBName: string
	NZBFilename: string
	Kind: 'NZB' | 'URL'
	URL: string
	DestDir: string
	FinalDir: string
	Category: string
	FileSizeMB: number
	RemainingSizeMB: number
	PausedSizeMB: number
	FileCount: number
	RemainingFileCount: number
	Status: string
	Health: number
	CriticalHealth: number
	DownloadedSizeMB: number
	DownloadTimeSec: number
	ActiveDownloads: number
	MaxPriority: number
	PostInfoText: string
	PostStageProgress: number
}

// Generic JSON-RPC call helper
async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
	if (!nzbgetFetch) {
		throw new Error('NZBGet API not initialized - call initNzbgetApi() first')
	}
	const response = await nzbgetFetch<NzbgetRpcResponse<T>>('', {
		body: { method, params },
	})
	return response.result
}

// API functions

export async function fetchNzbgetVersion(): Promise<string> {
	return rpcCall<string>('version')
}

export async function fetchNzbgetStatus(): Promise<NzbgetStatus> {
	return rpcCall<NzbgetStatus>('status')
}

export async function listNzbgetQueue(): Promise<NzbgetQueueItem[]> {
	return rpcCall<NzbgetQueueItem[]>('listgroups', [0])
}

// Append NZB file to download queue
// Returns the NZBID of the added item (positive number) or 0 on failure
export async function appendNzb(options: {
	filename: string
	nzbContent: string // Base64-encoded NZB content
	category?: string
	priority?: number // -100 to 100, 0 is normal
	addToTop?: boolean
	addPaused?: boolean
}): Promise<number> {
	const { filename, nzbContent, category = '', priority = 0, addToTop = false, addPaused = false } = options

	// append(Filename, Content, Category, Priority, AddToTop, AddPaused, DupeKey, DupeScore, DupeMode)
	return rpcCall<number>('append', [
		filename,
		nzbContent,
		category,
		priority,
		addToTop,
		addPaused,
		'', // DupeKey
		0, // DupeScore
		'SCORE', // DupeMode
	])
}

// Config option from NZBGet
interface NzbgetConfigOption {
	Name: string
	Value: string
}

// Fetch current NZBGet config
export async function fetchNzbgetConfig(): Promise<NzbgetConfigOption[]> {
	return rpcCall<NzbgetConfigOption[]>('config')
}

// Save config options to NZBGet
// Returns true on success
export async function saveNzbgetConfig(options: NzbgetConfigOption[]): Promise<boolean> {
	return rpcCall<boolean>('saveconfig', [options])
}

// Convert UsenetServer to NZBGet config options
function usenetServerToConfigOptions(server: UsenetServer, index: number): NzbgetConfigOption[] {
	const n = index + 1 // NZBGet uses 1-based indexing
	return [
		{ Name: `Server${n}.Active`, Value: server.enabled ? 'yes' : 'no' },
		{ Name: `Server${n}.Name`, Value: server.name },
		{ Name: `Server${n}.Level`, Value: String(server.priority) },
		{ Name: `Server${n}.Host`, Value: server.host },
		{ Name: `Server${n}.Port`, Value: String(server.port) },
		{ Name: `Server${n}.Username`, Value: server.username },
		{ Name: `Server${n}.Password`, Value: server.password },
		{ Name: `Server${n}.Encryption`, Value: server.ssl ? 'yes' : 'no' },
		{ Name: `Server${n}.Connections`, Value: String(server.connections) },
		{ Name: `Server${n}.Optional`, Value: 'no' },
		{ Name: `Server${n}.Group`, Value: '0' },
		{ Name: `Server${n}.Retention`, Value: '0' },
		{ Name: `Server${n}.CertVerification`, Value: 'strict' },
		{ Name: `Server${n}.IpVersion`, Value: 'auto' },
	]
}

// Push Usenet servers to NZBGet config
// Clears existing servers and replaces with provided list
export async function pushUsenetServersToNzbget(servers: UsenetServer[]): Promise<boolean> {
	// Get current config to find existing servers
	const currentConfig = await fetchNzbgetConfig()
	const existingServerCount = currentConfig.filter((opt) => opt.Name.match(/^Server\d+\.Host$/)).length

	// Build config options for new servers
	const configOptions: NzbgetConfigOption[] = []

	// Add new server configs
	for (let i = 0; i < servers.length; i++) {
		configOptions.push(...usenetServerToConfigOptions(servers[i], i))
	}

	// Clear any extra servers that were previously configured
	// by setting their Host to empty (NZBGet ignores servers with empty host)
	for (let i = servers.length; i < existingServerCount; i++) {
		const n = i + 1
		configOptions.push({ Name: `Server${n}.Host`, Value: '' })
		configOptions.push({ Name: `Server${n}.Active`, Value: 'no' })
	}

	return saveNzbgetConfig(configOptions)
}

// Reload NZBGet config (applies changes)
export async function reloadNzbgetConfig(): Promise<boolean> {
	return rpcCall<boolean>('reload')
}

// Delete items from queue by NZBID
// command: GroupDelete, GroupPauseAllPars, etc.
export async function editNzbgetQueue(command: string, ids: number[]): Promise<boolean> {
	return rpcCall<boolean>('editqueue', [command, '', ids])
}

// Clear entire download queue
export async function clearNzbgetQueue(): Promise<boolean> {
	const queue = await listNzbgetQueue()
	if (queue.length === 0) return true
	const ids = queue.map((item) => item.NZBID)
	return editNzbgetQueue('GroupDelete', ids)
}

// Test Usenet server connection/auth
// Returns result string (e.g., "Connection success" or error message)
export async function testUsenetServer(server: { host: string; port: number; username: string; password: string; ssl: boolean }): Promise<string> {
	return rpcCall<string>('testserver', [
		server.host,
		server.port,
		server.username,
		server.password,
		server.ssl,
		'', // cipher (default)
		30, // timeout seconds
		2, // certVerifLevel: strict
	])
}
