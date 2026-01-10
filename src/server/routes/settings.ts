import { Hono } from 'hono'
import { testUsenetServer } from '../nzbget/nzbgetApi'
import { getSettings, updateSettings } from '../settings'

export const settingsRoutes = new Hono()
	// GET /api/settings - Get all settings
	.get('/', async (c) => {
		const settings = getSettings()
		return c.json(settings)
	})
	// PUT /api/settings - Update settings
	.put('/', async (c) => {
		const body = await c.req.json()
		const updated = updateSettings(body)
		return c.json(updated)
	})
	// POST /api/settings/test-usenet-server - Test Usenet server connection
	.post('/test-usenet-server', async (c) => {
		const server = await c.req.json()
		const result = await testUsenetServer(server)
		return c.json({ success: result.toLowerCase().includes('success'), message: result })
	})
