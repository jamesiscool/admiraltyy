import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema.ts'

export const db = drizzle('data/admiraltyy.db', { schema })

export { schema }
export type { DownloadStatus } from './schema.ts'
