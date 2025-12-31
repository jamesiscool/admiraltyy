import { Hono } from 'hono'
import { db, schema } from '../db'

export const activityRoutes = new Hono()
	// GET /api/activity/queue - Get download queue
	.get('/queue', async (c) => {
		const downloads = await db.select().from(schema.downloads)
		return c.json({ data: downloads, success: true as const })
	})
	// GET /api/activity/history - Get download history
	.get('/history', async (c) => {
		const downloads = await db.select().from(schema.downloads)
		return c.json({ data: downloads, success: true as const })
	})
	// POST /api/activity/queue/:id/pause - Pause a download
	.post('/queue/:id/pause', async (c) => {
		// TODO: Implement download pause
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// POST /api/activity/queue/:id/resume - Resume a download
	.post('/queue/:id/resume', async (c) => {
		// TODO: Implement download resume
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// DELETE /api/activity/queue/:id - Cancel a download
	.delete('/queue/:id', async (c) => {
		// TODO: Implement download cancellation
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
