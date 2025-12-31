import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { activityRoutes } from './routes/activity'
import { moviesRoutes } from './routes/movies'
import { searchRoutes } from './routes/search'
import { seriesRoutes } from './routes/series'
import { settingsRoutes } from './routes/settings'
import { initSettings } from './settings'

// Initialize settings before anything else
initSettings()

const app = new Hono()
	.use('*', cors())
	// API routes
	.route('/api/movies', moviesRoutes)
	.route('/api/series', seriesRoutes)
	.route('/api/activity', activityRoutes)
	.route('/api/settings', settingsRoutes)
	.route('/api/search', searchRoutes)
	// Health check
	.get('/api/health', (c) => c.json({ status: 'ok' }))

// Export type for Hono RPC client
export type AppType = typeof app

const port = 2829
console.log(`🚀 Admiraltyy API running at http://localhost:${port}`)

export default {
	port,
	fetch: app.fetch,
}
