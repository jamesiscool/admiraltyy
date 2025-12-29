import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { moviesRoutes } from './routes/movies';
import { seriesRoutes } from './routes/series';
import { activityRoutes } from './routes/activity';
import { settingsRoutes } from './routes/settings';
import { searchRoutes } from './routes/search';

const app = new Hono();

// Middleware
app.use('*', cors());

// API routes
app.route('/api/movies', moviesRoutes);
app.route('/api/series', seriesRoutes);
app.route('/api/activity', activityRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/search', searchRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Root route
app.get('/', (c) => c.json({ message: 'Admiraltyy API', version: '1.0.0' }));

const port = 3000;
console.log(`🚀 Admiraltyy API running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

