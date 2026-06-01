import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('❌ Unhandled Error:', err.message);
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}
