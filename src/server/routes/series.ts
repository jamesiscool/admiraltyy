import { Hono } from 'hono'
import { db, schema } from '../db'

export const seriesRoutes = new Hono()
	// GET /api/series - List all series
	.get('/', async (c) => {
		const allSeries = await db.select().from(schema.series)
		return c.json({ data: allSeries, success: true as const })
	})
	// GET /api/series/:id - Get a single series with seasons and episodes
	.get('/:id', async (c) => {
		const id = parseInt(c.req.param('id'), 10)
		if (Number.isNaN(id)) {
			return c.json({ success: false as const, error: 'Invalid series ID' }, 400)
		}
		const series = await db
			.select()
			.from(schema.series)
			.where((s) => s.id.equals(id))
		if (!series.length) {
			return c.json({ success: false as const, error: 'Series not found' }, 404)
		}
		return c.json({ data: series[0], success: true as const })
	})
	// POST /api/series - Create a new series
	.post('/', async (c) => {
		// TODO: Implement series creation
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// PUT /api/series/:id - Update a series
	.put('/:id', async (c) => {
		// TODO: Implement series update
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// DELETE /api/series/:id - Delete a series
	.delete('/:id', async (c) => {
		// TODO: Implement series deletion
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
