import type { Subprocess } from 'bun'
import { and, eq, notInArray } from 'drizzle-orm'
import { type $Fetch, ofetch } from 'ofetch'
import { db, schema } from '@/db'
import { fileImport } from '@/services/fileImport.server'
import type { NzbgetConfigOption, NzbgetHistoryItem, NzbgetQueueItem, NzbgetRpcResponse, NzbgetStatus } from '@/services/nzbget'
import type { UsenetServer } from '@/services/settings'
import { ensureNzbgetPassword, getSettings } from '@/services/settings.server'

// ============================================================================
// DB Helpers
// ============================================================================

// Map NZBGet status to our download status
export function mapNzbgetStatus(item: NzbgetHistoryItem): 'completed' | 'failed' {
	if (item.Status.startsWith('SUCCESS')) return 'completed'
	return 'failed'
}

// Find download by nzbId (only match active downloads, not already completed/failed)
export async function findActiveDownloadByNzbId(nzbId: number) {
	return db.query.downloads.findFirst({
		where: and(eq(schema.downloads.nzbId, nzbId), notInArray(schema.downloads.status, ['completed', 'failed'])),
	})
}

// Update download with completed state from NZBGet history
export async function updateDownloadFromHistory(
	downloadId: number,
	data: {
		status: 'completed' | 'failed'
		parStatus: string
		unpackStatus: string
		finalDir: string | null
		downloadedSizeMb: number
		downloadTimeSec: number
		completedAt: string
	},
) {
	await db
		.update(schema.downloads)
		.set({
			status: data.status,
			parStatus: data.parStatus,
			unpackStatus: data.unpackStatus,
			finalDir: data.finalDir,
			downloadedSizeMb: data.downloadedSizeMb,
			downloadTimeSec: data.downloadTimeSec,
			completedAt: data.completedAt,
			progress: 100,
			nzbId: null, // Clear to prevent stale matches (NZBGet reuses IDs)
		})
		.where(eq(schema.downloads.id, downloadId))
}

// Update download status
export async function updateDownloadStatus(downloadId: number, status: schema.DownloadStatus, errorMessage?: string) {
	await db.update(schema.downloads).set({ status, errorMessage }).where(eq(schema.downloads.id, downloadId))
}

// ============================================================================
// API Client
// ============================================================================

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

