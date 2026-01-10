import { desc } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db, schema } from '../db'
import { fetchNzbgetStatus, fetchNzbgetVersion, listNzbgetHistory, listNzbgetQueue } from '../nzbget/nzbgetApi'
import { syncNzbgetHistory } from '../nzbget/nzbgetSync'

export const activityRoutes = new Hono()
	// GET /api/activity/downloads - Get tracked downloads from database
	.get('/downloads', async (c) => {
		try {
			const downloads = await db.select().from(schema.downloads).orderBy(desc(schema.downloads.queuedAt)).limit(100)
			return c.json(downloads)
		} catch (error) {
			throw new HTTPException(500, { message: String(error) })
		}
	})
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
	// GET /api/activity/nzbget/history - Get NZBGet history
	.get('/nzbget/history', async (c) => {
		try {
			const showHidden = c.req.query('showHidden') === 'true'
			const history = await listNzbgetHistory(showHidden)
			return c.json(history)
		} catch (error) {
			throw new HTTPException(500, { message: String(error) })
		}
	})
	// POST /api/activity/nzbget/sync - Sync NZBGet history to database (called by post-processing script)
	.post('/nzbget/sync', async (c) => {
		try {
			const result = await syncNzbgetHistory()
			console.log(`[NZBGet Sync] Hook triggered: synced=${result.synced}, orphans=${result.orphans}, cleared=${result.cleared}`)
			return c.json(result)
		} catch (error) {
			throw new HTTPException(500, { message: String(error) })
		}
	})
