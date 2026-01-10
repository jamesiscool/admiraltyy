import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import { paths } from './env'

// Zod Schemas
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

export const settingsSchema = z.object({
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

export type Settings = z.infer<typeof settingsSchema>
export type Folder = z.infer<typeof folderSchema>
export type Folders = z.infer<typeof foldersSchema>
export type Indexer = z.infer<typeof indexerSchema>
export type UsenetServer = z.infer<typeof usenetServerSchema>
export type Resolution = z.infer<typeof resolutionSchema>
export type Language = z.infer<typeof languageSchema>
export type LanguageSettings = z.infer<typeof languageSettingsSchema>
export type FormatPreference = z.infer<typeof formatPreferenceSchema>
export type FormatSettings = z.infer<typeof formatSettingsSchema>
export type AuthSettings = z.infer<typeof authSettingsSchema>
export type NzbgetSettings = z.infer<typeof nzbgetSettingsSchema>

const defaultSettings: Settings = {
	folders: {
		movies: [],
		tv: [],
	},
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

// Helpers

function generateApiKey(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
	let key = ''
	for (let i = 0; i < 32; i++) {
		key += chars[Math.floor(Math.random() * chars.length)]
	}
	return key
}

export function generateNzbgetPassword(): string {
	// Only alphanumeric chars - safe for URLs and terminals without escaping
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
	let password = ''
	for (let i = 0; i < 32; i++) {
		password += chars[Math.floor(Math.random() * chars.length)]
	}
	return password
}

// Settings State

let currentSettings: Settings = defaultSettings

export function getSettings(): Settings {
	return currentSettings
}

export function updateSettings(updates: Partial<Settings>): Settings {
	currentSettings = { ...currentSettings, ...updates }
	saveSettings()
	return currentSettings
}

export function saveSettings(): void {
	const dir = dirname(paths.settingsPath)
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true })
	}
	writeFileSync(paths.settingsPath, JSON.stringify(currentSettings, null, '\t'))
}

// Initialization

export function initSettings(): void {
	// Ensure log directory exists
	if (!existsSync(paths.logDirectory)) {
		mkdirSync(paths.logDirectory, { recursive: true })
	}

	// Load or create settings file
	if (existsSync(paths.settingsPath)) {
		try {
			const raw = readFileSync(paths.settingsPath, 'utf-8')
			const parsed = JSON.parse(raw)
			const validated = settingsSchema.parse(parsed)
			currentSettings = validated
			console.log(`✓ Loaded settings from ${paths.settingsPath}`)
		} catch (err) {
			console.error(`⚠ Failed to load settings from ${paths.settingsPath}:`, err)
			console.log('  Using default settings')
			currentSettings = defaultSettings
			saveSettings()
		}
	} else {
		console.log(`✓ Creating default settings at ${paths.settingsPath}`)
		currentSettings = defaultSettings
		saveSettings()
	}

	console.log(`  Config directory: ${paths.configDirectory}`)
	console.log(`  Database path: ${paths.databasePath}`)
	console.log(`  Log directory: ${paths.logDirectory}`)
}
