import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { env } from '@/env.ts'
import * as schema from './schema.ts'

// Ensure the data directory exists
const dataDir = dirname(env.DATABASE_PATH)
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true })
}

// Use bun:sqlite in production (Bun runtime), better-sqlite3 in dev (Node runtime)
const isBunRuntime = typeof globalThis.Bun !== 'undefined'

async function createDb() {
	if (isBunRuntime) {
		const { Database } = await import('bun:sqlite')
		const { drizzle } = await import('drizzle-orm/bun-sqlite')
		const sqlite = new Database(env.DATABASE_PATH)
		sqlite.run('PRAGMA journal_mode = WAL;')
		return drizzle(sqlite, { schema })
	}
	const BetterSqlite3 = (await import('better-sqlite3')).default
	const { drizzle } = await import('drizzle-orm/better-sqlite3')
	const sqlite = new BetterSqlite3(env.DATABASE_PATH)
	sqlite.exec('PRAGMA journal_mode = WAL;')
	return drizzle(sqlite, { schema })
}

export const db = await createDb()

export { schema }
