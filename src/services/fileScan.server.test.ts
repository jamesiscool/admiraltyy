import { fc, test } from '@fast-check/vitest'
import { fs as memfs, vol } from 'memfs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SAMPLE_MEDIA_LIBRARY } from '../../test/helpers/fs'

// --- Mock dependencies before imports ---

// Mock db module to avoid env.ts import issues
vi.mock('@/db', () => ({
	db: {},
	schema: {
		files: {},
		movies: {},
		series: {},
		seasons: {},
		episodes: {},
	},
}))

// Mock settings to avoid env.ts import issues
vi.mock('@/services/settings.server', () => ({
	getSettings: () => ({
		folders: { movies: [], tv: [] },
	}),
}))

// Mock node:fs with memfs
vi.mock('node:fs', () => memfs)

import {
	buildTitleMap,
	isExcludedFile,
	isExcludedFolder,
	isVideoFile,
	listSubfolders,
	listVideoFiles,
	listVideoFilesRecursive,
	matchFolder,
	parseEpisode,
	parseQuality,
	simplifyTitle,
	VIDEO_EXTENSIONS,
} from './fileScan.server'

beforeEach(() => {
	vol.reset()
})

afterEach(() => {
	vol.reset()
})

// --- Property-Based Tests for Pure Functions ---

describe('simplifyTitle', () => {
	test.prop([fc.string()])('returns lowercase', (input) => {
		const result = simplifyTitle(input)
		expect(result).toBe(result.toLowerCase())
	})

	test.prop([fc.string()])('removes exactly one leading article', (input) => {
		// After removing one leading article, the result should differ from just lowercasing
		const withThe = `The ${input}`
		const resultThe = simplifyTitle(withThe)
		// The leading "the " should be stripped (result won't have it as prefix of normalized version)
		expect(resultThe.startsWith('the ')).toBe(false)

		const withA = `A ${input}`
		const resultA = simplifyTitle(withA)
		// Compare to what we'd get without the prefix
		const baseResult = simplifyTitle(input)
		// Result should match the base result (article stripped)
		expect(resultA).toBe(baseResult)
	})

	test.prop([fc.string()])('normalizes whitespace', (input) => {
		const result = simplifyTitle(input)
		expect(result).not.toMatch(/\s{2,}/)
	})

	it('handles typical movie titles', () => {
		expect(simplifyTitle('The Dark Knight')).toBe('dark knight')
		expect(simplifyTitle("Ocean's Eleven")).toBe('oceans eleven')
		expect(simplifyTitle("A Bug's Life")).toBe('bugs life')
	})
})

describe('isExcludedFolder', () => {
	const excludedFolders = ['extras', 'Extras', 'EXTRAS', 'samples', 'Samples', 'featurettes', 'behind the scenes', 'deleted scenes', 'interviews', 'trailers']

	it.each(excludedFolders)('excludes folder: %s', (folder) => {
		expect(isExcludedFolder(folder)).toBe(true)
	})

	const allowedFolders = ['Season 1', 'movies', 'tv', 'Complete Series', 'Special']

	it.each(allowedFolders)('allows folder: %s', (folder) => {
		expect(isExcludedFolder(folder)).toBe(false)
	})
})

describe('isExcludedFile', () => {
	const excludedFiles = ['movie-trailer.mkv', 'movie-sample.mkv', 'clip-featurette.mp4', 'scene-interview.mkv', 'deleted-short.mkv']

	it.each(excludedFiles)('excludes file: %s', (file) => {
		expect(isExcludedFile(file)).toBe(true)
	})

	const allowedFiles = ['Movie.2020.1080p.BluRay.mkv', 'Show.S01E01.720p.mkv', 'Documentary.2019.WEB-DL.mp4']

	it.each(allowedFiles)('allows file: %s', (file) => {
		expect(isExcludedFile(file)).toBe(false)
	})
})

describe('isVideoFile', () => {
	it.each(VIDEO_EXTENSIONS)('recognizes extension: %s', (ext) => {
		expect(isVideoFile(`movie${ext}`)).toBe(true)
		expect(isVideoFile(`MOVIE${ext.toUpperCase()}`)).toBe(true)
	})

	const nonVideoFiles = ['movie.srt', 'movie.nfo', 'movie.txt', 'movie.jpg', 'movie.png']

	it.each(nonVideoFiles)('rejects non-video: %s', (file) => {
		expect(isVideoFile(file)).toBe(false)
	})
})

