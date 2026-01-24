import { isAbsolute, normalize, relative, resolve } from 'node:path'

/**
 * Sanitize a path to prevent directory traversal attacks.
 * Returns a path that is guaranteed to be within the sandbox root.
 * Never returns paths starting with / or containing ..
 */
export function sanitizePath(input: string): string {
	// Normalize path separators and resolve . and ..
	const normalized = normalize(input)

	// Split into segments and filter out dangerous ones
	const segments = normalized.split(/[\\/]/).filter((seg) => {
		const trimmed = seg.trim()
		// Remove empty segments, current dir refs, and parent dir refs
		if (!trimmed || trimmed === '.' || trimmed === '..') return false
		return true
	})

	return segments.join('/')
}

/**
 * Check if a path is safely within a root directory.
 * Returns true if resolvedPath is a child of rootPath.
 */
export function isPathWithinRoot(rootPath: string, testPath: string): boolean {
	const root = resolve(rootPath)
	const test = resolve(rootPath, testPath)
	const rel = relative(root, test)

	// If relative path starts with .. or is absolute, it escapes the root
	if (rel.startsWith('..') || isAbsolute(rel)) {
		return false
	}

	return true
}

/**
 * Resolve a user-provided path within a sandbox directory.
 * Returns null if the path would escape the sandbox.
 */
export function resolveWithinSandbox(sandboxRoot: string, userPath: string): string | null {
	const sanitized = sanitizePath(userPath)
	const resolved = resolve(sandboxRoot, sanitized)

	// Double-check the resolved path is within sandbox
	if (!isPathWithinRoot(sandboxRoot, sanitized)) {
		return null
	}

	return resolved
}
