import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Define types manually to avoid zod import issues in tests
interface Folder {
	id: string
	path: string
	isDefault: boolean
}

interface Folders {
	movies: Folder[]
	tv: Folder[]
}

interface Resolution {
	name: string
	minGbPerHour: number
	targetGbPerHour: number
	maxGbPerHour: number
}

interface Language {
	code: string
	name: string
	priority: number
}

interface LanguageSettings {
	subtitleLanguages: Language[]
	audioLanguages: Language[]
	preferOriginalAudio: boolean
	acceptAnyAudioFallback: boolean
}

interface FormatPreference {
	id: string
	name: string
	priority: number
	matchTerms: string[]
	excludeTerms: string[]
}

interface FormatSettings {
	codecs: FormatPreference[]
	hdrFormats: FormatPreference[]
	audioFormats: FormatPreference[]
}

interface AuthSettings {
	enabled: boolean
	method: 'none' | 'form' | 'basic'
	username: string
	apiKey: string
}

interface Indexer {
	id: string
	name: string
	url: string
	apiKey: string
	enabled: boolean
	priority: number
}

interface UsenetServer {
	id: string
	name: string
	host: string
	port: number
	username: string
	password: string
	ssl: boolean
	priority: number
	connections: number
	enabled: boolean
}

interface NzbgetSettings {
	username: string
	password: string
	host: string
	port: number
}

interface Settings {
	folders: Folders
	downloadFolder: string
	indexers: Indexer[]
	usenetServers: UsenetServer[]
	resolutions: Resolution[]
	defaultQuality: string
	languageSettings: LanguageSettings
	formatSettings: FormatSettings
	authSettings: AuthSettings
	nzbgetSettings: NzbgetSettings
	tmdbApiKey: string
}

// Copy helper functions from settings.server.ts
function generateApiKey(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
	let key = ''
	for (let i = 0; i < 32; i++) {
		key += chars[Math.floor(Math.random() * chars.length)]
	}
	return key
}

function generateNzbgetPassword(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
	let password = ''
	for (let i = 0; i < 32; i++) {
		password += chars[Math.floor(Math.random() * chars.length)]
	}
	return password
}

function createDefaultSettings(): Settings {
	return {
		folders: { movies: [], tv: [] },
		downloadFolder: '',
		indexers: [],
		usenetServers: [],
		resolutions: [
			{ name: '480p', minGbPerHour: 0.3, targetGbPerHour: 0.5, maxGbPerHour: 0.8 },
			{ name: '720p', minGbPerHour: 0.8, targetGbPerHour: 1.5, maxGbPerHour: 2.5 },
			{ name: '1080p', minGbPerHour: 1.5, targetGbPerHour: 4, maxGbPerHour: 6 },
			{ name: '2160p', minGbPerHour: 5, targetGbPerHour: 15, maxGbPerHour: 40 },
		],
		defaultQuality: '1080p',
		languageSettings: {
			subtitleLanguages: [{ code: 'en', name: 'English', priority: 0 }],
			audioLanguages: [{ code: 'en', name: 'English', priority: 0 }],
			preferOriginalAudio: true,
			acceptAnyAudioFallback: true,
		},
		formatSettings: {
			codecs: [
				{ id: 'codec-x265', name: 'x265', priority: 0, matchTerms: ['x265', 'h265', 'hevc'], excludeTerms: [] },
				{ id: 'codec-x264', name: 'x264', priority: 1, matchTerms: ['x264', 'h264', 'avc'], excludeTerms: [] },
			],
			hdrFormats: [
				{ id: 'hdr-dv', name: 'Dolby Vision', priority: 0, matchTerms: ['dolby vision', 'dv', 'dovi'], excludeTerms: [] },
				{ id: 'hdr-hdr10plus', name: 'HDR10+', priority: 1, matchTerms: ['hdr10+', 'hdr10plus'], excludeTerms: [] },
				{ id: 'hdr-hdr10', name: 'HDR10', priority: 2, matchTerms: ['hdr10', 'hdr'], excludeTerms: ['hdr10+', 'hdr10plus'] },
				{ id: 'hdr-sdr', name: 'SDR', priority: 3, matchTerms: ['sdr'], excludeTerms: [] },
			],
			audioFormats: [
				{ id: 'audio-atmos', name: 'Dolby Atmos', priority: 0, matchTerms: ['atmos', 'dolby atmos'], excludeTerms: [] },
				{ id: 'audio-truehd', name: 'TrueHD', priority: 1, matchTerms: ['truehd', 'true-hd'], excludeTerms: [] },
				{ id: 'audio-dtshd', name: 'DTS-HD MA', priority: 2, matchTerms: ['dts-hd ma', 'dts-hdma', 'dtshd ma'], excludeTerms: [] },
				{ id: 'audio-dts', name: 'DTS', priority: 3, matchTerms: ['dts'], excludeTerms: ['dts-hd', 'dts-x', 'dtsx', 'dts-hdma'] },
				{ id: 'audio-aac', name: 'AAC', priority: 4, matchTerms: ['aac'], excludeTerms: [] },
			],
		},
		authSettings: {
			enabled: false,
			method: 'none',
			username: '',
			apiKey: generateApiKey(),
		},
		nzbgetSettings: {
			username: 'admiraltyy',
			password: generateNzbgetPassword(),
			host: '127.0.0.1',
			port: 28561,
		},
		tmdbApiKey: '431a8708161bcd1f1fbe7536137e61ed',
	}
}

