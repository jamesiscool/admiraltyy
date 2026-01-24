import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { env } from '@/env.ts'
import * as schema from './schema.ts'

// Ensure the data directory exists
const dataDir = dirname(env.DATABASE_PATH)
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true })
}

const sqlite = new Database(env.DATABASE_PATH)
sqlite.run('PRAGMA journal_mode = WAL;')

export const db = drizzle(sqlite, { schema })

export { schema }