describe('parseQuality', () => {
	// Resolution parsing
	const resolutions = [
		['480p', '480p'],
		['720p', '720p'],
		['1080p', '1080p'],
		['2160p', '2160p'],
		['4k', '2160p'],
		['4K', '2160p'],
	] as const

	it.each(resolutions)('parses resolution %s as %s', (input, expected) => {
		const result = parseQuality(`Movie.${input}.BluRay.mkv`)
		expect(result.resolution).toBe(expected)
	})

	// Source parsing
	const sources = [
		['BluRay', 'bluray'],
		['blu-ray', 'blu-ray'],
		['WEB-DL', 'web-dl'],
		['WEBDL', 'webdl'],
		['WEBRip', 'webrip'],
		['HDTV', 'hdtv'],
		['DVDRip', 'dvdrip'],
		['Remux', 'remux'],
	] as const

	it.each(sources)('parses source %s as %s', (input, expected) => {
		const result = parseQuality(`Movie.1080p.${input}.mkv`)
		expect(result.source).toBe(expected)
	})

	// Codec parsing
	const codecs = [
		['x264', 'x264'],
		['h264', 'h264'],
		['h.264', 'h264'],
		['x265', 'x265'],
		['HEVC', 'hevc'],
		['AV1', 'av1'],
	] as const

	it.each(codecs)('parses codec %s as %s', (input, expected) => {
		const result = parseQuality(`Movie.1080p.BluRay.${input}.mkv`)
		expect(result.codec).toBe(expected)
	})

	it('handles filenames with no quality info', () => {
		const result = parseQuality('random_file.mkv')
		expect(result.resolution).toBeNull()
		expect(result.source).toBeNull()
		expect(result.codec).toBeNull()
	})

	test.prop([fc.string()])('never throws', (input) => {
		expect(() => parseQuality(input)).not.toThrow()
	})
})

describe('parseEpisode', () => {
	// Standard S01E01 format
	const standardFormats = [
		['S01E01', 1, 1],
		['S1E1', 1, 1],
		['S01E12', 1, 12],
		['S12E01', 12, 1],
		['s01e01', 1, 1],
	] as const

	it.each(standardFormats)('parses %s as season %d episode %d', (input, season, episode) => {
		const result = parseEpisode(`Show.${input}.720p.mkv`)
		expect(result).toEqual({ season, episode })
	})

	// Alternative 1x01 format
	const altFormats = [
		['1x01', 1, 1],
		['1x12', 1, 12],
		['12x01', 12, 1],
	] as const

	it.each(altFormats)('parses %s as season %d episode %d', (input, season, episode) => {
		const result = parseEpisode(`Show.${input}.720p.mkv`)
		expect(result).toEqual({ season, episode })
	})

	it('returns null for non-episode files', () => {
		expect(parseEpisode('Movie.2020.1080p.mkv')).toBeNull()
		expect(parseEpisode('random_file.mkv')).toBeNull()
	})

	test.prop([fc.string()])('never throws', (input) => {
		expect(() => parseEpisode(input)).not.toThrow()
	})
})

describe('buildTitleMap', () => {
	it('maps main titles', () => {
		const entries = [
			{ id: 1, title: 'The Matrix', alternateTitles: null },
			{ id: 2, title: 'Inception', alternateTitles: null },
		]
		const map = buildTitleMap(entries)

		expect(map.get('matrix')).toBe(1)
		expect(map.get('inception')).toBe(2)
	})

	it('maps alternate titles', () => {
		const entries = [{ id: 1, title: 'The Dark Knight', alternateTitles: ['Batman 2', 'TDK'] }]
		const map = buildTitleMap(entries)

		expect(map.get('dark knight')).toBe(1)
		expect(map.get('batman 2')).toBe(1)
		expect(map.get('tdk')).toBe(1)
	})

	test.prop([fc.array(fc.record({ id: fc.integer({ min: 1 }), title: fc.string({ minLength: 1 }), alternateTitles: fc.constant(null) }), { maxLength: 10 })])('never throws', (entries) => {
		expect(() => buildTitleMap(entries)).not.toThrow()
	})
})