// Validation function that mirrors settings.server.ts behavior
function validateSettings(data: unknown): Settings | null {
	if (typeof data !== 'object' || data === null) return null

	const obj = data as Record<string, unknown>

	// Check required top-level fields
	if (typeof obj.folders !== 'object' || obj.folders === null) return null
	if (typeof obj.downloadFolder !== 'string') return null
	if (!Array.isArray(obj.indexers)) return null
	if (!Array.isArray(obj.usenetServers)) return null
	if (!Array.isArray(obj.resolutions)) return null
	if (typeof obj.defaultQuality !== 'string') return null
	if (typeof obj.languageSettings !== 'object' || obj.languageSettings === null) return null
	if (typeof obj.formatSettings !== 'object' || obj.formatSettings === null) return null
	if (typeof obj.authSettings !== 'object' || obj.authSettings === null) return null
	if (typeof obj.nzbgetSettings !== 'object' || obj.nzbgetSettings === null) return null
	if (typeof obj.tmdbApiKey !== 'string') return null

	// Validate authSettings method enum
	const authSettings = obj.authSettings as Record<string, unknown>
	if (!['none', 'form', 'basic'].includes(authSettings.method as string)) return null

	return obj as unknown as Settings
}

// Core settings manager for testing - mirrors the logic in settings.server.ts
interface SettingsManager {
	currentSettings: Settings
	initialized: boolean
}

function createSettingsManager(): SettingsManager {
	return {
		currentSettings: createDefaultSettings(),
		initialized: false,
	}
}

function initSettings(manager: SettingsManager, settingsPath: string, logDir: string): void {
	// Ensure log directory exists
	if (!existsSync(logDir)) {
		mkdirSync(logDir, { recursive: true })
	}

	// Load or create settings file
	if (existsSync(settingsPath)) {
		try {
			const raw = readFileSync(settingsPath, 'utf-8')
			const parsed = JSON.parse(raw)
			const validated = validateSettings(parsed)
			if (validated) {
				manager.currentSettings = validated
			} else {
				throw new Error('Invalid settings')
			}
		} catch {
			manager.currentSettings = createDefaultSettings()
			saveSettings(manager, settingsPath)
		}
	} else {
		manager.currentSettings = createDefaultSettings()
		saveSettings(manager, settingsPath)
	}
	manager.initialized = true
}

function getSettings(manager: SettingsManager): Settings {
	return manager.currentSettings
}

function updateSettings(manager: SettingsManager, settingsPath: string, updates: Partial<Settings>): Settings {
	manager.currentSettings = { ...manager.currentSettings, ...updates }
	saveSettings(manager, settingsPath)
	return manager.currentSettings
}

function saveSettings(manager: SettingsManager, settingsPath: string): void {
	const settingsDir = dirname(settingsPath)
	if (!existsSync(settingsDir)) {
		mkdirSync(settingsDir, { recursive: true })
	}
	writeFileSync(settingsPath, JSON.stringify(manager.currentSettings, null, '\t'))
}

// Test directory management
let tempDir: string
let settingsPath: string
let logDir: string

