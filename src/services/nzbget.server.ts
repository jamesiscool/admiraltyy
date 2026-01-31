import type { Subprocess } from 'bun'
import { and, eq, notInArray } from 'drizzle-orm'
import { type $Fetch, ofetch } from 'ofetch'
import { db, schema } from '@/db'
import { fileImport } from '@/services/fileImport.server'
import type { NzbgetConfigOption, NzbgetHistoryItem, NzbgetQueueItem, NzbgetRpcResponse, NzbgetStatus } from '@/services/nzbget'
import type { UsenetServer } from '@/services/settings'
import { ensureNzbgetPassword, getSettings } from '@/services/settings.server'

// ============================================================================
// Constants
// ============================================================================

const STARTUP_TIMEOUT_MS = 10_000
const STARTUP_POLL_INTERVAL_MS = 200

// ============================================================================
// DB Helpers
// ============================================================================

export function mapNzbgetStatus(item: NzbgetHistoryItem): 'completed' | 'failed' {
	if (item.Status.startsWith('SUCCESS')) return 'completed'
	return 'failed'
}

export async function findActiveDownloadByNzbId(nzbId: number) {
	return db.query.downloads.findFirst({
		where: and(eq(schema.downloads.nzbId, nzbId), notInArray(schema.downloads.status, ['completed', 'failed'])),
	})
}

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
			nzbId: null,
		})
		.where(eq(schema.downloads.id, downloadId))
}

export async function updateDownloadStatus(downloadId: number, status: schema.DownloadStatus, errorMessage?: string) {
	await db.update(schema.downloads).set({ status, errorMessage }).where(eq(schema.downloads.id, downloadId))
}

// ============================================================================
// API Client
// ============================================================================

let nzbgetFetch: $Fetch | null = null
let nzbgetStartPromise: Promise<boolean> | null = null

function ensureNzbgetApiInitialized(): $Fetch {
	if (!nzbgetFetch) {
		const { username, password, host, port } = getSettings().nzbgetSettings
		const baseURL = `http://${host}:${port}/jsonrpc`
		const auth = Buffer.from(`${username}:${password}`).toString('base64')
		nzbgetFetch = ofetch.create({
			baseURL,
			method: 'POST',
			headers: { Authorization: `Basic ${auth}` },
		})
	}
	return nzbgetFetch
}

export function reinitNzbgetApi(): void {
	nzbgetFetch = null
}

// Lazy-start NZBGet on first API call
async function ensureNzbgetRunning(): Promise<void> {
	if (!nzbgetStartPromise) {
		// Start NZBGet (this is idempotent - will adopt existing process if running)
		nzbgetStartPromise = startNzbget()
	}
	await nzbgetStartPromise
}

async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
	await ensureNzbgetRunning()
	const client = ensureNzbgetApiInitialized()
	const response = await client<NzbgetRpcResponse<T>>('', { body: { method, params } })
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

export async function appendNzb(options: { filename: string; nzbContent: string; category?: string; priority?: number; addToTop?: boolean; addPaused?: boolean }): Promise<number> {
	const { filename, nzbContent, category = '', priority = 0, addToTop = false, addPaused = false } = options
	return rpcCall<number>('append', [filename, nzbContent, category, priority, addToTop, addPaused, '', 0, 'SCORE'])
}

export async function fetchNzbgetConfig(): Promise<NzbgetConfigOption[]> {
	return rpcCall<NzbgetConfigOption[]>('config')
}

export async function saveNzbgetConfig(options: NzbgetConfigOption[]): Promise<boolean> {
	return rpcCall<boolean>('saveconfig', [options])
}

function usenetServerToConfigOptions(server: UsenetServer, index: number): NzbgetConfigOption[] {
	const serverNumber = index + 1
	return [
		{ Name: `Server${serverNumber}.Active`, Value: server.enabled ? 'yes' : 'no' },
		{ Name: `Server${serverNumber}.Name`, Value: server.name },
		{ Name: `Server${serverNumber}.Level`, Value: String(server.priority) },
		{ Name: `Server${serverNumber}.Host`, Value: server.host },
		{ Name: `Server${serverNumber}.Port`, Value: String(server.port) },
		{ Name: `Server${serverNumber}.Username`, Value: server.username },
		{ Name: `Server${serverNumber}.Password`, Value: server.password },
		{ Name: `Server${serverNumber}.Encryption`, Value: server.ssl ? 'yes' : 'no' },
		{ Name: `Server${serverNumber}.Connections`, Value: String(server.connections) },
		{ Name: `Server${serverNumber}.Optional`, Value: 'no' },
		{ Name: `Server${serverNumber}.Group`, Value: '0' },
		{ Name: `Server${serverNumber}.Retention`, Value: '0' },
		{ Name: `Server${serverNumber}.CertVerification`, Value: 'strict' },
		{ Name: `Server${serverNumber}.IpVersion`, Value: 'auto' },
	]
}

