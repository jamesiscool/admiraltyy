import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

const DB_PATH = './data/admiraltyy.db'

// Ensure the data directory exists
const dataDir = dirname(DB_PATH)
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true })
}

const sqlite = new Database(DB_PATH)
export const db = drizzle(sqlite, { schema })

export { schema }