describe('matchFolder', () => {
	const titleMap = new Map([
		['inception', 1],
		['dark knight', 2],
		['fight club', 3],
	])

	it('matches direct simplified name', () => {
		const folder = { name: 'Inception', path: '/movies/Inception', simplifiedName: 'inception' }
		expect(matchFolder(folder, titleMap)).toBe(1)
	})

	it('matches folder with year in name', () => {
		const folder = { name: 'Inception (2010)', path: '/movies/Inception (2010)', simplifiedName: 'inception 2010' }
		expect(matchFolder(folder, titleMap)).toBe(1)
	})

	it('returns null for unmatched folders', () => {
		const folder = { name: 'Unknown Movie', path: '/movies/Unknown', simplifiedName: 'unknown movie' }
		expect(matchFolder(folder, titleMap)).toBeNull()
	})
})

// --- Filesystem-Dependent Tests (using memfs) ---

describe('listSubfolders', () => {
	beforeEach(() => {
		vol.fromJSON({
			'/movies/Inception (2010)/.gitkeep': '',
			'/movies/The Matrix (1999)/.gitkeep': '',
			'/movies/.hidden/.gitkeep': '',
			'/movies/Extras/.gitkeep': '',
		} as Record<string, string | Buffer>)
	})

	it('lists visible non-excluded subfolders', () => {
		const folders = listSubfolders('/movies')

		expect(folders).toHaveLength(2)
		expect(folders.map((f) => f.name)).toContain('Inception (2010)')
		expect(folders.map((f) => f.name)).toContain('The Matrix (1999)')
	})

	it('excludes hidden folders', () => {
		const folders = listSubfolders('/movies')
		expect(folders.map((f) => f.name)).not.toContain('.hidden')
	})

	it('excludes special folders like Extras', () => {
		const folders = listSubfolders('/movies')
		expect(folders.map((f) => f.name)).not.toContain('Extras')
	})

	it('returns empty array for non-existent path', () => {
		const folders = listSubfolders('/nonexistent')
		expect(folders).toEqual([])
	})
})

describe('listVideoFiles', () => {
	beforeEach(() => {
		vol.fromJSON(SAMPLE_MEDIA_LIBRARY as Record<string, string | Buffer>)
	})

	it('lists video files in folder', () => {
		const files = listVideoFiles('/media/movies/Inception (2010)')

		expect(files).toHaveLength(1)
		expect(files[0].name).toBe('Inception.2010.1080p.BluRay.x264.mkv')
		expect(files[0].size).toBe(1500)
	})

	it('excludes non-video files', () => {
		const files = listVideoFiles('/media/movies/Inception (2010)')
		expect(files.map((f) => f.name)).not.toContain('Inception.2010.1080p.BluRay.x264.srt')
	})

	it('excludes trailer files', () => {
		const files = listVideoFiles('/media/movies/Interstellar (2014)')

		// Should only have main movie, not trailer
		expect(files).toHaveLength(1)
		expect(files[0].name).toBe('Interstellar.2014.1080p.BluRay.mkv')
	})

	it('returns empty array for non-existent path', () => {
		const files = listVideoFiles('/nonexistent')
		expect(files).toEqual([])
	})
})

describe('listVideoFilesRecursive', () => {
	beforeEach(() => {
		vol.fromJSON(SAMPLE_MEDIA_LIBRARY as Record<string, string | Buffer>)
	})

	it('lists video files in nested season folders', () => {
		const files = listVideoFilesRecursive('/media/tv/Breaking Bad')

		expect(files).toHaveLength(5) // 3 in S1 + 2 in S2
		expect(files.map((f) => f.name)).toContain('Breaking.Bad.S01E01.720p.BluRay.mkv')
		expect(files.map((f) => f.name)).toContain('Breaking.Bad.S02E02.1080p.WEB-DL.mkv')
	})

	it('excludes Extras folder', () => {
		const files = listVideoFilesRecursive('/media/movies/Interstellar (2014)')

		// Should only have main movie, not extras
		expect(files).toHaveLength(1)
		expect(files[0].name).toBe('Interstellar.2014.1080p.BluRay.mkv')
	})

	it('returns empty array for non-existent path', () => {
		const files = listVideoFilesRecursive('/nonexistent')
		expect(files).toEqual([])
	})
})
