import fc from 'fast-check'
import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
} from './fileScan'

// Mock node:fs with memfs
vi.mock('node:fs', async () => {
	const memfs = await import('memfs')
	return memfs.fs
})

describe('fileScan', () => {
	beforeEach(() => {
		vol.reset()
	})

	describe('simplifyTitle', () => {
		it('lowercases and removes articles', () => {
			expect(simplifyTitle('The Matrix')).toBe('matrix')
			expect(simplifyTitle('A Beautiful Mind')).toBe('beautiful mind')
			expect(simplifyTitle('An Education')).toBe('education')
		})

		it('removes punctuation', () => {
			expect(simplifyTitle("Ocean's Eleven")).toBe('oceans eleven')
			expect(simplifyTitle('Spider-Man: No Way Home')).toBe('spider man no way home')
		})

		it('normalizes whitespace', () => {
			expect(simplifyTitle('Movie   Title')).toBe('movie title')
			expect(simplifyTitle('  Spaces  Around  ')).toBe('spaces around')
		})

		// Property: output never contains uppercase
		it.each([
			['The MATRIX', 'matrix'],
			['INCEPTION', 'inception'],
		])('always lowercase: %s -> %s', (input, expected) => {
			expect(simplifyTitle(input)).toBe(expected)
		})
	})

	describe('isExcludedFolder', () => {
		it('excludes extras folders', () => {
			expect(isExcludedFolder('Extras')).toBe(true)
			expect(isExcludedFolder('extras')).toBe(true)
			expect(isExcludedFolder('EXTRAS')).toBe(true)
		})

		it('excludes sample folders', () => {
			expect(isExcludedFolder('Sample')).toBe(true)
			expect(isExcludedFolder('Samples')).toBe(true)
		})

		it('excludes other special folders', () => {
			expect(isExcludedFolder('Featurettes')).toBe(true)
			expect(isExcludedFolder('Behind the scenes')).toBe(true)
			expect(isExcludedFolder('Deleted Scenes')).toBe(true)
			expect(isExcludedFolder('Interviews')).toBe(true)
			expect(isExcludedFolder('Trailers')).toBe(true)
		})

		it('allows normal folders', () => {
			expect(isExcludedFolder('Season 1')).toBe(false)
			expect(isExcludedFolder('Movie Title (2020)')).toBe(false)
		})
	})

	describe('isExcludedFile', () => {
		it('excludes trailer files', () => {
			expect(isExcludedFile('Movie-trailer.mkv')).toBe(true)
			expect(isExcludedFile('Movie-Trailer.mkv')).toBe(true)
		})

		it('excludes sample files', () => {
			expect(isExcludedFile('Movie-sample.mkv')).toBe(true)
		})

		it('allows normal files', () => {
			expect(isExcludedFile('Movie.2020.1080p.BluRay.mkv')).toBe(false)
			expect(isExcludedFile('Show.S01E01.720p.mkv')).toBe(false)
		})
	})

	describe('isVideoFile', () => {
		it('recognizes video extensions', () => {
			for (const ext of VIDEO_EXTENSIONS) {
				expect(isVideoFile(`movie${ext}`)).toBe(true)
			}
		})

		it('rejects non-video files', () => {
			expect(isVideoFile('movie.txt')).toBe(false)
			expect(isVideoFile('movie.srt')).toBe(false)
			expect(isVideoFile('movie.nfo')).toBe(false)
		})

		it('is case insensitive', () => {
			expect(isVideoFile('movie.MKV')).toBe(true)
			expect(isVideoFile('movie.Mp4')).toBe(true)
		})
	})

	describe('parseQuality', () => {
		it('parses resolution', () => {
			expect(parseQuality('Movie.1080p.BluRay.mkv').resolution).toBe('1080p')
			expect(parseQuality('Movie.720p.WEB-DL.mkv').resolution).toBe('720p')
			expect(parseQuality('Movie.2160p.UHD.mkv').resolution).toBe('2160p')
			expect(parseQuality('Movie.4K.HDR.mkv').resolution).toBe('2160p')
		})

		it('parses source', () => {
			expect(parseQuality('Movie.1080p.BluRay.mkv').source).toBe('bluray')
			expect(parseQuality('Movie.720p.WEB-DL.mkv').source).toBe('web-dl')
			expect(parseQuality('Movie.HDTV.mkv').source).toBe('hdtv')
			expect(parseQuality('Movie.DVDRip.mkv').source).toBe('dvdrip')
		})

		it('parses codec', () => {
			expect(parseQuality('Movie.x264.mkv').codec).toBe('x264')
			expect(parseQuality('Movie.x265.mkv').codec).toBe('x265')
			expect(parseQuality('Movie.H.265.mkv').codec).toBe('h265')
			expect(parseQuality('Movie.HEVC.mkv').codec).toBe('hevc')
		})

		it('returns null for missing components', () => {
			const q = parseQuality('Random.Movie.mkv')
			expect(q.resolution).toBeNull()
			expect(q.source).toBeNull()
			expect(q.codec).toBeNull()
		})
	})

	describe('parseEpisode', () => {
		it('parses S01E01 format', () => {
			expect(parseEpisode('Show.S01E01.720p.mkv')).toEqual({ season: 1, episode: 1 })
			expect(parseEpisode('Show.S02E15.1080p.mkv')).toEqual({ season: 2, episode: 15 })
			expect(parseEpisode('Show.S10E100.mkv')).toEqual({ season: 10, episode: 100 })
		})

		it('parses 1x01 format', () => {
			expect(parseEpisode('Show.1x01.720p.mkv')).toEqual({ season: 1, episode: 1 })
			expect(parseEpisode('Show.2x15.mkv')).toEqual({ season: 2, episode: 15 })
		})

		it('returns null for non-episode files', () => {
			expect(parseEpisode('Movie.2020.1080p.mkv')).toBeNull()
			expect(parseEpisode('Random.File.mkv')).toBeNull()
		})
	})

	describe('listSubfolders (with memfs)', () => {
		beforeEach(() => {
			vol.fromJSON({
				'/media/movies/Inception (2010)/file.mkv': '',
				'/media/movies/The Matrix (1999)/file.mkv': '',
				'/media/movies/.hidden/file.mkv': '',
				'/media/movies/Extras/file.mkv': '',
			})
		})

		it('lists visible subfolders', () => {
			const folders = listSubfolders('/media/movies')
			const names = folders.map((f) => f.name)

			expect(names).toContain('Inception (2010)')
			expect(names).toContain('The Matrix (1999)')
		})

		it('excludes hidden folders', () => {
			const folders = listSubfolders('/media/movies')
			const names = folders.map((f) => f.name)

			expect(names).not.toContain('.hidden')
		})

		it('excludes special folders', () => {
			const folders = listSubfolders('/media/movies')
			const names = folders.map((f) => f.name)

			expect(names).not.toContain('Extras')
		})

		it('includes simplified names', () => {
			const folders = listSubfolders('/media/movies')
			const inception = folders.find((f) => f.name === 'Inception (2010)')

			expect(inception?.simplifiedName).toBe('inception 2010')
		})

		it('returns empty for non-existent path', () => {
			expect(listSubfolders('/non/existent/path')).toEqual([])
		})
	})

	describe('listVideoFiles (with memfs)', () => {
		beforeEach(() => {
			vol.fromJSON({
				'/media/movies/Inception/Inception.mkv': Buffer.alloc(1000),
				'/media/movies/Inception/Inception.srt': '',
				'/media/movies/Inception/Inception-trailer.mkv': Buffer.alloc(100),
				'/media/movies/Inception/poster.jpg': '',
			})
		})

		it('lists video files only', () => {
			const files = listVideoFiles('/media/movies/Inception')

			expect(files).toHaveLength(1)
			expect(files[0].name).toBe('Inception.mkv')
		})

		it('excludes trailer files', () => {
			const files = listVideoFiles('/media/movies/Inception')
			const names = files.map((f) => f.name)

			expect(names).not.toContain('Inception-trailer.mkv')
		})

		it('includes file size', () => {
			const files = listVideoFiles('/media/movies/Inception')

			expect(files[0].size).toBe(1000)
		})
	})

	describe('listVideoFilesRecursive (with memfs)', () => {
		beforeEach(() => {
			vol.fromJSON({
				'/media/tv/Show/Season 1/S01E01.mkv': Buffer.alloc(500),
				'/media/tv/Show/Season 1/S01E02.mkv': Buffer.alloc(500),
				'/media/tv/Show/Season 2/S02E01.mkv': Buffer.alloc(600),
				'/media/tv/Show/Extras/Behind.mkv': Buffer.alloc(100),
				'/media/tv/Show/.hidden/file.mkv': Buffer.alloc(100),
			})
		})

		it('lists files from all season folders', () => {
			const files = listVideoFilesRecursive('/media/tv/Show')
			const names = files.map((f) => f.name)

			expect(names).toContain('S01E01.mkv')
			expect(names).toContain('S01E02.mkv')
			expect(names).toContain('S02E01.mkv')
		})

		it('excludes files from excluded folders', () => {
			const files = listVideoFilesRecursive('/media/tv/Show')
			const names = files.map((f) => f.name)

			expect(names).not.toContain('Behind.mkv')
		})

		it('excludes hidden folders', () => {
			const files = listVideoFilesRecursive('/media/tv/Show')
			const paths = files.map((f) => f.path)

			expect(paths.some((p) => p.includes('.hidden'))).toBe(false)
		})
	})

	describe('buildTitleMap', () => {
		it('maps titles to ids', () => {
			const entries = [
				{ id: 1, title: 'The Matrix', alternateTitles: null },
				{ id: 2, title: 'Inception', alternateTitles: null },
			]

			const map = buildTitleMap(entries)

			expect(map.get('matrix')).toBe(1)
			expect(map.get('inception')).toBe(2)
		})

		it('includes alternate titles', () => {
			const entries = [{ id: 1, title: 'The Avengers', alternateTitles: ['Avengers Assemble', 'Los Vengadores'] }]

			const map = buildTitleMap(entries)

			expect(map.get('avengers')).toBe(1)
			expect(map.get('avengers assemble')).toBe(1)
			expect(map.get('los vengadores')).toBe(1)
		})
	})

	describe('matchFolder', () => {
		const titleMap = new Map([
			['inception', 27205],
			['matrix', 603],
		])

		it('matches direct title', () => {
			const folder = { name: 'Inception', path: '/movies/Inception', simplifiedName: 'inception' }
			expect(matchFolder(folder, titleMap)).toBe(27205)
		})

		it('matches title with year', () => {
			const folder = { name: 'The Matrix (1999)', path: '/movies/The Matrix (1999)', simplifiedName: 'matrix 1999' }
			expect(matchFolder(folder, titleMap)).toBe(603)
		})

		it('returns null for no match', () => {
			const folder = { name: 'Unknown Movie', path: '/movies/Unknown', simplifiedName: 'unknown movie' }
			expect(matchFolder(folder, titleMap)).toBeNull()
		})
	})

	describe('property-based tests', () => {
		it('simplifyTitle always returns lowercase', () => {
			fc.assert(
				fc.property(fc.string({ minLength: 1, maxLength: 100 }), (title) => {
					const result = simplifyTitle(title)
					expect(result).toBe(result.toLowerCase())
				}),
			)
		})

		it('parseEpisode returns valid season/episode numbers', () => {
			fc.assert(
				fc.property(fc.integer({ min: 1, max: 99 }), fc.integer({ min: 1, max: 999 }), (season, episode) => {
					const filename = `Show.S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}.mkv`
					const result = parseEpisode(filename)

					expect(result).not.toBeNull()
					expect(result?.season).toBe(season)
					expect(result?.episode).toBe(episode)
				}),
			)
		})

		it('parseQuality 4k always maps to 2160p', () => {
			const inputs = ['Movie.4K.mkv', 'Movie.4k.HDR.mkv', 'Show.4K.WEB.mkv']
			for (const input of inputs) {
				expect(parseQuality(input).resolution).toBe('2160p')
			}
		})
	})
})