// ============================================================================
// API Functions
// ============================================================================

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
		const download = await findActiveDownloadByNzbId(item.NZBID)

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

		await updateDownloadFromHistory(download.id, {
			status: nzbgetStatus,
			parStatus: item.ParStatus,
			unpackStatus: item.UnpackStatus,
			finalDir: item.FinalDir || null,
			downloadedSizeMb: item.DownloadedSizeMB,
			downloadTimeSec: item.DownloadTimeSec,
			completedAt,
		})

		syncedNzbIds.push(item.NZBID)
		synced++
		console.log(`[NZBGet Sync] Updated download id=${download.id}: ${nzbgetStatus} (par=${item.ParStatus}, unpack=${item.UnpackStatus})`)

		// Auto-import if completed with finalDir
		// UnpackStatus: SUCCESS = unpacked, NONE = no archives to unpack
		const canImport = nzbgetStatus === 'completed' && item.FinalDir && (item.UnpackStatus === 'SUCCESS' || item.UnpackStatus === 'NONE')
		if (canImport) {
			console.log(`[NZBGet Sync] Starting import for download id=${download.id}`)
			await updateDownloadStatus(download.id, 'importing')

			const importResult = await fileImport(download.id)
			if (importResult.success) {
				await updateDownloadStatus(download.id, 'imported')
				console.log(`[NZBGet Sync] Import complete: ${importResult.filesImported} file(s)`)
			} else {
				await updateDownloadStatus(download.id, 'failed', importResult.error)
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

// ============================================================================
// Poller
// ============================================================================

const SLOW_INTERVAL_MS = 30_000 // 30s when idle
const FAST_INTERVAL_MS = 2_000 // 2s when active
const COOLDOWN_MS = 60_000 // stay fast for 60s after last activity

let lastActivityAt = 0
let currentTimer: ReturnType<typeof setTimeout> | null = null
let isPolling: boolean = false
let isPollerStarted: boolean = false

export function startNzbgetPoller() {
	if (isPollerStarted) return
	isPollerStarted = true
	scheduleNext(SLOW_INTERVAL_MS)
	console.log('[NZBget Poller] Started')
}

export function stopNzbgetPoller() {
	if (currentTimer) {
		clearTimeout(currentTimer)
		currentTimer = null
	}
	isPollerStarted = false
}

// Call when adding a download to immediately switch to fast mode
export function notifyDownloadActivity() {
	lastActivityAt = Date.now()
	// Reschedule immediately if we're in slow mode
	if (currentTimer && isPollerStarted) {
		clearTimeout(currentTimer)
		scheduleNext(FAST_INTERVAL_MS)
	}
}

function scheduleNext(delayMs: number) {
	currentTimer = setTimeout(poll, delayMs)
}

async function poll() {
	if (isPolling) return
	isPolling = true

	try {
		const [status, queue] = await Promise.all([fetchNzbgetStatus(), listNzbgetQueue()])

		const isDownloading = queue.length > 0 || status.DownloadRate > 0
		const isPostProcessing = status.PostJobCount > 0
		const hasActiveWork = isDownloading || isPostProcessing

		if (hasActiveWork) {
			lastActivityAt = Date.now()
			console.log(`[NZBget Poller] Active: queue=${queue.length}, rate=${(status.DownloadRate / 1024 / 1024).toFixed(1)}MB/s, postJobs=${status.PostJobCount}`)
		}

		// Only sync history when both downloading AND post-processing are complete
		if (!hasActiveWork) {
			const result = await syncNzbgetHistory()
			if (result.synced > 0 || result.orphans > 0) {
				console.log(`[NZBget Poller] Synced history: ${result.synced} updated, ${result.orphans} orphans, ${result.cleared} cleared`)
			}
		}

		// Determine next interval
		const timeSinceActivity = Date.now() - lastActivityAt
		const inCooldown = timeSinceActivity < COOLDOWN_MS
		const nextInterval = hasActiveWork || inCooldown ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS

		scheduleNext(nextInterval)
	} catch (err) {
		console.error('[NZBget Poller] Error:', err)
		// On error, back off
		scheduleNext(SLOW_INTERVAL_MS)
	} finally {
		isPolling = false
	}
}

// ============================================================================
// Process Management
// ============================================================================

let nzbgetProcess: Subprocess | null = null

// Cleanup NZBGet on process exit
process.on('SIGTERM', () => stopNzbget())
process.on('SIGINT', () => stopNzbget())

export function isNzbgetRunning(): boolean {
	return nzbgetProcess !== null && !nzbgetProcess.killed
}

export async function isNzbgetPortInUse(port: number) {
	// Use lsof to find PID using the port (works on macOS and Linux)
	const lsof = Bun.spawn(['lsof', '-t', `-i:${port}`], {
		stdout: 'pipe',
		stderr: 'ignore',
	})
	await lsof.exited

	const { stdout } = lsof
	if (!stdout || typeof stdout === 'number') return false

	const text = await new Response(stdout).text()
	const pids = text.trim().split('\n').filter(Boolean)
	return pids.length > 0
}

// Test if we can connect to running NZBGet with current credentials
async function canConnectToNzbget(): Promise<boolean> {
	const { username, password, host, port } = getSettings().nzbgetSettings
	const auth = Buffer.from(`${username}:${password}`).toString('base64')
	try {
		const res = await fetch(`http://${host}:${port}/jsonrpc`, {
			method: 'POST',
			headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ method: 'version', params: [] }),
		})
		return res.ok
	} catch {
		return false
	}
}

async function killProcessOnPort(port: number): Promise<boolean> {
	try {
		// Use lsof to find PID using the port (works on macOS and Linux)
		const lsof = Bun.spawn(['lsof', '-t', `-i:${port}`], {
			stdout: 'pipe',
			stderr: 'ignore',
		})
		await lsof.exited

		const { stdout } = lsof
		if (!stdout || typeof stdout === 'number') return false

		const text = await new Response(stdout).text()
		const pids = text.trim().split('\n').filter(Boolean)

		if (pids.length === 0) return false

		console.log(`⚠ Port ${port} in use by PID(s): ${pids.join(', ')} - killing...`)

		for (const pid of pids) {
			const kill = Bun.spawn(['kill', '-9', pid], { stdout: 'ignore', stderr: 'ignore' })
			await kill.exited
		}

		// Brief wait for port to be released
		await Bun.sleep(500)
		console.log(`✓ Killed process(es) on port ${port}`)
		return true
	} catch {
		return false
	}
}

function buildServerArgs(servers: UsenetServer[]): string[] {
	const args: string[] = []
	for (let i = 0; i < servers.length; i++) {
		const srv = servers[i]
		const n = i + 1 // NZBGet uses 1-based indexing
		args.push('-o', `Server${n}.Active=${srv.enabled ? 'yes' : 'no'}`)
		args.push('-o', `Server${n}.Name=${srv.name}`)
		args.push('-o', `Server${n}.Level=${srv.priority}`)
		args.push('-o', `Server${n}.Host=${srv.host}`)
		args.push('-o', `Server${n}.Port=${srv.port}`)
		args.push('-o', `Server${n}.Username=${srv.username}`)
		args.push('-o', `Server${n}.Password=${srv.password}`)
		args.push('-o', `Server${n}.Encryption=${srv.ssl ? 'yes' : 'no'}`)
		args.push('-o', `Server${n}.Connections=${srv.connections}`)
		args.push('-o', `Server${n}.Retention=0`)
	}
	return args
}

async function clearQueueOnStartup(): Promise<void> {
	// Wait for NZBGet to be fully ready
	await Bun.sleep(1000)
	try {
		const cleared = await clearNzbgetQueue()
		if (cleared) {
			console.log('✓ Cleared NZBGet queue on startup')
		}
	} catch (err) {
		console.error('✗ Failed to clear NZBGet queue:', err)
	}
}

