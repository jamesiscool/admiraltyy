import type { Subprocess } from 'bun'
import { generateNzbgetPassword, getSettings, saveSettings, type UsenetServer, updateSettings } from '../settings'
import { clearNzbgetQueue, initNzbgetApi } from './nzbgetApi'

let nzbgetProcess: Subprocess | null = null

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

	// Skip if NZBGet is already running (e.g. from previous run or hot reload)
	if (await isNzbgetPortInUse(settings.nzbgetSettings.port)) {
		initNzbgetApi() // Ensure API client is initialized
		console.log('✓ NZBGet already running on port, skipping start')
		return
	}

	// Ensure password is generated if empty
	let { password } = settings.nzbgetSettings
	if (!password) {
		password = generateNzbgetPassword()
		updateSettings({
			nzbgetSettings: {
				...settings.nzbgetSettings,
				password,
			},
		})
		saveSettings()
		console.log('✓ Generated new NZBGet password')
	}

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
				if (line.trim()) {
					console.log(`[${prefix}] ${line}`)
				}
			}
		}
	} catch {
		// Stream closed
	}
}
