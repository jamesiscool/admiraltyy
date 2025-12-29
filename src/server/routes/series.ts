import { Hono } from 'hono';
import { db, schema } from '../db';

export const seriesRoutes = new Hono();

// GET /api/series - List all series
seriesRoutes.get('/', async (c) => {
  const allSeries = await db.select().from(schema.series);
  return c.json({ data: allSeries, success: true });
});

// GET /api/series/:id - Get a single series with seasons and episodes
seriesRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const series = await db.select().from(schema.series).where((s) => s.id.equals(id));
  if (!series.length) {
    return c.json({ success: false, error: 'Series not found' }, 404);
  }
  return c.json({ data: series[0], success: true });
});

// POST /api/series - Create a new series
seriesRoutes.post('/', async (c) => {
  // TODO: Implement series creation
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

// PUT /api/series/:id - Update a series
seriesRoutes.put('/:id', async (c) => {
  // TODO: Implement series update
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

// DELETE /api/series/:id - Delete a series
seriesRoutes.delete('/:id', async (c) => {
  // TODO: Implement series deletion
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

