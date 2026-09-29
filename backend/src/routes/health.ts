import { Router } from 'express';
import prisma from '../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});
