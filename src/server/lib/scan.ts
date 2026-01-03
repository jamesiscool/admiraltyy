import { readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

// Constants

export const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v', '.ts', '.webm']

// Exclusion patterns (from Sonarr/Radarr)
const EXCLUDED_FOLDERS = /(?:extras|samples?|featurettes|behind the scenes|deleted scenes|interviews|trailers)$/i
const EXCLUDED_FILES = /-(trailer|sample|other|behindthescenes|deleted|featurette|interview|scene|short)\./i

// Quality parsing regexes
const RESOLUTION_REGEX = /\b(480p|720p|1080p|2160p|4k)\b/i
const SOURCE_REGEX = /\b(bluray|blu-ray|bdrip|brrip|hdtv|web-dl|webdl|webrip|web|dvdrip|dvd|hdcam|cam|ts|telesync|remux)\b/i
const CODEC_REGEX = /\b(x264|h\.?264|avc|x265|h\.?265|hevc|xvid|divx|av1)\b/i

// Episode parsing: S01E01, S1E1, 1x01, etc.
const EPISODE_REGEX = /(?:S(?<season>\d{1,2})E(?<episode>\d{1,3}))|(?:(?<seasonAlt>\d{1,2})x(?<episodeAlt>\d{2,3}))/i

// Title Simplification

// Simplify title for matching: lowercase, remove articles/punctuation, normalize spaces
export function simplifyTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/^(the|a|an)\s+/i, '') // Remove leading articles
		.replace(/[''`]/g, '') // Remove apostrophes
		.replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim()
}

// Exclusion Checks

export function isExcludedFolder(name: string): boolean {
	return EXCLUDED_FOLDERS.test(name)
}

export function isExcludedFile(name: string): boolean {
	return EXCLUDED_FILES.test(name)
}

export function isVideoFile(name: string): boolean {
	const ext = extname(name).toLowerCase()
	return VIDEO_EXTENSIONS.includes(ext)
}

// Quality Parsing

export interface ParsedQuality {
	resolution: string | null
	source: string | null
	codec: string | null
}

export function parseQuality(filename: string): ParsedQuality {
	const resMatch = filename.match(RESOLUTION_REGEX)
	const srcMatch = filename.match(SOURCE_REGEX)
	const codecMatch = filename.match(CODEC_REGEX)

	let resolution = resMatch?.[1]?.toLowerCase() ?? null
	if (resolution === '4k') resolution = '2160p'

	return {
		resolution,
		source: srcMatch?.[1]?.toLowerCase() ?? null,
		codec: codecMatch?.[1]?.toLowerCase().replace(/\./g, '') ?? null,
	}
}

// Episode Parsing

export interface ParsedEpisode {
	season: number
	episode: number
}

export function parseEpisode(filename: string): ParsedEpisode | null {
	const match = filename.match(EPISODE_REGEX)
	if (!match?.groups) return null

	const season = match.groups.season ?? match.groups.seasonAlt
	const episode = match.groups.episode ?? match.groups.episodeAlt

	if (!season || !episode) return null

	return {
		season: Number.parseInt(season, 10),
		episode: Number.parseInt(episode, 10),
	}
}

// Directory Scanning

export interface ScannedFolder {
	name: string
	path: string
	simplifiedName: string
}

// List immediate subfolders of a directory
export function listSubfolders(rootPath: string): ScannedFolder[] {
	try {
		const entries = readdirSync(rootPath, { withFileTypes: true })
		return entries
			.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
			.filter((e) => !isExcludedFolder(e.name))
			.map((e) => ({
				name: e.name,
				path: join(rootPath, e.name),
				simplifiedName: simplifyTitle(e.name),
			}))
	} catch {
		return []
	}
}

export interface ScannedFile {
	name: string
	path: string
	size: number
}

// List video files in a folder (non-recursive for movies)
export function listVideoFiles(folderPath: string): ScannedFile[] {
	try {
		const entries = readdirSync(folderPath, { withFileTypes: true })
		return entries
			.filter((e) => e.isFile() && isVideoFile(e.name) && !isExcludedFile(e.name))
			.map((e) => {
				const fullPath = join(folderPath, e.name)
				const stats = statSync(fullPath)
				return {
					name: e.name,
					path: fullPath,
					size: stats.size,
				}
			})
	} catch {
		return []
	}
}

// List video files recursively (for series with season subfolders)
export function listVideoFilesRecursive(folderPath: string): ScannedFile[] {
	const files: ScannedFile[] = []

	function walk(dir: string) {
		try {
			const entries = readdirSync(dir, { withFileTypes: true })
			for (const entry of entries) {
				const fullPath = join(dir, entry.name)
				if (entry.isDirectory()) {
					if (!entry.name.startsWith('.') && !isExcludedFolder(entry.name)) {
						walk(fullPath)
					}
				} else if (entry.isFile() && isVideoFile(entry.name) && !isExcludedFile(entry.name)) {
					const stats = statSync(fullPath)
					files.push({
						name: entry.name,
						path: fullPath,
						size: stats.size,
					})
				}
			}
		} catch {
			// Skip inaccessible directories
		}
	}

	walk(folderPath)
	return files
}

// Title Matching

export interface TitleEntry {
	id: number
	title: string
	alternateTitles: string[] | null
}

// Build a map of simplified title -> id for matching
export function buildTitleMap<T extends TitleEntry>(entries: T[]): Map<string, number> {
	const map = new Map<string, number>()

	for (const entry of entries) {
		// Add main title
		map.set(simplifyTitle(entry.title), entry.id)

		// Add alternate titles
		if (entry.alternateTitles) {
			for (const alt of entry.alternateTitles) {
				map.set(simplifyTitle(alt), entry.id)
			}
		}
	}

	return map
}

// Match a folder name to an entry using the title map
export function matchFolder(folder: ScannedFolder, titleMap: Map<string, number>): number | null {
	// Direct match
	const directMatch = titleMap.get(folder.simplifiedName)
	if (directMatch) return directMatch

	// Try extracting title from folder name (often: "Movie Title (2023)")
	const yearMatch = folder.name.match(/^(.+?)\s*\(\d{4}\)/)
	if (yearMatch) {
		const titleOnly = simplifyTitle(yearMatch[1])
		const match = titleMap.get(titleOnly)
		if (match) return match
	}

	return null
}
