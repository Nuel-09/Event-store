import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { appendEvent, readEvent, getStats } from './store.js';

const router = Router();

/**
 * POST /events
 * Accepts any JSON body, stamps { id, createdAt }, appends to log, returns 201.
 */
router.post('/events', async (req, res) => {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const event = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...body,
  };

  const saved = await appendEvent(event);
  return res.status(201).json(saved);
});

/**
 * GET /events/:id
 * Looks up the index, reads exactly length bytes at offset. 404 if not found.
 */
router.get('/events/:id', async (req, res) => {
  const event = await readEvent(req.params.id);

  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  return res.status(200).json(event);
});

/**
 * GET /stats
 * Returns { total, bytes } from the current log state.
 */
router.get('/stats', async (_req, res) => {
  const stats = await getStats();
  return res.status(200).json(stats);
});

export default router;
