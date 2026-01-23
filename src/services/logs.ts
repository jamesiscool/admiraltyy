import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { env } from '@/env'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

function ensureLogDir(): void {
	if (!existsSync(env.LOG_DIRECTORY)) {
		mkdirSync(env.LOG_DIRECTORY, { recursive: true })
	}
}

function formatTimestamp(): string {
	return new Date().toISOString()
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
	const timestamp = formatTimestamp()
	const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
	return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
	ensureLogDir()

	const formatted = formatMessage(level, message, meta)
	const logFile = join(env.LOG_DIRECTORY, `${new Date().toISOString().split('T')[0]}.log`)

	// Write to file
	appendFileSync(logFile, formatted)

	// Also write to console
	const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
	consoleFn(formatted.trim())
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
	log('info', message, meta)
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
	log('warn', message, meta)
}

export function logError(message: string, meta?: Record<string, unknown>): void {
	log('error', message, meta)
}

export function logDebug(message: string, meta?: Record<string, unknown>): void {
	log('debug', message, meta)
}
