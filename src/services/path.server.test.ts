import { fc, test } from '@fast-check/vitest'
import { describe, expect, it, vi } from 'vitest'

// --- Mock settings before imports ---

vi.mock('@/services/settings.server', () => ({
	getSettings: vi.fn(() => ({
		folders: {
			movies: [{ path: '/media/movies', isDefault: true }],
			tv: [{ path: '/media/tv', isDefault: true }],
		},
	})),
}))

// Mock db module - simplified for basic tests
vi.mock('@/db', () => ({
	db: {
		query: {
			series: {
				findFirst: vi.fn(),
			},
		},
	},
	schema: {
		series: { id: 'id' },
	},
}))

import { db } from '@/db'
import { getSettings } from '@/services/settings.server'
import { buildMoviePath, buildTvPath, getDefaultFolder, sanitizeFilename } from './path.server'

// --- Property-Based Tests for Pure Functions ---

describe('sanitizeFilename', () => {
	const INVALID_CHARS = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']

	test.prop([fc.string()])('removes all invalid filesystem characters', (input) => {
		const result = sanitizeFilename(input)
		for (const char of INVALID_CHARS) {
			expect(result).not.toContain(char)
		}
	})

	test.prop([fc.string()])('never throws', (input) => {
		expect(() => sanitizeFilename(input)).not.toThrow()
	})

	test.prop([fc.string()])('returns trimmed string', (input) => {
		const result = sanitizeFilename(input)
		expect(result).toBe(result.trim())
	})

	// Valid chars arbitrary - alphanumeric, spaces, and safe punctuation
	const validCharsArb = fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ()-_.!@#$%^&+=[]{}'`~"), { minLength: 0, maxLength: 30 }).map((arr) => arr.join(''))

	test.prop([validCharsArb])('preserves valid characters', (input) => {
		// Input with only valid chars should be preserved (except trimming)
		const result = sanitizeFilename(input)
		expect(result).toBe(input.trim())
	})

	test.prop([fc.string()])('result never contains consecutive invalid chars', (input) => {
		const result = sanitizeFilename(input)
		// After sanitization, result should not have any invalid chars at all
		for (const char of INVALID_CHARS) {
			expect(result.includes(char + char)).toBe(false)
		}
	})

	it('handles typical movie filenames', () => {
		expect(sanitizeFilename('Movie: The Sequel')).toBe('Movie The Sequel')
		expect(sanitizeFilename('What/Why?')).toBe('WhatWhy')
		expect(sanitizeFilename('Star*Wars')).toBe('StarWars')
		expect(sanitizeFilename('Film "Director\'s Cut"')).toBe("Film Director's Cut")
	})

	it('handles edge cases', () => {
		expect(sanitizeFilename('')).toBe('')
		expect(sanitizeFilename('   ')).toBe('')
		expect(sanitizeFilename(':::***???')).toBe('')
		expect(sanitizeFilename('  Normal Title  ')).toBe('Normal Title')
	})
})

// --- Tests for getDefaultFolder ---

describe('getDefaultFolder', () => {
	it('returns default movies folder', () => {
		const result = getDefaultFolder('movies')
		expect(result).toBe('/media/movies')
	})

	it('returns default tv folder', () => {
		const result = getDefaultFolder('tv')
		expect(result).toBe('/media/tv')
	})

	it('returns null when no folders configured', () => {
		vi.mocked(getSettings).mockReturnValueOnce({
			folders: { movies: [], tv: [] },
		} as unknown as ReturnType<typeof getSettings>)

		expect(getDefaultFolder('movies')).toBeNull()
	})

	it('falls back to first folder if no default', () => {
		vi.mocked(getSettings).mockReturnValueOnce({
			folders: {
				movies: [
					{ path: '/first', isDefault: false },
					{ path: '/second', isDefault: false },
				],
				tv: [],
			},
		} as unknown as ReturnType<typeof getSettings>)

		expect(getDefaultFolder('movies')).toBe('/first')
	})
})

// --- Tests for buildMoviePath ---

describe('buildMoviePath', () => {
	test.prop([fc.string({ minLength: 1, maxLength: 50 }), fc.integer({ min: 1900, max: 2099 })])('builds path with sanitized title and year', (title, year) => {
		const result = buildMoviePath(title, year)
		if (result) {
			expect(result).toContain(String(year))
			expect(result.startsWith('/media/movies/')).toBe(true)
		}
	})

	test.prop([fc.string({ minLength: 1 }), fc.integer({ min: 1900, max: 2099 })])('path never contains invalid filesystem chars', (title, year) => {
		const result = buildMoviePath(title, year)
		if (result) {
			for (const char of ['<', '>', ':', '"', '/', '\\', '|', '?', '*']) {
				// Allow / for path separator
				if (char === '/') continue
				expect(result.slice(result.lastIndexOf('/') + 1)).not.toContain(char)
			}
		}
	})

	it('builds correct path for normal movie', () => {
		const result = buildMoviePath('Inception', 2010)
		expect(result).toBe('/media/movies/Inception (2010)')
	})

	it('sanitizes invalid characters in title', () => {
		const result = buildMoviePath('Movie: The Sequel?', 2020)
		expect(result).toBe('/media/movies/Movie The Sequel (2020)')
	})

	it('returns null when no folder configured', () => {
		vi.mocked(getSettings).mockReturnValueOnce({
			folders: { movies: [], tv: [] },
		} as unknown as ReturnType<typeof getSettings>)

		expect(buildMoviePath('Test', 2020)).toBeNull()
	})
})

// --- Tests for buildTvPath ---

describe('buildTvPath', () => {
	it('builds path with series title and season', async () => {
		vi.mocked(db.query.series.findFirst).mockResolvedValueOnce({
			id: 1,
			title: 'Breaking Bad',
			year: 2008,
			useYearInFolder: false,
		} as never)

		const result = await buildTvPath(1, 1)
		expect(result).toBe('/media/tv/Breaking Bad/Season 1')
	})

	it('includes year when useYearInFolder is true', async () => {
		vi.mocked(db.query.series.findFirst).mockResolvedValueOnce({
			id: 1,
			title: 'Game of Thrones',
			year: 2011,
			useYearInFolder: true,
		} as never)

		const result = await buildTvPath(1, 1)
		expect(result).toBe('/media/tv/Game of Thrones (2011)/Season 1')
	})

	it('sanitizes series title', async () => {
		vi.mocked(db.query.series.findFirst).mockResolvedValueOnce({
			id: 1,
			title: 'What If...?',
			year: 2021,
			useYearInFolder: false,
		} as never)

		const result = await buildTvPath(1, 1)
		expect(result).toBe('/media/tv/What If.../Season 1')
	})

	it('returns null when series not found', async () => {
		vi.mocked(db.query.series.findFirst).mockResolvedValueOnce(null as never)

		const result = await buildTvPath(999, 1)
		expect(result).toBeNull()
	})

	it('returns null when no tv folder configured', async () => {
		vi.mocked(getSettings).mockReturnValueOnce({
			folders: { movies: [], tv: [] },
		} as unknown as ReturnType<typeof getSettings>)

		const result = await buildTvPath(1, 1)
		expect(result).toBeNull()
	})
})
