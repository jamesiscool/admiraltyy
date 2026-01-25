import { Database } from 'bun:sqlite'
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from '@/db/schema'

export type TestDb = ReturnType<typeof drizzle<typeof schema>>

// Cache generated migration statements
let cachedStatements: string[] | null = null

async function getSchemaStatements(): Promise<string[]> {
	if (cachedStatements) return cachedStatements

	const currentSnapshot = await generateSQLiteDrizzleJson(schema)

	const emptySnapshot = {
		version: '6',
		dialect: 'sqlite',
		id: '00000000-0000-0000-0000-000000000000',
		prevId: '00000000-0000-0000-0000-000000000000',
		tables: {},
		views: {},
		enums: {},
		_meta: { tables: {}, columns: {} },
	} as typeof currentSnapshot

	cachedStatements = await generateSQLiteMigration(emptySnapshot, currentSnapshot)
	return cachedStatements
}

// Create in-memory SQLite database with schema tables
export async function setupTestDb(): Promise<TestDb> {
	const sqlite = new Database(':memory:')
	const db = drizzle(sqlite, { schema })

	const statements = await getSchemaStatements()
	for (const stmt of statements) {
		sqlite.run(stmt)
	}

	return db
}

// Seed test data helper
export async function seedTestData(db: TestDb): Promise<void> {
	// Sample movie
	db.insert(schema.movies)
		.values({
			tmdbId: 27205,
			title: 'Inception',
			year: 2010,
			dateAdded: new Date().toISOString(),
			monitored: true,
			resolution: '1080p',
		})
		.run()

	// Sample series
	db.insert(schema.series)
		.values({
			tmdbId: 1396,
			title: 'Breaking Bad',
			year: 2008,
			status: 'ended',
			dateAdded: new Date().toISOString(),
			monitored: true,
			resolution: '1080p',
		})
		.run()
}
