import { Hono } from 'hono'
import { db, schema } from '../db'
import { getSettings, updateSettings } from '../settings'

export const settingsRoutes = new Hono()
	// GET /api/settings - Get all settings
	.get('/', async (c) => {
		const settings = getSettings()
		return c.json({ data: settings, success: true as const })
	})
	// PUT /api/settings - Update settings
	.put('/', async (c) => {
		const body = await c.req.json()
		const updated = updateSettings(body)
		return c.json({ data: updated, success: true as const })
	})
	// GET /api/settings/indexers - Get all indexers
	.get('/indexers', async (c) => {
		const indexers = await db.select().from(schema.indexers)
		return c.json({ data: indexers, success: true as const })
	})
	// POST /api/settings/indexers - Add an indexer
	.post('/indexers', async (c) => {
		// TODO: Implement indexer creation
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// PUT /api/settings/indexers/:id - Update an indexer
	.put('/indexers/:id', async (c) => {
		// TODO: Implement indexer update
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// DELETE /api/settings/indexers/:id - Delete an indexer
	.delete('/indexers/:id', async (c) => {
		// TODO: Implement indexer deletion
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
	// GET /api/settings/usenet-servers - Get all usenet servers
	.get('/usenet-servers', async (c) => {
		const usenetServers = await db.select().from(schema.usenetServers)
		return c.json({ data: usenetServers, success: true as const })
	})
	// POST /api/settings/usenet-servers - Add a usenet server
	.post('/usenet-servers', async (c) => {
		// TODO: Implement usenet server creation
		return c.json({ success: false as const, error: 'Not implemented' }, 501)
	})
