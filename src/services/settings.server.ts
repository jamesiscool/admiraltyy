import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { env } from '@/env'
import { type Settings, settingsSchema } from './settings'

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
	if (!existsSync(env.SETTINGS_PATH)) {
		mkdirSync(env.SETTINGS_PATH, { recursive: true })
	}
	writeFileSync(env.SETTINGS_PATH, JSON.stringify(currentSettings, null, '\t'))
}

// Initialization

export function initSettings(): void {
	// Ensure log directory exists
	if (!existsSync(env.LOG_DIRECTORY)) {
		mkdirSync(env.LOG_DIRECTORY, { recursive: true })
	}

	// Load or create settings file
	if (existsSync(env.SETTINGS_PATH)) {
		try {
			const raw = readFileSync(env.SETTINGS_PATH, 'utf-8')
			const parsed = JSON.parse(raw)
			const validated = settingsSchema.parse(parsed)
			currentSettings = validated
			console.log(`✓ Loaded settings from ${env.SETTINGS_PATH}`)
		} catch (err) {
			console.error(`⚠ Failed to load settings from ${env.SETTINGS_PATH}:`, err)
			console.log('  Using default settings')
			currentSettings = defaultSettings
			saveSettings()
		}
	} else {
		console.log(`✓ Creating default settings at ${env.SETTINGS_PATH}`)
		currentSettings = defaultSettings
		saveSettings()
	}

	console.log(`  Config directory: ${env.DATA_DIRECTORY}`)
	console.log(`  Database path: ${env.DATABASE_PATH}`)
	console.log(`  Log directory: ${env.LOG_DIRECTORY}`)
}
