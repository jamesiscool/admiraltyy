import { z } from 'zod'

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
