import { Hono } from 'hono'
import { db, schema } from '../db'

export const settingsRoutes = new Hono()

// GET /api/settings - Get all settings
settingsRoutes.get('/', async (c) => {
	const settings = await db.select().from(schema.settings)
	const settingsMap = settings.reduce(
		(acc, s) => {
			acc[s.key] = JSON.parse(s.value)
			return acc
		},
		{} as Record<string, unknown>,
	)
	return c.json({ data: settingsMap, success: true })
})

// PUT /api/settings/:key - Update a setting
settingsRoutes.put('/:key', async (c) => {
	// TODO: Implement setting update
	return c.json({ success: false, error: 'Not implemented' }, 501)
})

// GET /api/settings/indexers - Get all indexers
settingsRoutes.get('/indexers', async (c) => {
	const indexers = await db.select().from(schema.indexers)
	return c.json({ data: indexers, success: true })
})

// POST /api/settings/indexers - Add an indexer
settingsRoutes.post('/indexers', async (c) => {
	// TODO: Implement indexer creation
	return c.json({ success: false, error: 'Not implemented' }, 501)
})

// PUT /api/settings/indexers/:id - Update an indexer
settingsRoutes.put('/indexers/:id', async (c) => {
	// TODO: Implement indexer update
	return c.json({ success: false, error: 'Not implemented' }, 501)
})

// DELETE /api/settings/indexers/:id - Delete an indexer
settingsRoutes.delete('/indexers/:id', async (c) => {
	// TODO: Implement indexer deletion
	return c.json({ success: false, error: 'Not implemented' }, 501)
})

// GET /api/settings/servers - Get all servers
settingsRoutes.get('/servers', async (c) => {
	const servers = await db.select().from(schema.servers)
	return c.json({ data: servers, success: true })
})

// POST /api/settings/servers - Add a server
settingsRoutes.post('/servers', async (c) => {
	// TODO: Implement server creation
	return c.json({ success: false, error: 'Not implemented' }, 501)
})
