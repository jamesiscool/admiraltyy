import { fc, test } from '@fast-check/vitest'
import { fs as memfs, vol } from 'memfs'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mock Setup with vi.hoisted ---

// Define schema in hoisted context so it can be used in mocks
const { settingsSchema } = vi.hoisted(() => {
	const { z } = require('zod')

	const folderSchema = z.object({
		id: z.string(),
		path: z.string(),
		isDefault: z.boolean(),
	})

	const foldersSchema = z.object({
		movies: z.array(folderSchema),
		tv: z.array(folderSchema),
	})

	const resolutionSchema = z.object({
		name: z.string(),
		minGbPerHour: z.number(),
		targetGbPerHour: z.number(),
		maxGbPerHour: z.number(),
	})

	const languageSchema = z.object({
		code: z.string(),
		name: z.string(),
		priority: z.number(),
	})

	const languageSettingsSchema = z.object({
		subtitleLanguages: z.array(languageSchema),
		audioLanguages: z.array(languageSchema),
		preferOriginalAudio: z.boolean(),
		acceptAnyAudioFallback: z.boolean(),
	})

	const formatPreferenceSchema = z.object({
		id: z.string(),
		name: z.string(),
		priority: z.number(),
		matchTerms: z.array(z.string()),
		excludeTerms: z.array(z.string()),
	})

	const formatSettingsSchema = z.object({
		codecs: z.array(formatPreferenceSchema),
		hdrFormats: z.array(formatPreferenceSchema),
		audioFormats: z.array(formatPreferenceSchema),
	})

	const authSettingsSchema = z.object({
		enabled: z.boolean(),
		method: z.enum(['none', 'form', 'basic']),
		username: z.string(),
		apiKey: z.string(),
	})

	const indexerSchema = z.object({
		id: z.string(),
		name: z.string(),
		url: z.string(),
		apiKey: z.string(),
		enabled: z.boolean(),
		priority: z.number(),
	})

	const usenetServerSchema = z.object({
		id: z.string(),
		name: z.string(),
		host: z.string(),
		port: z.number(),
		username: z.string(),
		password: z.string(),
		ssl: z.boolean(),
		priority: z.number(),
		connections: z.number(),
		enabled: z.boolean(),
	})

	const nzbgetSettingsSchema = z.object({
		username: z.string(),
		password: z.string(),
		host: z.string(),
		port: z.number(),
	})

	const settingsSchema = z.object({
		folders: foldersSchema,
		downloadFolder: z.string().default(''),
		indexers: z.array(indexerSchema),
		usenetServers: z.array(usenetServerSchema),
		resolutions: z.array(resolutionSchema),
		defaultQuality: z.string().default('1080p'),
		languageSettings: languageSettingsSchema,
		formatSettings: formatSettingsSchema,
		authSettings: authSettingsSchema,
		nzbgetSettings: nzbgetSettingsSchema,
		tmdbApiKey: z.string(),
	})

	return { settingsSchema }
})

// Test paths
const TEST_DATA_DIR = '/test/data'
const TEST_SETTINGS_PATH = '/test/data/settings.json'

// Mock env
vi.mock('@/env', () => ({
	env: {
		DATA_DIRECTORY: '/test/data',
		SETTINGS_PATH: '/test/data/settings.json',
		LOG_DIRECTORY: '/test/data/logs',
		DATABASE_PATH: '/test/data/test.db',
		BUN_ENV: 'ci',
	},
}))

// Mock node:fs with memfs
vi.mock('node:fs', () => memfs)

// Mock db module to prevent SQLite initialization
vi.mock('@/db', () => ({
	db: {},
	schema: {},
}))

// Mock settings.ts to provide schema without importing settings.functions
vi.mock('@/services/settings', () => ({
	settingsSchema,
	getSettingsOptions: vi.fn(),
}))

import type { Settings } from './settings'
// Import after mocks
import { ensureDownloadFolder, ensureNzbgetPassword, getSettings, initSettings, updateSettings } from './settings.server'

// --- Test Setup ---

// Initialize once for all tests (module state persists)
beforeAll(() => {
	vol.reset()
	vol.mkdirSync(TEST_DATA_DIR, { recursive: true })
	// Let initSettings create default settings
	initSettings()
})

beforeEach(() => {
	// Reset filesystem but keep directories
	vol.reset()
	vol.mkdirSync(TEST_DATA_DIR, { recursive: true })
})

// --- getSettings Tests ---

