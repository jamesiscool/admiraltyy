import { and, eq, notInArray } from 'drizzle-orm'
import { ofetch } from 'ofetch'
import { db, schema } from '@/db'
import { processDownloadImport } from '@/services/fileImport.server'
import type { NzbgetConfigOption, NzbgetHistoryItem, NzbgetQueueItem, NzbgetRpcResponse, NzbgetStatus } from '@/services/nzbget'
import type { UsenetServer } from '@/services/settings'
import { ensureDownloadFolder, ensureNzbgetPassword, getSettings } from '@/services/settings.server'

// --- Constants ---

const STARTUP_TIMEOUT_MS = 10_000
const STARTUP_POLL_INTERVAL_MS = 200

// --- DB Helpers ---

export function mapNzbgetStatus(item: NzbgetHistoryItem) {
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

// --- API Client ---

function initializeNzbgetFetch() {
	const { username, password, host, port } = getSettings().nzbgetSettings
	const baseURL = `http://${host}:${port}/jsonrpc`
	const auth = Buffer.from(`${username}:${password}`).toString('base64')
	return ofetch.create({
		baseURL,
		method: 'POST',
		headers: { Authorization: `Basic ${auth}` },
	})
}

const nzbgetFetch = initializeNzbgetFetch()

async function rpcCall<T>(method: string, params: unknown[] = []) {
	const response = await nzbgetFetch<NzbgetRpcResponse<T>>('', { body: { method, params } })
	return response.result
}

// --- API Functions ---

export async function fetchNzbgetVersion() {
	return rpcCall<string>('version')
}

export async function fetchNzbgetStatus() {
	return rpcCall<NzbgetStatus>('status')
}

export async function listNzbgetQueue() {
	return rpcCall<NzbgetQueueItem[]>('listgroups', [0])
}

export async function listNzbgetHistory(showHidden = false) {
	return rpcCall<NzbgetHistoryItem[]>('history', [showHidden])
}

export async function appendNzb(options: { filename: string; nzbContent: string; category?: string; priority?: number; addToTop?: boolean; addPaused?: boolean }) {
	const { filename, nzbContent, category = '', priority = 0, addToTop = false, addPaused = false } = options
	return rpcCall<number>('append', [filename, nzbContent, category, priority, addToTop, addPaused, '', 0, 'SCORE'])
}

export async function fetchNzbgetConfig() {
	return rpcCall<NzbgetConfigOption[]>('config')
}

export async function saveNzbgetConfig(options: NzbgetConfigOption[]) {
	return rpcCall<boolean>('saveconfig', [options])
}

function usenetServerToConfigOptions(server: UsenetServer, index: number) {
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

export async function pushUsenetServersToNzbget(servers: UsenetServer[]) {
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

export async function reloadNzbgetConfig() {
	return rpcCall<boolean>('reload')
}

export async function editNzbgetQueue(command: string, ids: number[]) {
	return rpcCall<boolean>('editqueue', [command, '', ids])
}

export async function clearNzbgetQueue() {
	const queue = await listNzbgetQueue()
	if (queue.length === 0) return true
	return editNzbgetQueue(
		'GroupDelete',
		queue.map((item) => item.NZBID),
	)
}

export async function testUsenetServer(server: { host: string; port: number; username: string; password: string; ssl: boolean }) {
	return rpcCall<string>('testserver', [server.host, server.port, server.username, server.password, server.ssl, '', 30, 2])
}

export async function clearNzbgetHistory(nzbIds: number[]) {
	if (nzbIds.length === 0) return true
	return rpcCall<boolean>('editqueue', ['HistoryFinalDelete', '', nzbIds])
}

export async function syncNzbgetHistory() {
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

		// FinalDir only set after unpacking; use DestDir when no unpack needed
		const downloadDir = item.FinalDir || item.DestDir || null

		await updateDownloadFromHistory(download.id, {
			status: nzbgetStatus,
			parStatus: item.ParStatus,
			unpackStatus: item.UnpackStatus,
			finalDir: downloadDir,
			downloadedSizeMb: item.DownloadedSizeMB,
			downloadTimeSec: item.DownloadTimeSec,
			completedAt,
		})

		syncedNzbIds.push(item.NZBID)
		synced++
		console.log(`[NZBGet Sync] Updated download id=${download.id}: ${nzbgetStatus} (par=${item.ParStatus}, unpack=${item.UnpackStatus}, dir=${downloadDir})`)

		const canImport = nzbgetStatus === 'completed' && downloadDir && (item.UnpackStatus === 'SUCCESS' || item.UnpackStatus === 'NONE')
		if (canImport) {
			await processDownloadImport(download.id)
		}
	}

	if (syncedNzbIds.length > 0) {
		await clearNzbgetHistory(syncedNzbIds)
		console.log(`[NZBGet Sync] Cleared ${syncedNzbIds.length} history items from NZBGet`)
	}

	return { synced, orphans, cleared: syncedNzbIds.length }
}

// --- Process Management ---

process.on('SIGTERM', () => stopNzbget())
process.on('SIGINT', () => stopNzbget())

async function findPidsOnPort(port: number) {
	const proc = Bun.spawn(['lsof', '-t', `-i:${port}`], { stdout: 'pipe', stderr: 'ignore' })
	await proc.exited
	if (!proc.stdout || typeof proc.stdout === 'number') return []
	const text = await new Response(proc.stdout).text()
	return text.trim().split('\n').filter(Boolean)
}

export async function isNzbgetPortInUse(port: number) {
	return (await findPidsOnPort(port)).length > 0
}

async function killProcessOnPort(port: number) {
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

async function startNzbget() {
	const settings = getSettings()
	const { username, password, host, port } = settings.nzbgetSettings

	// Check if NZBGet already running and usable
	const pidsOnPort = await findPidsOnPort(port)
	if (pidsOnPort.length > 0) {
		const auth = Buffer.from(`${username}:${password}`).toString('base64')
		try {
			const res = await fetch(`http://${host}:${port}/jsonrpc`, {
				method: 'POST',
				headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ method: 'version', params: [] }),
			})
			if (res.ok) {
				console.log('✓ Adopted existing NZBGet on port', port)
				return null
			}
		} catch {
			// Connection failed, will restart
		}
		console.log('⚠ NZBGet on port but auth failed, restarting...')
		await killProcessOnPort(port)
	}

	// Verify binary exists
	const whichProc = Bun.spawn(['which', 'nzbget'], { stdout: 'pipe', stderr: 'ignore' })
	if ((await whichProc.exited) !== 0) {
		console.error('✗ nzbget binary not found. Install with: apt install nzbget')
		return null
	}

	const nzbgetPassword = ensureNzbgetPassword()
	const downloadFolder = ensureDownloadFolder()

	await killProcessOnPort(port)

	// Build server args inline
	const serverArgs: string[] = []
	for (let i = 0; i < settings.usenetServers.length; i++) {
		const srv = settings.usenetServers[i]
		const n = i + 1
		serverArgs.push('-o', `Server${n}.Active=${srv.enabled ? 'yes' : 'no'}`)
		serverArgs.push('-o', `Server${n}.Name=${srv.name}`)
		serverArgs.push('-o', `Server${n}.Level=${srv.priority}`)
		serverArgs.push('-o', `Server${n}.Host=${srv.host}`)
		serverArgs.push('-o', `Server${n}.Port=${srv.port}`)
		serverArgs.push('-o', `Server${n}.Username=${srv.username}`)
		serverArgs.push('-o', `Server${n}.Password=${srv.password}`)
		serverArgs.push('-o', `Server${n}.Encryption=${srv.ssl ? 'yes' : 'no'}`)
		serverArgs.push('-o', `Server${n}.Connections=${srv.connections}`)
		serverArgs.push('-o', `Server${n}.Retention=0`)
	}

	const args = [
		'nzbget',
		'-n',
		'-s',
		'-o',
		`ControlUsername=${username}`,
		'-o',
		`ControlPassword=${nzbgetPassword}`,
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
		...serverArgs,
	]

	console.log(`🚀 Starting NZBGet on ${host}:${port} (dest: ${downloadFolder}, ${settings.usenetServers.length} server(s))...`)

	try {
		const proc = Bun.spawn(args, {
			stdout: 'pipe',
			stderr: 'pipe',
			onExit(_proc, exitCode, signalCode) {
				console.log(`⏹ NZBGet exited (code: ${exitCode}, signal: ${signalCode})`)
			},
		})

		// Stream output
		if (proc.stdout && typeof proc.stdout !== 'number') {
			streamOutput(proc.stdout, 'nzbget')
		}
		if (proc.stderr && typeof proc.stderr !== 'number') {
			streamOutput(proc.stderr, 'nzbget:err')
		}

		// Wait for NZBGet to be ready
		const startedAt = Date.now()
		let ready = false
		const auth = Buffer.from(`${username}:${password}`).toString('base64')
		while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
			try {
				const res = await fetch(`http://${host}:${port}/jsonrpc`, {
					method: 'POST',
					headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ method: 'version', params: [] }),
				})
				if (res.ok) {
					ready = true
					break
				}
			} catch {
				// Not ready yet
			}
			await Bun.sleep(STARTUP_POLL_INTERVAL_MS)
		}

		if (!ready) {
			console.error('✗ NZBGet failed to start (timeout waiting for port)')
			if (!proc.killed) proc.kill()
			return null
		}

		console.log(`✓ NZBGet started (pid: ${proc.pid})`)

		// Clear queue on startup (non-blocking)
		clearNzbgetQueue()
			.then((cleared) => {
				if (cleared) console.log('✓ Cleared NZBGet queue on startup')
			})
			.catch((err) => {
				console.error('✗ Failed to clear NZBGet queue:', err)
			})

		return proc
	} catch (err) {
		console.error('✗ Failed to start NZBGet:', err)
		return null
	}
}

const nzbgetSubprocess = startNzbget()

export async function stopNzbget() {
	const port = getSettings().nzbgetSettings.port
	const proc = await nzbgetSubprocess

	if (proc && !proc.killed) {
		console.log('⏹ Stopping NZBGet...')
		try {
			proc.kill('SIGTERM')
			const timeout = setTimeout(() => {
				if (!proc.killed) {
					console.log('⚠ NZBGet did not exit gracefully, forcing kill...')
					proc.kill('SIGKILL')
				}
			}, 5000)
			await proc.exited
			clearTimeout(timeout)
			console.log('✓ NZBGet stopped')
		} catch (err) {
			console.error('✗ Error stopping NZBGet:', err)
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

async function streamOutput(stream: ReadableStream<Uint8Array>, prefix: string) {
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