export async function startNzbget() {
	const settings = getSettings()

	// Check if NZBGet is already running (e.g. from previous run or hot reload)
	if (await isNzbgetPortInUse(settings.nzbgetSettings.port)) {
		// Verify we can connect with current credentials
		if (await canConnectToNzbget()) {
			initNzbgetApi()
			startNzbgetPoller()
			console.log('✓ Adopted existing NZBGet on port', settings.nzbgetSettings.port)
			return
		}
		// Can't connect - credentials mismatch, restart NZBGet
		console.log('⚠ NZBGet on port but auth failed, restarting with current credentials...')
		await killProcessOnPort(settings.nzbgetSettings.port)
	}

	const password = ensureNzbgetPassword()

	const { username, host, port } = settings.nzbgetSettings
	const downloadFolder = settings.downloadFolder || '/tmp/admiralty-downloads'

	// Kill any existing process on the port before starting
	await killProcessOnPort(port)

	const serverArgs = buildServerArgs(settings.usenetServers)

	const args = [
		'nzbget',
		'-n', // run without config file
		'-s', // server mode (console)
		'-o',
		`ControlUsername=${username}`,
		'-o',
		`ControlPassword=${password}`,
		'-o',
		`ControlIP=${host}`,
		'-o',
		`ControlPort=${port}`,
		'-o',
		'OutputMode=log',
		'-o',
		`DestDir=${downloadFolder}`,
		'-o',
		`InterDir=${downloadFolder}/.incomplete`,
		// // Unpacking settings
		// '-o',
		// 'Unpack=yes',
		// '-o',
		// 'UnrarCmd=unrar',
		// '-o',
		// 'SevenZipCmd=7z',
		// '-o',
		// 'DirectUnpack=yes',
		// '-o',
		// 'UnpackCleanupDisk=yes',
		...serverArgs,
	]

	const serverCount = settings.usenetServers.length
	console.log(`🚀 Starting NZBGet on ${host}:${port} (dest: ${downloadFolder}, ${serverCount} server(s))...`)

	try {
		nzbgetProcess = Bun.spawn(args, {
			stdout: 'pipe',
			stderr: 'pipe',
			onExit(_proc, exitCode, signalCode) {
				console.log(`⏹ NZBGet exited (code: ${exitCode}, signal: ${signalCode})`)
				nzbgetProcess = null
			},
		})

		// Stream stdout/stderr to console
		const { stdout, stderr } = nzbgetProcess
		if (stdout && typeof stdout !== 'number') {
			streamOutput(stdout, 'nzbget')
		}
		if (stderr && typeof stderr !== 'number') {
			streamOutput(stderr, 'nzbget:err')
		}

		// Initialize the API client now that NZBGet is running
		initNzbgetApi()
		startNzbgetPoller()

		console.log(`✓ NZBGet started (pid: ${nzbgetProcess.pid})`)

		// Clear queue after startup (with delay for NZBGet to be ready)
		clearQueueOnStartup()

		return true
	} catch (err) {
		console.error('✗ Failed to start NZBGet:', err)
		nzbgetProcess = null
		return false
	}
}

export async function stopNzbget(): Promise<void> {
	stopNzbgetPoller()
	const port = getSettings().nzbgetSettings.port

	// If we have a reference to the process, use it
	if (nzbgetProcess && !nzbgetProcess.killed) {
		console.log('⏹ Stopping NZBGet...')
		try {
			nzbgetProcess.kill('SIGTERM')
			const timeout = setTimeout(() => {
				if (nzbgetProcess && !nzbgetProcess.killed) {
					console.log('⚠ NZBGet did not exit gracefully, forcing kill...')
					nzbgetProcess.kill('SIGKILL')
				}
			}, 5000)
			await nzbgetProcess.exited
			clearTimeout(timeout)
			console.log('✓ NZBGet stopped')
		} catch (err) {
			console.error('✗ Error stopping NZBGet:', err)
		} finally {
			nzbgetProcess = null
		}
		return
	}

	// Fallback: kill by port (e.g. orphan process from hot reload)
	if (await isNzbgetPortInUse(port)) {
		await killProcessOnPort(port)
		console.log('✓ Killed NZBGet process on port', port)
		return
	}

	console.log('No NZBGet process found, skipping stop')
}

async function streamOutput(stream: ReadableStream<Uint8Array>, prefix: string): Promise<void> {
	const reader = stream.getReader()
	const decoder = new TextDecoder()

	try {
		for (;;) {
			const { done, value } = await reader.read()
			if (done) break
			const text = decoder.decode(value, { stream: true })
			for (const line of text.split('\n')) {
				// Skip verbose DETAIL logs (per-article status)
				if (line.trim() && !line.includes('[DETAIL]')) {
					console.log(`[${prefix}] ${line}`)
				}
			}
		}
	} catch {
		// Stream closed
	}
}
