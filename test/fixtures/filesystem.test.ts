import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyFilesystem, createFilesystemFromJSON, createTestFilesystem, resetFilesystem, SAMPLE_LIBRARY, vol } from './filesystem'

describe('filesystem fixtures', () => {
	beforeEach(() => {
		resetFilesystem()
	})

	describe('createTestFilesystem', () => {
		it('creates sample movie library', () => {
			createTestFilesystem()

			// Check movies exist
			expect(vol.existsSync('/media/movies/Inception (2010)/Inception.2010.1080p.BluRay.x264.mkv')).toBe(true)
			expect(vol.existsSync('/media/movies/The Dark Knight (2008)/The.Dark.Knight.2008.2160p.UHD.BluRay.mkv')).toBe(true)
			expect(vol.existsSync('/media/movies/Fight Club (1999)/Fight.Club.1999.720p.WEB-DL.mp4')).toBe(true)
		})

		it('creates sample tv library', () => {
			createTestFilesystem()

			expect(vol.existsSync('/media/tv/Breaking Bad/Season 1/Breaking.Bad.S01E01.720p.BluRay.mkv')).toBe(true)
			expect(vol.existsSync('/media/tv/Breaking Bad/Season 2/Breaking.Bad.S02E01.1080p.WEB-DL.mkv')).toBe(true)
			expect(vol.existsSync('/media/tv/Game of Thrones (2011)/Season 1/Game.of.Thrones.S01E01.1080p.mkv')).toBe(true)
		})

		it('creates downloads folder for import tests', () => {
			createTestFilesystem()

			expect(vol.existsSync('/downloads/completed/Dune.2021.2160p.WEB-DL.x265/Dune.2021.2160p.WEB-DL.x265.mkv')).toBe(true)
		})

		it('includes extras and trailers for exclusion testing', () => {
			createTestFilesystem()

			// Main movie file
			expect(vol.existsSync('/media/movies/Interstellar (2014)/Interstellar.2014.1080p.BluRay.mkv')).toBe(true)
			// Extras folder (should be excluded in scans)
			expect(vol.existsSync('/media/movies/Interstellar (2014)/Extras/Behind.the.Scenes.mkv')).toBe(true)
			// Trailer file (should be excluded in scans)
			expect(vol.existsSync('/media/movies/Interstellar (2014)/Interstellar-trailer.mkv')).toBe(true)
		})

		it('files have sizes', () => {
			createTestFilesystem()

			const stats = vol.statSync('/media/movies/Inception (2010)/Inception.2010.1080p.BluRay.x264.mkv')
			expect(stats.size).toBe(1500) // Small buffer for tests
		})
	})

	describe('createEmptyFilesystem', () => {
		it('creates empty filesystem', () => {
			createEmptyFilesystem()

			expect(vol.existsSync('/media')).toBe(false)
			expect(vol.existsSync('/downloads')).toBe(false)
		})
	})

	describe('createFilesystemFromJSON', () => {
		it('creates custom structure', () => {
			createFilesystemFromJSON({
				'/custom/path/file.txt': 'content',
				'/another/file.mkv': Buffer.alloc(100),
			})

			expect(vol.existsSync('/custom/path/file.txt')).toBe(true)
			expect(vol.existsSync('/another/file.mkv')).toBe(true)
			expect(vol.readFileSync('/custom/path/file.txt', 'utf8')).toBe('content')
		})
	})

	describe('resetFilesystem', () => {
		it('clears all files', () => {
			createTestFilesystem()
			expect(vol.existsSync('/media/movies')).toBe(true)

			resetFilesystem()
			expect(vol.existsSync('/media/movies')).toBe(false)
		})
	})

	describe('SAMPLE_LIBRARY', () => {
		it('exports library structure constant', () => {
			expect(Object.keys(SAMPLE_LIBRARY).length).toBeGreaterThan(10)
		})
	})
})
