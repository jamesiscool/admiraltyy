import { and, eq, notInArray } from 'drizzle-orm'
import { type $Fetch, ofetch } from 'ofetch'
import { db, schema } from '../db'
import { fileImport } from '../services/fileImport'
import { getSettings, type UsenetServer } from '../settings'
import type { NzbgetConfigOption, NzbgetHistoryItem, NzbgetQueueItem, NzbgetRpcResponse, NzbgetStatus } from './nzbgetSchema'

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

export async function listNzbgetHistory(showHidden = false): Promise<NzbgetHistoryItem[]> {
	return rpcCall<NzbgetHistoryItem[]>('history', [showHidden])
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
		2, // cert verification level: strict
	])
}

// Delete history items permanently by NZBID
export async function clearNzbgetHistory(nzbIds: number[]): Promise<boolean> {
	if (nzbIds.length === 0) return true
	return rpcCall<boolean>('editqueue', ['HistoryFinalDelete', '', nzbIds])
}

// Map NZBGet status to our download status
function mapNzbgetStatus(item: NzbgetHistoryItem): 'completed' | 'failed' {
	// SUCCESS, FAILURE, DELETED, or prefixed variants like SUCCESS/GOOD
	if (item.Status.startsWith('SUCCESS')) return 'completed'
	return 'failed'
}

// Sync NZBGet history to database and clear it
export async function syncNzbgetHistory(): Promise<{ synced: number; orphans: number; cleared: number }> {
	const history = await listNzbgetHistory()

	if (history.length === 0) {
		return { synced: 0, orphans: 0, cleared: 0 }
	}

	console.log(`[NZBGet Sync] Processing ${history.length} history item(s)`)

	let synced = 0
	let orphans = 0
	const syncedNzbIds: number[] = []

	for (const item of history) {
		console.log(`[NZBGet Sync] History item NZBID=${item.NZBID}: "${item.Name}" | Status=${item.Status}`)

		// Find download by nzbId (only match active downloads, not already completed/failed)
		const download = await db.query.downloads.findFirst({
			where: and(eq(schema.downloads.nzbId, item.NZBID), notInArray(schema.downloads.status, ['completed', 'failed'])),
		})

		if (!download) {
			console.log(`[NZBGet Sync] No DB download found for NZBID=${item.NZBID}`)
			orphans++
			// Still track for clearing - we don't want orphans cluttering history
			syncedNzbIds.push(item.NZBID)
			continue
		}

		console.log(`[NZBGet Sync] Matched DB download id=${download.id}, nzbId=${download.nzbId}, title="${download.title}"`)

		// Sanity check: warn if titles don't match
		if (!item.Name.includes(download.title.substring(0, 20)) && !download.title.includes(item.Name.substring(0, 20))) {
			console.warn(`[NZBGet Sync] ⚠️ TITLE MISMATCH! NZBGet="${item.Name}" vs DB="${download.title}"`)
		}

		// Update download with final state
		const nzbgetStatus = mapNzbgetStatus(item)
		const completedAt = new Date(item.HistoryTime * 1000).toISOString()

		await db
			.update(schema.downloads)
			.set({
				status: nzbgetStatus,
				parStatus: item.ParStatus,
				unpackStatus: item.UnpackStatus,
				finalDir: item.FinalDir || null,
				downloadedSizeMb: item.DownloadedSizeMB,
				downloadTimeSec: item.DownloadTimeSec,
				completedAt,
				progress: 100,
				nzbId: null, // Clear to prevent stale matches (NZBGet reuses IDs)
			})
			.where(eq(schema.downloads.id, download.id))

		syncedNzbIds.push(item.NZBID)
		synced++
		console.log(`[NZBGet Sync] Updated download id=${download.id}: ${nzbgetStatus} (par=${item.ParStatus}, unpack=${item.UnpackStatus})`)

		// Auto-import if completed with finalDir
		// UnpackStatus: SUCCESS = unpacked, NONE = no archives to unpack
		const canImport = nzbgetStatus === 'completed' && item.FinalDir && (item.UnpackStatus === 'SUCCESS' || item.UnpackStatus === 'NONE')
		if (canImport) {
			console.log(`[NZBGet Sync] Starting import for download id=${download.id}`)
			await db.update(schema.downloads).set({ status: 'importing' }).where(eq(schema.downloads.id, download.id))

			const importResult = await fileImport(download.id)
			if (importResult.success) {
				await db.update(schema.downloads).set({ status: 'imported' }).where(eq(schema.downloads.id, download.id))
				console.log(`[NZBGet Sync] Import complete: ${importResult.filesImported} file(s)`)
			} else {
				await db.update(schema.downloads).set({ status: 'failed', errorMessage: importResult.error }).where(eq(schema.downloads.id, download.id))
				console.log(`[NZBGet Sync] Import failed: ${importResult.error}`)
			}
		}
	}

	// Clear synced history items from NZBGet
	if (syncedNzbIds.length > 0) {
		await clearNzbgetHistory(syncedNzbIds)
		console.log(`[NZBGet Sync] Cleared ${syncedNzbIds.length} history items from NZBGet`)
	}

	return { synced, orphans, cleared: syncedNzbIds.length }
}
