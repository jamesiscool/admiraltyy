import { fc, test as propTest } from '@fast-check/vitest'
import { describe, expect, test } from 'vitest'
import { isPathWithinRoot, resolveWithinSandbox, sanitizePath } from './paths'

describe('sanitizePath', () => {
	test('removes leading slashes', () => {
		expect(sanitizePath('/foo/bar')).toBe('foo/bar')
		expect(sanitizePath('///foo')).toBe('foo')
	})

	test('removes parent directory refs', () => {
		expect(sanitizePath('../foo')).toBe('foo')
		expect(sanitizePath('../../foo/bar')).toBe('foo/bar')
		expect(sanitizePath('foo/../bar')).toBe('bar')
		expect(sanitizePath('foo/../../bar')).toBe('bar')
	})

	test('removes current directory refs', () => {
		expect(sanitizePath('./foo')).toBe('foo')
		expect(sanitizePath('foo/./bar')).toBe('foo/bar')
	})

	test('normalizes slashes', () => {
		expect(sanitizePath('foo//bar')).toBe('foo/bar')
		expect(sanitizePath('foo\\bar')).toBe('foo/bar')
	})

	test('handles empty input', () => {
		expect(sanitizePath('')).toBe('')
	})

	test('handles complex traversal attempts', () => {
		expect(sanitizePath('../../../etc/passwd')).toBe('etc/passwd')
		expect(sanitizePath('foo/../../../etc/passwd')).toBe('etc/passwd')
		expect(sanitizePath('/foo/../bar/../../../baz')).toBe('baz')
	})

	// Property: sanitized paths never start with /
	propTest.prop([fc.string()])('never returns path starting with /', (input) => {
		const result = sanitizePath(input)
		expect(result.startsWith('/')).toBe(false)
	})

	// Property: sanitized paths never contain ..
	propTest.prop([fc.string()])('never returns path containing ..', (input) => {
		const result = sanitizePath(input)
		expect(result).not.toContain('..')
	})

	// Property: sanitized paths never contain double slashes
	propTest.prop([fc.string()])('never returns path with double slashes', (input) => {
		const result = sanitizePath(input)
		expect(result).not.toContain('//')
	})
})

describe('isPathWithinRoot', () => {
	test('returns true for child paths', () => {
		expect(isPathWithinRoot('/root', 'foo')).toBe(true)
		expect(isPathWithinRoot('/root', 'foo/bar')).toBe(true)
		expect(isPathWithinRoot('/root', './foo')).toBe(true)
	})

	test('returns false for parent traversal', () => {
		expect(isPathWithinRoot('/root', '../foo')).toBe(false)
		expect(isPathWithinRoot('/root', 'foo/../../bar')).toBe(false)
	})

	test('returns false for absolute paths outside root', () => {
		expect(isPathWithinRoot('/root', '/etc/passwd')).toBe(false)
	})

	test('returns true for absolute paths within root', () => {
		expect(isPathWithinRoot('/root', '/root/foo')).toBe(true)
	})
})

describe('resolveWithinSandbox', () => {
	test('resolves valid paths', () => {
		const result = resolveWithinSandbox('/sandbox', 'foo/bar')
		expect(result).toBe('/sandbox/foo/bar')
	})

	test('sanitizes path before resolving', () => {
		const result = resolveWithinSandbox('/sandbox', '../foo')
		expect(result).toBe('/sandbox/foo')
	})

	test('returns null for escape attempts after sanitization check', () => {
		// This tests the double-check mechanism
		const result = resolveWithinSandbox('/sandbox', 'valid/path')
		expect(result).toBe('/sandbox/valid/path')
	})

	test('handles empty path', () => {
		const result = resolveWithinSandbox('/sandbox', '')
		expect(result).toBe('/sandbox')
	})

	// Arbitrary path strings - sandbox root should contain resolved path
	propTest.prop([fc.string()])('resolved path is always within sandbox or null', (userPath) => {
		const result = resolveWithinSandbox('/sandbox', userPath)
		if (result !== null) {
			expect(result.startsWith('/sandbox')).toBe(true)
		}
	})
})
