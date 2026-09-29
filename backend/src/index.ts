import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { validateEnv } from './lib/env';
import { sessionsRouter } from './routes/sessions';
import { chatRouter } from './routes/chat';
import { executeRouter } from './routes/execute';
import { healthRouter } from './routes/health';

// Validate required environment variables at startup
validateEnv();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ── Security headers ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. curl, Postman, Railway health checks)
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin === o || origin.startsWith(o))) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '64kb' }));

// ── Request logging (skip in test) ───────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Routes ────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/execute', executeRouter);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Do NOT log CORS errors with full stack — they leak origin lists
  if (err.message.startsWith('CORS:')) {
    res.status(403).json({ error: err.message });
    return;
  }
  console.error('[Unhandled error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start listening when not in test environment
// In tests, supertest creates its own server on a random port
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodeCompass backend running on port ${PORT} (${process.env.NODE_ENV})`);
  });
}

export default app;
