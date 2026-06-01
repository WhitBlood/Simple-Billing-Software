import { isDbAvailable } from '../config/database';
import { Request, Response, NextFunction } from 'express';

export function requireDb(_req: Request, res: Response, next: NextFunction) {
  if (!isDbAvailable()) {
    return res.status(503).json({
      error: 'Database is not available. Server is running in limited mode.',
    });
  }
  next();
}
