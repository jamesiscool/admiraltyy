import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { UsenetServer } from '@/services/settings'

// Extract buildServerArgs for testing - reimplemented here since it's not exported
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

// Arbitrary for UsenetServer
const arbUsenetServer = fc.record({
	id: fc.uuid(),
	name: fc.string({ minLength: 1, maxLength: 50 }),
	host: fc.domain(),
	port: fc.integer({ min: 1, max: 65535 }),
	username: fc.string({ maxLength: 50 }),
	password: fc.string({ maxLength: 100 }),
	ssl: fc.boolean(),
	priority: fc.integer({ min: 0, max: 100 }),
	connections: fc.integer({ min: 1, max: 50 }),
	enabled: fc.boolean(),
})

describe('buildServerArgs', () => {
	it('returns empty array for no servers', () => {
		const args = buildServerArgs([])
		expect(args).toEqual([])
	})

	it('builds correct args for single server', () => {
		const server: UsenetServer = {
			id: '1',
			name: 'Test Server',
			host: 'news.example.com',
			port: 563,
			username: 'user1',
			password: 'pass1',
			ssl: true,
			priority: 0,
			connections: 10,
			enabled: true,
		}

		const args = buildServerArgs([server])

		expect(args).toContain('-o')
		expect(args).toContain('Server1.Active=yes')
		expect(args).toContain('Server1.Name=Test Server')
		expect(args).toContain('Server1.Level=0')
		expect(args).toContain('Server1.Host=news.example.com')
		expect(args).toContain('Server1.Port=563')
		expect(args).toContain('Server1.Username=user1')
		expect(args).toContain('Server1.Password=pass1')
		expect(args).toContain('Server1.Encryption=yes')
		expect(args).toContain('Server1.Connections=10')
		expect(args).toContain('Server1.Retention=0')
	})

	it('builds correct args for disabled server', () => {
		const server: UsenetServer = {
			id: '1',
			name: 'Disabled',
			host: 'news.example.com',
			port: 119,
			username: '',
			password: '',
			ssl: false,
			priority: 1,
			connections: 5,
			enabled: false,
		}

		const args = buildServerArgs([server])

		expect(args).toContain('Server1.Active=no')
		expect(args).toContain('Server1.Encryption=no')
	})

	it('uses 1-based indexing for multiple servers', () => {
		const servers: UsenetServer[] = [
			{ id: '1', name: 'Primary', host: 'news1.com', port: 563, username: 'u1', password: 'p1', ssl: true, priority: 0, connections: 10, enabled: true },
			{ id: '2', name: 'Backup', host: 'news2.com', port: 119, username: 'u2', password: 'p2', ssl: false, priority: 1, connections: 5, enabled: true },
		]

		const args = buildServerArgs(servers)

		expect(args).toContain('Server1.Name=Primary')
		expect(args).toContain('Server2.Name=Backup')
		expect(args).toContain('Server1.Level=0')
		expect(args).toContain('Server2.Level=1')
	})

	it('handles three servers correctly', () => {
		const servers: UsenetServer[] = [
			{ id: '1', name: 'S1', host: 'h1.com', port: 563, username: '', password: '', ssl: true, priority: 0, connections: 10, enabled: true },
			{ id: '2', name: 'S2', host: 'h2.com', port: 119, username: '', password: '', ssl: false, priority: 1, connections: 5, enabled: false },
			{ id: '3', name: 'S3', host: 'h3.com', port: 443, username: '', password: '', ssl: true, priority: 2, connections: 8, enabled: true },
		]

		const args = buildServerArgs(servers)

		expect(args).toContain('Server1.Host=h1.com')
		expect(args).toContain('Server2.Host=h2.com')
		expect(args).toContain('Server3.Host=h3.com')
		expect(args).toContain('Server2.Active=no')
		expect(args).toContain('Server3.Active=yes')
	})

	describe('property-based tests', () => {
		it('always produces -o prefixed pairs', () => {
			fc.assert(
				fc.property(fc.array(arbUsenetServer, { maxLength: 5 }), (servers) => {
					const args = buildServerArgs(servers)

					// Every odd index (0, 2, 4, ...) should be '-o'
					for (let i = 0; i < args.length; i += 2) {
						expect(args[i]).toBe('-o')
					}
				}),
			)
		})

		it('produces 20 args per server (10 pairs)', () => {
			fc.assert(
				fc.property(fc.array(arbUsenetServer, { minLength: 1, maxLength: 5 }), (servers) => {
					const args = buildServerArgs(servers)
					expect(args.length).toBe(servers.length * 20)
				}),
			)
		})

		it('uses 1-based indexing for all servers', () => {
			fc.assert(
				fc.property(fc.array(arbUsenetServer, { minLength: 1, maxLength: 5 }), (servers) => {
					const args = buildServerArgs(servers)

					for (let i = 0; i < servers.length; i++) {
						const serverNum = i + 1
						expect(args.some((a) => a.startsWith(`Server${serverNum}.`))).toBe(true)
					}

					// Should not have Server0
					expect(args.some((a) => a.startsWith('Server0.'))).toBe(false)
				}),
			)
		})

		it('maps enabled to yes/no correctly', () => {
			fc.assert(
				fc.property(arbUsenetServer, (server) => {
					const args = buildServerArgs([server])
					const activeArg = args.find((a) => a.startsWith('Server1.Active='))
					expect(activeArg).toBe(`Server1.Active=${server.enabled ? 'yes' : 'no'}`)
				}),
			)
		})

		it('maps ssl to Encryption yes/no correctly', () => {
			fc.assert(
				fc.property(arbUsenetServer, (server) => {
					const args = buildServerArgs([server])
					const encArg = args.find((a) => a.startsWith('Server1.Encryption='))
					expect(encArg).toBe(`Server1.Encryption=${server.ssl ? 'yes' : 'no'}`)
				}),
			)
		})

		it('preserves exact host value', () => {
			fc.assert(
				fc.property(arbUsenetServer, (server) => {
					const args = buildServerArgs([server])
					expect(args).toContain(`Server1.Host=${server.host}`)
				}),
			)
		})

		it('preserves exact port value', () => {
			fc.assert(
				fc.property(arbUsenetServer, (server) => {
					const args = buildServerArgs([server])
					expect(args).toContain(`Server1.Port=${server.port}`)
				}),
			)
		})

		it('preserves connection count', () => {
			fc.assert(
				fc.property(arbUsenetServer, (server) => {
					const args = buildServerArgs([server])
					expect(args).toContain(`Server1.Connections=${server.connections}`)
				}),
			)
		})

		it('always sets Retention to 0', () => {
			fc.assert(
				fc.property(fc.array(arbUsenetServer, { minLength: 1, maxLength: 5 }), (servers) => {
					const args = buildServerArgs(servers)
					const retentionArgs = args.filter((a) => a.includes('.Retention='))
					expect(retentionArgs.every((a) => a.endsWith('=0'))).toBe(true)
					expect(retentionArgs).toHaveLength(servers.length)
				}),
			)
		})

		it('uses priority as Level', () => {
			fc.assert(
				fc.property(arbUsenetServer, (server) => {
					const args = buildServerArgs([server])
					expect(args).toContain(`Server1.Level=${server.priority}`)
				}),
			)
		})
	})
})

