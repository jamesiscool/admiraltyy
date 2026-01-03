import { Hono } from 'hono'
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