describe('getSettings', () => {
	it('returns valid settings object', () => {
		const settings = getSettings()
		expect(settings).toBeDefined()
		expect(settings.defaultQuality).toBeDefined()
		expect(settings.nzbgetSettings).toBeDefined()
	})

	it('returns same instance on repeated calls', () => {
		const settings1 = getSettings()
		const settings2 = getSettings()
		expect(settings1).toBe(settings2)
	})

	it('has all required fields', () => {
		const settings = getSettings()
		expect(settings.folders).toBeDefined()
		expect(settings.indexers).toBeDefined()
		expect(settings.resolutions).toBeDefined()
		expect(settings.languageSettings).toBeDefined()
		expect(settings.formatSettings).toBeDefined()
		expect(settings.authSettings).toBeDefined()
		expect(settings.nzbgetSettings).toBeDefined()
	})
})

// --- updateSettings Tests ---

describe('updateSettings', () => {
	it('merges partial updates', () => {
		const original = getSettings()
		const originalQuality = original.defaultQuality

		const updated = updateSettings({ defaultQuality: 'test-quality' })

		expect(updated.defaultQuality).toBe('test-quality')
		// Restore
		updateSettings({ defaultQuality: originalQuality })
	})

	it('persists changes to file', () => {
		updateSettings({ downloadFolder: '/test/downloads' })

		const saved = JSON.parse(vol.readFileSync(TEST_SETTINGS_PATH, 'utf-8') as string)
		expect(saved.downloadFolder).toBe('/test/downloads')

		// Restore
		updateSettings({ downloadFolder: '' })
	})

	it('updates nested settings correctly', () => {
		const original = getSettings()
		const originalNzbget = { ...original.nzbgetSettings }

		updateSettings({
			nzbgetSettings: {
				username: 'newuser',
				password: 'newpass123',
				host: 'localhost',
				port: 9999,
			},
		})

		const settings = getSettings()
		expect(settings.nzbgetSettings.username).toBe('newuser')
		expect(settings.nzbgetSettings.port).toBe(9999)

		// Restore
		updateSettings({ nzbgetSettings: originalNzbget })
	})

	it('updates indexers array', () => {
		const testIndexer = {
			id: 'test-idx',
			name: 'Test Indexer',
			url: 'https://test.com',
			apiKey: 'key123',
			enabled: true,
			priority: 0,
		}

		updateSettings({ indexers: [testIndexer] })

		const settings = getSettings()
		expect(settings.indexers).toHaveLength(1)
		expect(settings.indexers[0].name).toBe('Test Indexer')

		// Restore
		updateSettings({ indexers: [] })
	})
})

// --- ensureNzbgetPassword Tests ---

describe('ensureNzbgetPassword', () => {
	it('returns existing password if present', () => {
		const original = getSettings()
		const existingPassword = original.nzbgetSettings.password

		const password = ensureNzbgetPassword()
		expect(password).toBe(existingPassword)
	})

	it('generates password if empty', () => {
		const original = getSettings()
		const originalNzbget = { ...original.nzbgetSettings }

		// Set empty password
		updateSettings({
			nzbgetSettings: { ...originalNzbget, password: '' },
		})

		const password = ensureNzbgetPassword()

		expect(password).toBeTruthy()
		expect(password.length).toBe(32)

		// Check it was saved
		const settings = getSettings()
		expect(settings.nzbgetSettings.password).toBe(password)

		// Restore
		updateSettings({ nzbgetSettings: originalNzbget })
	})

	it('generated password is alphanumeric', () => {
		const original = getSettings()
		const originalNzbget = { ...original.nzbgetSettings }

		// Set empty password
		updateSettings({
			nzbgetSettings: { ...originalNzbget, password: '' },
		})

		const password = ensureNzbgetPassword()
		expect(password).toMatch(/^[a-zA-Z0-9]+$/)

		// Restore
		updateSettings({ nzbgetSettings: originalNzbget })
	})
})

// --- ensureDownloadFolder Tests ---

