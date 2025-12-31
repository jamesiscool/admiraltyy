import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { paths } from '../env'
import * as schema from './schema'

// Ensure the data directory exists
const dataDir = dirname(paths.databasePath)
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true })
}

const sqlite = new Database(paths.databasePath)
export const db = drizzle(sqlite, { schema })

export { schema }
