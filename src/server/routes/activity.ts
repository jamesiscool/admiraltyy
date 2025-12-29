import { Hono } from 'hono';
import { db, schema } from '../db';

export const activityRoutes = new Hono();

// GET /api/activity/queue - Get download queue
activityRoutes.get('/queue', async (c) => {
  const downloads = await db.select().from(schema.downloads);
  return c.json({ data: downloads, success: true });
});

// GET /api/activity/history - Get download history
activityRoutes.get('/history', async (c) => {
  const downloads = await db.select().from(schema.downloads);
  return c.json({ data: downloads, success: true });
});

// POST /api/activity/queue/:id/pause - Pause a download
activityRoutes.post('/queue/:id/pause', async (c) => {
  // TODO: Implement download pause
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

// POST /api/activity/queue/:id/resume - Resume a download
activityRoutes.post('/queue/:id/resume', async (c) => {
  // TODO: Implement download resume
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

// DELETE /api/activity/queue/:id - Cancel a download
activityRoutes.delete('/queue/:id', async (c) => {
  // TODO: Implement download cancellation
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

