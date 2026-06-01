import { Router, Request, Response } from 'express';
import { isDbAvailable, getPool } from '../config/database';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const status: Record<string, unknown> = {
    status: 'ok',
    service: 'BillFlow API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: isDbAvailable() ? 'connected' : 'disconnected',
    environment: process.env.ENV || 'local',
  };

  // Deep check DB
  if (isDbAvailable()) {
    try {
      const pool = getPool();
      const start = Date.now();
      await pool!.query('SELECT 1');
      status.dbLatencyMs = Date.now() - start;
    } catch {
      status.database = 'error';
    }
  }

  const httpStatus = isDbAvailable() ? 200 : 207;
  res.status(httpStatus).json(status);
});

export default router;