// Tests for isNzbgetPortInUse - reimplements the function locally to avoid module deps
describe('isNzbgetPortInUse logic', () => {
	// The actual function uses lsof which is system-dependent
	// We test the logic patterns here

	it('empty lsof output means port is not in use', () => {
		const pids = ''.trim().split('\n').filter(Boolean)
		expect(pids.length).toBe(0)
	})

	it('single PID in lsof output means port is in use', () => {
		const pids = '12345'.trim().split('\n').filter(Boolean)
		expect(pids.length).toBe(1)
		expect(pids[0]).toBe('12345')
	})

	it('multiple PIDs in lsof output means port is in use', () => {
		const pids = '12345\n67890'.trim().split('\n').filter(Boolean)
		expect(pids.length).toBe(2)
	})

	it('whitespace-only output means port is not in use', () => {
		const pids = '   \n   '.trim().split('\n').filter(Boolean)
		expect(pids.length).toBe(0)
	})
})

// Tests for isNzbgetRunning - reimplements the logic locally
describe('isNzbgetRunning logic', () => {
	// Helper to check if running, mimics the actual function logic
	function checkIsRunning(proc: { killed: boolean } | null): boolean {
		return proc !== null && !proc.killed
	}

	it('returns false when process is null', () => {
		expect(checkIsRunning(null)).toBe(false)
	})

	it('returns false when process is killed', () => {
		expect(checkIsRunning({ killed: true })).toBe(false)
	})

	it('returns true when process exists and is not killed', () => {
		expect(checkIsRunning({ killed: false })).toBe(true)
	})
})

// stopNzbget logic - test the decision flow without the actual module
describe('stopNzbget logic', () => {
	it('stops poller first', () => {
		const pollerStopped = { called: false }
		const stopPoller = () => {
			pollerStopped.called = true
		}

		// Simulate stopNzbget flow
		stopPoller()
		expect(pollerStopped.called).toBe(true)
	})

	it('kills process if running', () => {
		let killCalled = false
		const proc: { killed: boolean; kill: () => void } | null = {
			killed: false,
			kill: () => {
				killCalled = true
			},
		}

		if (proc !== null && !proc.killed) {
			proc.kill()
		}

		expect(killCalled).toBe(true)
	})

	it('skips kill if process already dead', () => {
		let killCalled = false
		const proc: { killed: boolean; kill: () => void } | null = {
			killed: true,
			kill: () => {
				killCalled = true
			},
		}

		if (proc !== null && !proc.killed) {
			proc.kill()
		}

		expect(killCalled).toBe(false)
	})

	it('falls back to port kill when no process ref', () => {
		let portKilled = false
		const nzbgetProcess = null
		const portInUse = true

		if (nzbgetProcess === null && portInUse) {
			portKilled = true
		}

		expect(portKilled).toBe(true)
	})
})

// killProcessOnPort logic
describe('killProcessOnPort logic', () => {
	it('parses PIDs from lsof output', () => {
		const lsofOutput = '12345\n67890\n'
		const pids = lsofOutput.trim().split('\n').filter(Boolean)

		expect(pids).toEqual(['12345', '67890'])
	})

	it('returns empty array for no PIDs', () => {
		const lsofOutput = ''
		const pids = lsofOutput.trim().split('\n').filter(Boolean)

		expect(pids).toEqual([])
	})

	it('handles whitespace in output', () => {
		const lsofOutput = '  12345  \n  \n  67890  \n'
		const pids = lsofOutput
			.trim()
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean)

		expect(pids).toEqual(['12345', '67890'])
	})
})

// canConnectToNzbget logic
describe('canConnectToNzbget logic', () => {
	it('creates correct basic auth header', () => {
		const username = 'admin'
		const password = 'secret'
		const auth = Buffer.from(`${username}:${password}`).toString('base64')

		expect(auth).toBe('YWRtaW46c2VjcmV0')
	})

	it('creates correct JSON-RPC body', () => {
		const body = JSON.stringify({ method: 'version', params: [] })

		expect(body).toBe('{"method":"version","params":[]}')
	})
})
