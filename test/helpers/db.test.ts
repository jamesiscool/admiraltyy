import { describe, expect, test } from 'vitest'
import { seedTestData, setupTestDb } from './db'

describe('setupTestDb', () => {
	test('creates in-memory db with schema', async () => {
		const db = await setupTestDb()
		expect(db).toBeDefined()

		// Verify movies table exists (sync method for bun-sqlite)
		const movies = db.query.movies.findMany().sync()
		expect(movies).toEqual([])
	})

	test('seedTestData populates sample data', async () => {
		const db = await setupTestDb()
		await seedTestData(db)

		const movies = db.query.movies.findMany().sync()
		expect(movies).toHaveLength(1)
		expect(movies[0].title).toBe('Inception')

		const series = db.query.series.findMany().sync()
		expect(series).toHaveLength(1)
		expect(series[0].title).toBe('Breaking Bad')

		const seasons = db.query.seasons.findMany().sync()
		expect(seasons).toHaveLength(1)

		const episodes = db.query.episodes.findMany().sync()
		expect(episodes).toHaveLength(2)
	})
})