export async function pushUsenetServersToNzbget(servers: UsenetServer[]): Promise<boolean> {
	const currentConfig = await fetchNzbgetConfig()
	const existingServerCount = currentConfig.filter((opt) => opt.Name.match(/^Server\d+\.Host$/)).length
	const configOptions: NzbgetConfigOption[] = []

	for (let i = 0; i < servers.length; i++) {
		configOptions.push(...usenetServerToConfigOptions(servers[i], i))
	}

	for (let i = servers.length; i < existingServerCount; i++) {
		const serverNumber = i + 1
		configOptions.push({ Name: `Server${serverNumber}.Host`, Value: '' })
		configOptions.push({ Name: `Server${serverNumber}.Active`, Value: 'no' })
	}

	return saveNzbgetConfig(configOptions)
}

export async function reloadNzbgetConfig(): Promise<boolean> {
	return rpcCall<boolean>('reload')
}

export async function editNzbgetQueue(command: string, ids: number[]): Promise<boolean> {
	return rpcCall<boolean>('editqueue', [command, '', ids])
}

export async function clearNzbgetQueue(): Promise<boolean> {
	const queue = await listNzbgetQueue()
	if (queue.length === 0) return true
	return editNzbgetQueue(
		'GroupDelete',
		queue.map((item) => item.NZBID),
	)
}

export async function testUsenetServer(server: { host: string; port: number; username: string; password: string; ssl: boolean }): Promise<string> {
	return rpcCall<string>('testserver', [server.host, server.port, server.username, server.password, server.ssl, '', 30, 2])
}

export async function clearNzbgetHistory(nzbIds: number[]): Promise<boolean> {
	if (nzbIds.length === 0) return true
	return rpcCall<boolean>('editqueue', ['HistoryFinalDelete', '', nzbIds])
}

