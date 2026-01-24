import fc from 'fast-check'
import { beforeEach, describe, expect, it } from 'vitest'
import * as schema from '@/db/schema'
import { seedTestData, setupTestDb, type TestDb } from './db'

describe('setupTestDb', () => {
	let db: TestDb

	beforeEach(() => {
		db = setupTestDb()
	})

	it('creates all tables', () => {
		// Verify tables exist by selecting from them
		expect(() => db.select().from(schema.movies).all()).not.toThrow()
		expect(() => db.select().from(schema.series).all()).not.toThrow()
		expect(() => db.select().from(schema.seasons).all()).not.toThrow()
		expect(() => db.select().from(schema.episodes).all()).not.toThrow()
		expect(() => db.select().from(schema.files).all()).not.toThrow()
		expect(() => db.select().from(schema.releases).all()).not.toThrow()
		expect(() => db.select().from(schema.downloads).all()).not.toThrow()
		expect(() => db.select().from(schema.indexers).all()).not.toThrow()
		expect(() => db.select().from(schema.usenetServers).all()).not.toThrow()
	})

	it('starts with empty tables', () => {
		expect(db.select().from(schema.movies).all()).toHaveLength(0)
		expect(db.select().from(schema.series).all()).toHaveLength(0)
	})

	it('allows insert and select of movies', () => {
		db.insert(schema.movies)
			.values({
				tmdbId: 550,
				title: 'Fight Club',
				year: 1999,
				dateAdded: new Date().toISOString(),
			})
			.run()

		const movies = db.select().from(schema.movies).all()
		expect(movies).toHaveLength(1)
		expect(movies[0].title).toBe('Fight Club')
		expect(movies[0].tmdbId).toBe(550)
	})

	it('each call creates isolated db', () => {
		db.insert(schema.movies)
			.values({
				tmdbId: 1,
				title: 'First',
				year: 2020,
				dateAdded: new Date().toISOString(),
			})
			.run()

		const db2 = setupTestDb()
		expect(db2.select().from(schema.movies).all()).toHaveLength(0)
	})
})

describe('seedTestData', () => {
	it('inserts sample movie and series', async () => {
		const db = setupTestDb()
		await seedTestData(db)

		const movies = db.select().from(schema.movies).all()
		const seriesList = db.select().from(schema.series).all()

		expect(movies).toHaveLength(1)
		expect(movies[0].title).toBe('Inception')

		expect(seriesList).toHaveLength(1)
		expect(seriesList[0].title).toBe('Breaking Bad')
	})
})

describe('property-based db tests', () => {
	it('movie insert preserves data', () => {
		fc.assert(
			fc.property(fc.string({ minLength: 1, maxLength: 100 }), fc.integer({ min: 1900, max: 2030 }), (title, year) => {
				const db = setupTestDb()
				const result = db
					.insert(schema.movies)
					.values({
						tmdbId: 1,
						title,
						year,
						dateAdded: new Date().toISOString(),
					})
					.returning()
					.all()

				const movie = result[0]
				expect(movie.title).toBe(title)
				expect(movie.year).toBe(year)
			}),
		)
	})

	it('series insert preserves data', () => {
		fc.assert(
			fc.property(fc.string({ minLength: 1, maxLength: 100 }), fc.integer({ min: 1900, max: 2030 }), (title, year) => {
				const db = setupTestDb()
				const result = db
					.insert(schema.series)
					.values({
						tmdbId: 1,
						title,
						year,
						status: 'continuing',
						dateAdded: new Date().toISOString(),
					})
					.returning()
					.all()

				const series = result[0]
				expect(series.title).toBe(title)
				expect(series.year).toBe(year)
			}),
		)
	})
})