describe('ensureDownloadFolder', () => {
	beforeEach(() => {
		// Reset to empty downloadFolder
		updateSettings({ downloadFolder: '' })
	})

	it('uses data/downloads when downloadFolder is empty', () => {
		const folder = ensureDownloadFolder()
		expect(folder).toBe(`${TEST_DATA_DIR}/downloads`)
		expect(vol.existsSync(folder)).toBe(true)
	})

	it('uses absolute path as-is', () => {
		updateSettings({ downloadFolder: '/custom/absolute/path' })

		const folder = ensureDownloadFolder()

		expect(folder).toBe('/custom/absolute/path')
		expect(vol.existsSync(folder)).toBe(true)
	})

	it('handles tilde path as absolute', () => {
		updateSettings({ downloadFolder: '~/downloads' })

		const folder = ensureDownloadFolder()

		// Tilde is treated as absolute
		expect(folder).toBe('~/downloads')
	})

	it('trims whitespace from path', () => {
		updateSettings({ downloadFolder: '  /trimmed/path  ' })

		const folder = ensureDownloadFolder()

		expect(folder).toBe('/trimmed/path')
	})

	it('creates nested directories', () => {
		updateSettings({ downloadFolder: '/deep/nested/folder/path' })

		const folder = ensureDownloadFolder()

		expect(vol.existsSync(folder)).toBe(true)
	})
})

// --- Property-Based Tests ---

describe('settings property tests', () => {
	// Save original values to restore after each property test
	let originalDownloadFolder: string
	let originalDefaultQuality: string
	let originalResolutions: unknown[]
	let originalIndexers: unknown[]

	beforeAll(() => {
		const settings = getSettings()
		originalDownloadFolder = settings.downloadFolder
		originalDefaultQuality = settings.defaultQuality
		originalResolutions = [...settings.resolutions]
		originalIndexers = [...settings.indexers]
	})

	afterAll(() => {
		// Restore original values
		updateSettings({
			downloadFolder: originalDownloadFolder,
			defaultQuality: originalDefaultQuality,
			resolutions: originalResolutions as Settings['resolutions'],
			indexers: originalIndexers as Settings['indexers'],
		})
	})

	test.prop([fc.string({ minLength: 0, maxLength: 100 })])('downloadFolder accepts any string', (downloadFolder) => {
		updateSettings({ downloadFolder })
		const settings = getSettings()
		expect(settings.downloadFolder).toBe(downloadFolder)
	})

	test.prop([fc.string({ minLength: 1, maxLength: 50 })])('defaultQuality accepts any string', (defaultQuality) => {
		updateSettings({ defaultQuality })
		const settings = getSettings()
		expect(settings.defaultQuality).toBe(defaultQuality)
	})

	const validResolutionArb = fc.record({
		name: fc.string({ minLength: 1, maxLength: 10 }),
		minGbPerHour: fc.double({ min: 0.1, max: 10 }),
		targetGbPerHour: fc.double({ min: 0.1, max: 50 }),
		maxGbPerHour: fc.double({ min: 0.1, max: 100 }),
	})

	test.prop([fc.array(validResolutionArb, { minLength: 1, maxLength: 5 })])('resolutions array updates correctly', (resolutions) => {
		updateSettings({ resolutions })
		const settings = getSettings()
		expect(settings.resolutions).toEqual(resolutions)
	})

	const validIndexerArb = fc.record({
		id: fc.string({ minLength: 1, maxLength: 20 }),
		name: fc.string({ minLength: 1, maxLength: 50 }),
		url: fc.constant('https://example.com'), // Use constant to avoid URL validation issues
		apiKey: fc.string({ minLength: 1, maxLength: 64 }),
		enabled: fc.boolean(),
		priority: fc.integer({ min: 0, max: 100 }),
	})

	test.prop([fc.array(validIndexerArb, { minLength: 0, maxLength: 3 })])('indexers array round-trips', (indexers) => {
		updateSettings({ indexers })
		const settings = getSettings()
		expect(settings.indexers).toEqual(indexers)
	})
})

// --- Schema Validation Tests ---

describe('settings defaults', () => {
	it('has sensible resolution defaults', () => {
		const settings = getSettings()
		expect(settings.resolutions.length).toBeGreaterThan(0)

		for (const res of settings.resolutions) {
			expect(res.minGbPerHour).toBeLessThan(res.targetGbPerHour)
			expect(res.targetGbPerHour).toBeLessThan(res.maxGbPerHour)
		}
	})

	it('has valid auth settings', () => {
		const settings = getSettings()
		expect(['none', 'form', 'basic']).toContain(settings.authSettings.method)
		expect(settings.authSettings.apiKey.length).toBeGreaterThanOrEqual(32)
	})

	it('has valid nzbget settings', () => {
		const settings = getSettings()
		expect(settings.nzbgetSettings.port).toBeGreaterThan(0)
		expect(settings.nzbgetSettings.port).toBeLessThan(65536)
	})
})