export async function syncNzbgetHistory(): Promise<{ synced: number; orphans: number; cleared: number }> {
	const history = await listNzbgetHistory()
	if (history.length === 0) return { synced: 0, orphans: 0, cleared: 0 }

	console.log(`[NZBGet Sync] Processing ${history.length} history item(s)`)

	let synced = 0
	let orphans = 0
	const syncedNzbIds: number[] = []

	for (const item of history) {
		console.log(`[NZBGet Sync] History item NZBID=${item.NZBID}: "${item.Name}" | Status=${item.Status}`)
		const download = await findActiveDownloadByNzbId(item.NZBID)

		if (!download) {
			console.log(`[NZBGet Sync] No DB download found for NZBID=${item.NZBID}`)
			orphans++
			syncedNzbIds.push(item.NZBID)
			continue
		}

		console.log(`[NZBGet Sync] Matched DB download id=${download.id}, nzbId=${download.nzbId}, title="${download.title}"`)

		if (!item.Name.includes(download.title.substring(0, 20)) && !download.title.includes(item.Name.substring(0, 20))) {
			console.warn(`[NZBGet Sync] ⚠️ TITLE MISMATCH! NZBGet="${item.Name}" vs DB="${download.title}"`)
		}

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

	if (syncedNzbIds.length > 0) {
		await clearNzbgetHistory(syncedNzbIds)
		console.log(`[NZBGet Sync] Cleared ${syncedNzbIds.length} history items from NZBGet`)
	}

	return { synced, orphans, cleared: syncedNzbIds.length }
}

// ============================================================================
// Process Management
// ============================================================================

let nzbgetProcess: Subprocess | null = null

process.on('SIGTERM', () => stopNzbget())
process.on('SIGINT', () => stopNzbget())

export function isNzbgetRunning(): boolean {
	return nzbgetProcess !== null && !nzbgetProcess.killed
}

async function findPidsOnPort(port: number): Promise<string[]> {
	const proc = Bun.spawn(['lsof', '-t', `-i:${port}`], { stdout: 'pipe', stderr: 'ignore' })
	await proc.exited
	if (!proc.stdout || typeof proc.stdout === 'number') return []
	const text = await new Response(proc.stdout).text()
	return text.trim().split('\n').filter(Boolean)
}

export async function isNzbgetPortInUse(port: number): Promise<boolean> {
	return (await findPidsOnPort(port)).length > 0
}

async function killProcessOnPort(port: number): Promise<boolean> {
	const pids = await findPidsOnPort(port)
	if (pids.length === 0) return false

	console.log(`⚠ Port ${port} in use by PID(s): ${pids.join(', ')} - killing...`)
	for (const pid of pids) {
		const kill = Bun.spawn(['kill', '-9', pid], { stdout: 'ignore', stderr: 'ignore' })
		await kill.exited
	}
	await Bun.sleep(500)
	console.log(`✓ Killed process(es) on port ${port}`)
	return true
}

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

async function waitForNzbgetReady(timeoutMs: number): Promise<boolean> {
	const startedAt = Date.now()
	while (Date.now() - startedAt < timeoutMs) {
		if (await canConnectToNzbget()) return true
		await Bun.sleep(STARTUP_POLL_INTERVAL_MS)
	}
	return false
}

async function checkNzbgetBinary(): Promise<boolean> {
	const proc = Bun.spawn(['which', 'nzbget'], { stdout: 'pipe', stderr: 'ignore' })
	const exitCode = await proc.exited
	return exitCode === 0
}

function buildServerArgs(servers: UsenetServer[]): string[] {
	const args: string[] = []
	for (let i = 0; i < servers.length; i++) {
		const srv = servers[i]
		const n = i + 1
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

export async function startNzbget(): Promise<boolean> {
	const settings = getSettings()
	const { host, port } = settings.nzbgetSettings

	// Check if NZBGet already running and usable
	if (await isNzbgetPortInUse(port)) {
		if (await canConnectToNzbget()) {
			console.log('✓ Adopted existing NZBGet on port', port)
			return true
		}
		console.log('⚠ NZBGet on port but auth failed, restarting...')
		await killProcessOnPort(port)
	}

	// Verify binary exists
	if (!(await checkNzbgetBinary())) {
		console.error('✗ nzbget binary not found. Install with: apt install nzbget')
		return false
	}

	const password = ensureNzbgetPassword()
	const downloadFolder = settings.downloadFolder || '/tmp/admiralty-downloads'

	await killProcessOnPort(port)

	const args = [
		'nzbget',
		'-n',
		'-s',
		'-o',
		`ControlUsername=${settings.nzbgetSettings.username}`,
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
		...buildServerArgs(settings.usenetServers),
	]

	console.log(`🚀 Starting NZBGet on ${host}:${port} (dest: ${downloadFolder}, ${settings.usenetServers.length} server(s))...`)

	try {
		nzbgetProcess = Bun.spawn(args, {
			stdout: 'pipe',
			stderr: 'pipe',
			onExit(_proc, exitCode, signalCode) {
				console.log(`⏹ NZBGet exited (code: ${exitCode}, signal: ${signalCode})`)
				nzbgetProcess = null
			},
		})

		// Stream output
		if (nzbgetProcess.stdout && typeof nzbgetProcess.stdout !== 'number') {
			streamOutput(nzbgetProcess.stdout, 'nzbget')
		}
		if (nzbgetProcess.stderr && typeof nzbgetProcess.stderr !== 'number') {
			streamOutput(nzbgetProcess.stderr, 'nzbget:err')
		}

		// Wait for NZBGet to be ready
		const ready = await waitForNzbgetReady(STARTUP_TIMEOUT_MS)
		if (!ready) {
			console.error('✗ NZBGet failed to start (timeout waiting for port)')
			if (nzbgetProcess && !nzbgetProcess.killed) {
				nzbgetProcess.kill()
			}
			nzbgetProcess = null
			return false
		}

		console.log(`✓ NZBGet started (pid: ${nzbgetProcess.pid})`)

		// Clear queue on startup (non-blocking)
		clearNzbgetQueue()
			.then((cleared) => {
				if (cleared) console.log('✓ Cleared NZBGet queue on startup')
			})
			.catch((err) => {
				console.error('✗ Failed to clear NZBGet queue:', err)
			})

		return true
	} catch (err) {
		console.error('✗ Failed to start NZBGet:', err)
		nzbgetProcess = null
		return false
	}
}

export async function stopNzbget(): Promise<void> {
	const port = getSettings().nzbgetSettings.port

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
				if (line.trim() && !line.includes('[DETAIL]')) {
					console.log(`[${prefix}] ${line}`)
				}
			}
		}
	} catch {
		// Stream closed
	}
}
