import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cn, formatNextAiring, formatSize, generateSettingId } from './utils'

describe('cn', () => {
	it('merges class names', () => {
		expect(cn('foo', 'bar')).toBe('foo bar')
	})

	it('handles conditional classes', () => {
		const shouldExclude: boolean = false
		expect(cn('base', shouldExclude && 'excluded', 'included')).toBe('base included')
	})

	it('merges tailwind conflicts correctly', () => {
		expect(cn('p-4', 'p-2')).toBe('p-2')
		expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
	})

	it('handles arrays', () => {
		expect(cn(['foo', 'bar'])).toBe('foo bar')
	})
})

describe('formatSize', () => {
	it('returns 0 GB for zero', () => {
		expect(formatSize(0)).toBe('0 GB')
	})

	it('formats GB values', () => {
		expect(formatSize(1.5)).toBe('1.5 GB')
		expect(formatSize(100)).toBe('100.0 GB')
	})

	it('converts to TB for 1000+ GB', () => {
		expect(formatSize(1000)).toBe('1.0 TB')
		expect(formatSize(2500)).toBe('2.5 TB')
	})
})

describe('formatNextAiring', () => {
	it('returns null for null input', () => {
		expect(formatNextAiring(null)).toBeNull()
	})

	it('returns null for past dates', () => {
		const past = new Date(Date.now() - 1000 * 60 * 60).toISOString()
		expect(formatNextAiring(past)).toBeNull()
	})
})

describe('generateSettingId', () => {
	it('generates 5 char id', () => {
		const id = generateSettingId()
		expect(id).toHaveLength(5)
	})

	it('uses alphanumeric chars', () => {
		const id = generateSettingId()
		expect(id).toMatch(/^[0-9A-Za-z]+$/)
	})

	it('generates unique ids', () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateSettingId()))
		expect(ids.size).toBe(100)
	})
})

// Property-based tests with fast-check
describe('property-based tests', () => {
	it('cn never throws for any string inputs', () => {
		fc.assert(
			fc.property(fc.array(fc.string()), (inputs) => {
				expect(() => cn(...inputs)).not.toThrow()
			}),
		)
	})

	it('cn always returns a string', () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const result = cn(input)
				expect(typeof result).toBe('string')
			}),
		)
	})

	it('formatSize returns valid format for non-negative numbers', () => {
		fc.assert(
			fc.property(fc.double({ min: 0, max: 1e9, noNaN: true }), (gb) => {
				const result = formatSize(gb)
				expect(result).toMatch(/^\d+(\.\d+)?\s(GB|TB)$/)
			}),
		)
	})

	it('formatSize returns GB for values under 1000', () => {
		fc.assert(
			fc.property(fc.double({ min: 0, max: 999.9, noNaN: true }), (gb) => {
				const result = formatSize(gb)
				expect(result).toContain('GB')
			}),
		)
	})

	it('formatSize returns TB for values 1000+', () => {
		fc.assert(
			fc.property(fc.double({ min: 1000, max: 1e9, noNaN: true }), (gb) => {
				const result = formatSize(gb)
				expect(result).toContain('TB')
			}),
		)
	})

	it('generateSettingId always returns 5 char string', () => {
		fc.assert(
			fc.property(fc.nat(), () => {
				const id = generateSettingId()
				expect(id).toHaveLength(5)
				expect(id).toMatch(/^[0-9A-Za-z]+$/)
			}),
		)
	})
})
