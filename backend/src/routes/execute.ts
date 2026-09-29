import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import axios from 'axios';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../lib/rateLimiter';

export const executeRouter = Router();

executeRouter.use(requireAuth);

// ── Judge0 language IDs ───────────────────────────────────────
// These IDs are for Judge0 CE (Community Edition)
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: 71,      // Python 3.8
  javascript: 63,  // Node.js 12
  java: 62,        // Java 13
  cpp: 54,         // C++ 17
};

// ── Execution limits ──────────────────────────────────────────
const EXECUTION_LIMITS = {
  time: 10,          // seconds
  memory: 128000,    // KB (128 MB)
  maxCodeSize: 64000,
  maxStdinSize: 4096,
  maxOutputSize: 4096,
};

// ── POST /api/execute/:sessionId ──────────────────────────────
executeRouter.post(
  '/:sessionId',
  rateLimitMiddleware('execute'),
  param('sessionId').isUUID(),
  body('code')
    .isString()
    .isLength({ min: 1, max: EXECUTION_LIMITS.maxCodeSize })
    .withMessage(`Code must be 1-${EXECUTION_LIMITS.maxCodeSize} characters`),
  body('language')
    .isIn(Object.keys(JUDGE0_LANGUAGE_IDS))
    .withMessage('Unsupported language'),
  body('stdin')
    .optional()
    .isString()
    .isLength({ max: EXECUTION_LIMITS.maxStdinSize }),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // express-validator has confirmed this is a UUID string
    const sessionId = req.params['sessionId'] as string;

    // Ownership check
    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.userId !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { code, language, stdin = '' } = req.body as {
      code: string;
      language: string;
      stdin?: string;
    };

    const languageId = JUDGE0_LANGUAGE_IDS[language];
    const judge0Url = process.env.JUDGE0_API_URL!;
    const useRapidApi = process.env.JUDGE0_USE_RAPIDAPI === 'true';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (useRapidApi && process.env.JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = new URL(judge0Url).hostname;
    }

    try {
      // Submit code to Judge0 — NEVER execute student code on this server
      const submitRes = await axios.post(
        `${judge0Url}/submissions?base64_encoded=true&wait=true`,
        {
          source_code: Buffer.from(code).toString('base64'),
          language_id: languageId,
          stdin: Buffer.from(stdin).toString('base64'),
          cpu_time_limit: EXECUTION_LIMITS.time,
          memory_limit: EXECUTION_LIMITS.memory,
          // Request that Judge0 block network access (supported in self-hosted CE)
          enable_network: false,
        },
        {
          headers,
          timeout: 30000, // 30s HTTP timeout
        }
      );

      const result = submitRes.data;

      // Decode base64 outputs safely
      const decode = (b64: string | null | undefined): string => {
        if (!b64) return '';
        try {
          return Buffer.from(b64, 'base64').toString('utf-8').substring(0, EXECUTION_LIMITS.maxOutputSize);
        } catch {
          return '';
        }
      };

      const stdout = decode(result.stdout);
      const stderr = decode(result.stderr);
      const compileOutput = decode(result.compile_output);
      const statusDesc: string = result.status?.description || 'Unknown';
      const execTime: string = result.time ? `${result.time}s` : '';
      const execMemory: string = result.memory ? `${result.memory} KB` : '';

      // Persist execution result to codeState
      try {
        await prisma.codeState.upsert({
          where: { sessionId },
          update: {
            lastExecStatus: statusDesc,
            lastExecOutput: stdout || compileOutput,
            lastExecStderr: stderr,
            lastExecTime: execTime,
            lastExecMemory: execMemory,
            lastExecAt: new Date(),
          },
          create: {
            sessionId,
            code,
            language,
            lastExecStatus: statusDesc,
            lastExecOutput: stdout || compileOutput,
            lastExecStderr: stderr,
            lastExecTime: execTime,
            lastExecMemory: execMemory,
            lastExecAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.error('[Execute] DB persist error:', dbErr);
      }

      res.json({
        status: statusDesc,
        statusId: result.status?.id,
        stdout,
        stderr,
        compileOutput,
        time: execTime,
        memory: execMemory,
      });
    } catch (err: unknown) {
      const error = err as Error & { response?: { status?: number } };
      console.error('[Execute] Judge0 error:', error.message);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          res.status(504).json({ error: 'Code execution timed out' });
          return;
        }
        if (error.response?.status === 429) {
          res.status(429).json({ error: 'Execution rate limit exceeded' });
          return;
        }
        if (error.response?.status === 401) {
          res.status(502).json({ error: 'Judge0 authentication failed. Check JUDGE0_API_KEY.' });
          return;
        }
      }

      res.status(502).json({ error: 'Code execution service unavailable. Please try again.' });
    }
  }
);

// ── GET /api/execute/languages — available languages ──────────
executeRouter.get('/languages', (_req, res) => {
  res.json(
    Object.entries(JUDGE0_LANGUAGE_IDS).map(([lang, id]) => ({
      language: lang,
      judge0Id: id,
    }))
  );
});