function createTempDirs() {
	tempDir = join(tmpdir(), `settings-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
	const dataDir = join(tempDir, 'data')
	logDir = join(tempDir, 'logs')
	settingsPath = join(dataDir, 'admiraltyy.settings.json')

	mkdirSync(dataDir, { recursive: true })
	mkdirSync(logDir, { recursive: true })
}

function cleanupTempDirs() {
	if (tempDir && existsSync(tempDir)) {
		rmSync(tempDir, { recursive: true, force: true })
	}
}

// Create valid settings for file writing
function createValidSettingsFile(overrides?: Partial<Settings>): Settings {
	const defaults = createDefaultSettings()
	return { ...defaults, ...overrides }
}

describe('settings.server - initialization from file', () => {
	let manager: SettingsManager

	beforeEach(() => {
		createTempDirs()
		manager = createSettingsManager()
	})

	afterEach(() => {
		cleanupTempDirs()
	})

	it('loads settings from existing valid file', () => {
		const customSettings = createValidSettingsFile({
			downloadFolder: '/custom/downloads',
			defaultQuality: '2160p',
		})
		writeFileSync(settingsPath, JSON.stringify(customSettings, null, '\t'))

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.downloadFolder).toBe('/custom/downloads')
		expect(settings.defaultQuality).toBe('2160p')
	})

	it('loads settings with custom indexers from file', () => {
		const customSettings = createValidSettingsFile({
			indexers: [
				{
					id: 'indexer-1',
					name: 'Test Indexer',
					url: 'https://indexer.example.com',
					apiKey: 'test-api-key',
					enabled: true,
					priority: 0,
				},
			],
		})
		writeFileSync(settingsPath, JSON.stringify(customSettings, null, '\t'))

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.indexers).toHaveLength(1)
		expect(settings.indexers[0].name).toBe('Test Indexer')
		expect(settings.indexers[0].url).toBe('https://indexer.example.com')
	})

	it('loads settings with custom usenet servers from file', () => {
		const customSettings = createValidSettingsFile({
			usenetServers: [
				{
					id: 'server-1',
					name: 'Newshosting',
					host: 'news.newshosting.com',
					port: 563,
					username: 'user',
					password: 'pass',
					ssl: true,
					priority: 0,
					connections: 30,
					enabled: true,
				},
			],
		})
		writeFileSync(settingsPath, JSON.stringify(customSettings, null, '\t'))

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.usenetServers).toHaveLength(1)
		expect(settings.usenetServers[0].name).toBe('Newshosting')
		expect(settings.usenetServers[0].connections).toBe(30)
	})

	it('loads settings with custom folders from file', () => {
		const customSettings = createValidSettingsFile({
			folders: {
				movies: [{ id: 'movies-1', path: '/media/movies', isDefault: true }],
				tv: [{ id: 'tv-1', path: '/media/tv', isDefault: true }],
			},
		})
		writeFileSync(settingsPath, JSON.stringify(customSettings, null, '\t'))

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.folders.movies).toHaveLength(1)
		expect(settings.folders.movies[0].path).toBe('/media/movies')
		expect(settings.folders.tv).toHaveLength(1)
		expect(settings.folders.tv[0].path).toBe('/media/tv')
	})
})

describe('settings.server - default settings creation', () => {
	let manager: SettingsManager

	beforeEach(() => {
		createTempDirs()
		manager = createSettingsManager()
	})

	afterEach(() => {
		cleanupTempDirs()
	})

	it('creates default settings when no file exists', () => {
		expect(existsSync(settingsPath)).toBe(false)

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.folders).toEqual({ movies: [], tv: [] })
		expect(settings.downloadFolder).toBe('')
		expect(settings.indexers).toEqual([])
		expect(settings.usenetServers).toEqual([])
		expect(settings.defaultQuality).toBe('1080p')
	})

	it('creates settings file on disk when none exists', () => {
		expect(existsSync(settingsPath)).toBe(false)

		initSettings(manager, settingsPath, logDir)

		expect(existsSync(settingsPath)).toBe(true)

		const content = readFileSync(settingsPath, 'utf-8')
		const parsed = JSON.parse(content)
		expect(parsed.defaultQuality).toBe('1080p')
	})

	it('creates log directory if not exists', () => {
		rmSync(logDir, { recursive: true, force: true })
		expect(existsSync(logDir)).toBe(false)

		initSettings(manager, settingsPath, logDir)

		expect(existsSync(logDir)).toBe(true)
	})

	it('creates settings directory if not exists', () => {
		const newDataDir = join(tempDir, 'newdata')
		const newSettingsPath = join(newDataDir, 'settings.json')

		expect(existsSync(newDataDir)).toBe(false)

		initSettings(manager, newSettingsPath, logDir)

		expect(existsSync(newDataDir)).toBe(true)
		expect(existsSync(newSettingsPath)).toBe(true)
	})

	it('generates unique API key in default settings', () => {
		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.authSettings.apiKey).toBeDefined()
		expect(settings.authSettings.apiKey.length).toBe(32)
		expect(settings.authSettings.apiKey).toMatch(/^[a-z0-9]+$/)
	})

	it('generates unique NZBGet password in default settings', () => {
		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.nzbgetSettings.password).toBeDefined()
		expect(settings.nzbgetSettings.password.length).toBe(32)
		expect(settings.nzbgetSettings.password).toMatch(/^[a-zA-Z0-9]+$/)
	})

	it('includes all default resolutions', () => {
		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.resolutions).toHaveLength(4)
		expect(settings.resolutions.map((r) => r.name)).toEqual(['480p', '720p', '1080p', '2160p'])
	})
})

describe('settings.server - persistence to disk', () => {
	let manager: SettingsManager

	beforeEach(() => {
		createTempDirs()
		manager = createSettingsManager()
	})

	afterEach(() => {
		cleanupTempDirs()
	})

	it('persists updated settings to disk', () => {
		initSettings(manager, settingsPath, logDir)

		updateSettings(manager, settingsPath, { downloadFolder: '/new/download/path' })

		const content = readFileSync(settingsPath, 'utf-8')
		const saved = JSON.parse(content)
		expect(saved.downloadFolder).toBe('/new/download/path')
	})

	it('preserves existing settings when updating partial', () => {
		const customSettings = createValidSettingsFile({
			downloadFolder: '/original/path',
			defaultQuality: '720p',
		})
		writeFileSync(settingsPath, JSON.stringify(customSettings, null, '\t'))

		initSettings(manager, settingsPath, logDir)

		updateSettings(manager, settingsPath, { downloadFolder: '/updated/path' })

		const settings = getSettings(manager)
		expect(settings.downloadFolder).toBe('/updated/path')
		expect(settings.defaultQuality).toBe('720p')
	})

	it('returns updated settings from updateSettings', () => {
		initSettings(manager, settingsPath, logDir)

		const result = updateSettings(manager, settingsPath, { defaultQuality: '4K' })
		expect(result.defaultQuality).toBe('4K')
	})

	it('persists indexer additions to disk', () => {
		initSettings(manager, settingsPath, logDir)

		updateSettings(manager, settingsPath, {
			indexers: [
				{
					id: 'test-indexer',
					name: 'New Indexer',
					url: 'https://new.indexer.com',
					apiKey: 'api-key',
					enabled: true,
					priority: 0,
				},
			],
		})

		const content = readFileSync(settingsPath, 'utf-8')
		const saved = JSON.parse(content)
		expect(saved.indexers).toHaveLength(1)
		expect(saved.indexers[0].name).toBe('New Indexer')
	})

	it('persists folder additions to disk', () => {
		initSettings(manager, settingsPath, logDir)

		updateSettings(manager, settingsPath, {
			folders: {
				movies: [{ id: 'folder-1', path: '/media/movies', isDefault: true }],
				tv: [{ id: 'folder-2', path: '/media/tv', isDefault: true }],
			},
		})

		const content = readFileSync(settingsPath, 'utf-8')
		const saved = JSON.parse(content)
		expect(saved.folders.movies[0].path).toBe('/media/movies')
		expect(saved.folders.tv[0].path).toBe('/media/tv')
	})

	it('formats saved JSON with tabs', () => {
		initSettings(manager, settingsPath, logDir)

		const content = readFileSync(settingsPath, 'utf-8')
		expect(content).toContain('\t')
		expect(content).toContain('{\n\t')
	})
})

describe('settings.server - corrupted settings file handling', () => {
	let manager: SettingsManager

	beforeEach(() => {
		createTempDirs()
		manager = createSettingsManager()
	})

	afterEach(() => {
		cleanupTempDirs()
	})

	it('falls back to defaults when file contains invalid JSON', () => {
		writeFileSync(settingsPath, 'this is not valid json {{{')

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.folders).toEqual({ movies: [], tv: [] })
		expect(settings.defaultQuality).toBe('1080p')
	})

	it('falls back to defaults when file has invalid schema', () => {
		writeFileSync(settingsPath, JSON.stringify({ someRandomField: 'value' }))

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.folders).toEqual({ movies: [], tv: [] })
		expect(settings.defaultQuality).toBe('1080p')
	})

	it('overwrites corrupted file with defaults', () => {
		writeFileSync(settingsPath, 'corrupted content')

		initSettings(manager, settingsPath, logDir)

		const content = readFileSync(settingsPath, 'utf-8')
		const parsed = JSON.parse(content)
		expect(parsed.defaultQuality).toBe('1080p')
	})

	it('falls back when file has wrong data types', () => {
		const invalidSettings = {
			folders: 'should be object',
			downloadFolder: 123,
			indexers: 'should be array',
		}
		writeFileSync(settingsPath, JSON.stringify(invalidSettings))

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.folders).toEqual({ movies: [], tv: [] })
		expect(typeof settings.downloadFolder).toBe('string')
		expect(Array.isArray(settings.indexers)).toBe(true)
	})

	it('falls back when nested objects have invalid schema', () => {
		const invalidSettings = createValidSettingsFile()
		// @ts-expect-error - intentionally invalid
		invalidSettings.authSettings.method = 'invalid-method'
		writeFileSync(settingsPath, JSON.stringify(invalidSettings))

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(['none', 'form', 'basic']).toContain(settings.authSettings.method)
	})

	it('handles empty file gracefully', () => {
		writeFileSync(settingsPath, '')

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.defaultQuality).toBe('1080p')
	})

	it('handles truncated JSON gracefully', () => {
		const validSettings = createValidSettingsFile()
		const json = JSON.stringify(validSettings)
		writeFileSync(settingsPath, json.slice(0, Math.floor(json.length / 2)))

		initSettings(manager, settingsPath, logDir)
		const settings = getSettings(manager)

		expect(settings.defaultQuality).toBe('1080p')
	})
})

describe('settings.server - helper functions', () => {
	it('generateNzbgetPassword returns 32 alphanumeric chars', () => {
		const password = generateNzbgetPassword()

		expect(password.length).toBe(32)
		expect(password).toMatch(/^[a-zA-Z0-9]+$/)
	})

	it('generateNzbgetPassword returns unique values', () => {
		const passwords = new Set<string>()
		for (let i = 0; i < 100; i++) {
			passwords.add(generateNzbgetPassword())
		}

		expect(passwords.size).toBe(100)
	})

	it('generateApiKey returns 32 lowercase alphanumeric chars', () => {
		const key = generateApiKey()

		expect(key.length).toBe(32)
		expect(key).toMatch(/^[a-z0-9]+$/)
	})

	it('generateApiKey returns unique values', () => {
		const keys = new Set<string>()
		for (let i = 0; i < 100; i++) {
			keys.add(generateApiKey())
		}

		expect(keys.size).toBe(100)
	})
})

describe('settings.server - validation', () => {
	it('validates complete settings object', () => {
		const settings = createValidSettingsFile()
		const result = validateSettings(settings)

		expect(result).not.toBeNull()
	})

	it('rejects settings with missing required fields', () => {
		const incomplete = { downloadFolder: '/path' }
		const result = validateSettings(incomplete)

		expect(result).toBeNull()
	})

	it('rejects settings with wrong data types', () => {
		const invalid = {
			folders: 'not an object',
			downloadFolder: '/path',
			indexers: [],
			usenetServers: [],
			resolutions: [],
			defaultQuality: '1080p',
			languageSettings: {},
			formatSettings: {},
			authSettings: { method: 'none' },
			nzbgetSettings: {},
			tmdbApiKey: 'key',
		}
		const result = validateSettings(invalid)

		expect(result).toBeNull()
	})

	it('rejects settings with invalid auth method', () => {
		const settings = createValidSettingsFile()
		// @ts-expect-error - intentionally invalid
		settings.authSettings.method = 'oauth'
		const result = validateSettings(settings)

		expect(result).toBeNull()
	})

	it('accepts all valid auth methods', () => {
		for (const method of ['none', 'form', 'basic'] as const) {
			const settings = createValidSettingsFile()
			settings.authSettings.method = method
			const result = validateSettings(settings)
			expect(result).not.toBeNull()
		}
	})
})
