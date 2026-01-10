import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { fetchNzbgetStatus, fetchNzbgetVersion, listNzbgetQueue } from '../nzbget/nzbgetApi'

export const activityRoutes = new Hono()
	// GET /api/activity/nzbget/status - Get NZBGet status
	.get('/nzbget/status', async (c) => {
		try {
			const status = await fetchNzbgetStatus()
			return c.json(status)
		} catch (error) {
			throw new HTTPException(500, { message: String(error) })
		}
	})
	// GET /api/activity/nzbget/version - Get NZBGet version
	.get('/nzbget/version', async (c) => {
		try {
			const version = await fetchNzbgetVersion()
			return c.json(version)
		} catch (error) {
			throw new HTTPException(500, { message: String(error) })
		}
	})
	// GET /api/activity/nzbget/queue - Get NZBGet download queue
	.get('/nzbget/queue', async (c) => {
		try {
			const queue = await listNzbgetQueue()
			return c.json(queue)
		} catch (error) {
			throw new HTTPException(500, { message: String(error) })
		}
	})
