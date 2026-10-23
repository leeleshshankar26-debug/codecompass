import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import axios from 'axios';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../lib/rateLimiter';

export const executeRouter = Router();

executeRouter.use(requireAuth);

// ── Judge0 language IDs ───────────────────────────────────────
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python:     71,  // Python 3.8
  javascript: 63,  // Node.js 12
  java:       62,  // Java 13
  cpp:        54,  // C++ 17
};

// ── Execution limits ──────────────────────────────────────────
const EXECUTION_LIMITS = {
  cpuTime:     5,      // seconds — reduced from 10
  memory:      128000, // KB (128 MB)
  maxCodeSize: 64000,
  maxStdinSize: 4096,
  maxOutputSize: 4096,
};

// ── Polling config ────────────────────────────────────────────
// Budget must stay well under Railway's 60 s platform HTTP timeout.
// Submit (≤10 s) + 20 polls × (poll latency + 1 s sleep) ≈ 30–40 s worst case.
const POLL_INTERVAL_MS  = 1000;  // 1 s between polls
const POLL_MAX_ATTEMPTS = 20;    // max 20 polls → ~20 s sleep budget
// Judge0 status IDs that mean "still running" — everything else is terminal
const PENDING_STATUS_IDS = new Set([1, 2]); // 1 = In Queue, 2 = Processing

// ── Helpers ───────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const decode = (b64: string | null | undefined, limit: number): string => {
  if (!b64) return '';
  try {
    return Buffer.from(b64, 'base64').toString('utf-8').substring(0, limit);
  } catch {
    return '';
  }
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
    const judge0Url  = process.env.JUDGE0_API_URL!;
    const useRapidApi = process.env.JUDGE0_USE_RAPIDAPI === 'true';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (useRapidApi && process.env.JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key']  = process.env.JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = new URL(judge0Url).hostname;
    }

    try {
      // ── Step 1: Submit (no wait=true — returns a token immediately) ──
      // Note: enable_network is a self-hosted-only flag; omit it for hosted instances
      // to avoid potential rejection.
      const submissionBody: Record<string, unknown> = {
        source_code:     Buffer.from(code).toString('base64'),
        language_id:     languageId,
        stdin:           Buffer.from(stdin).toString('base64'),
        cpu_time_limit:  EXECUTION_LIMITS.cpuTime,
        memory_limit:    EXECUTION_LIMITS.memory,
      };
      // Only send enable_network when using a self-hosted instance that supports it
      if (!useRapidApi && process.env.JUDGE0_DISABLE_NETWORK !== 'false') {
        submissionBody.enable_network = false;
      }

      console.log(`[Execute] Submitting to Judge0: ${judge0Url} language=${language} (id=${languageId}) rapidapi=${useRapidApi}`);

      const submitRes = await axios.post(
        `${judge0Url}/submissions?base64_encoded=true`,
        submissionBody,
        { headers, timeout: 10000 }, // 10s just for the submit call
      );

      console.log(`[Execute] Submit response status=${submitRes.status} token=${submitRes.data?.token ?? 'MISSING'}`);

      const token: string = submitRes.data?.token;
      if (!token) {
        console.error('[Execute] No token in submit response:', JSON.stringify(submitRes.data));
        res.status(502).json({ error: 'Judge0 did not return a submission token' });
        return;
      }

      // ── Step 2: Poll until done ───────────────────────────────
      // Sleep AFTER the poll (not before) so the first check fires immediately.
      let result: Record<string, unknown> | null = null;

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        const pollRes = await axios.get(
          `${judge0Url}/submissions/${token}?base64_encoded=true`,
          { headers, timeout: 8000 },
        );

        const data = pollRes.data as Record<string, unknown>;
        const statusId = (data.status as { id?: number } | undefined)?.id ?? 0;
        const statusDesc = (data.status as { description?: string } | undefined)?.description ?? 'unknown';
        console.log(`[Execute] Poll attempt=${attempt + 1} statusId=${statusId} status="${statusDesc}"`);

        if (!PENDING_STATUS_IDS.has(statusId)) {
          // Terminal status — return immediately, no extra sleep
          result = data;
          break;
        }

        // Still pending — wait before next attempt
        await sleep(POLL_INTERVAL_MS);
      }

      // Still pending after max attempts → our polling budget exhausted
      if (!result) {
        res.status(504).json({ error: 'Execution is taking longer than expected. The Judge0 queue may be busy — please try again in a moment.' });
        return;
      }

      // ── Step 3: Parse and respond ─────────────────────────────
      const lim = EXECUTION_LIMITS.maxOutputSize;
      const stdout        = decode(result.stdout as string,         lim);
      const stderr        = decode(result.stderr as string,         lim);
      const compileOutput = decode(result.compile_output as string, lim);
      const statusDesc    = (result.status as { description?: string } | undefined)?.description ?? 'Unknown';
      const statusId      = (result.status as { id?: number } | undefined)?.id ?? 0;
      const execTime      = result.time   ? `${result.time}s`   : '';
      const execMemory    = result.memory ? `${result.memory} KB` : '';

      // Persist to codeState (non-blocking — don't await in the hot path)
      prisma.codeState.upsert({
        where:  { sessionId },
        update: {
          lastExecStatus: statusDesc,
          lastExecOutput: stdout || compileOutput,
          lastExecStderr: stderr,
          lastExecTime:   execTime,
          lastExecMemory: execMemory,
          lastExecAt:     new Date(),
        },
        create: {
          sessionId,
          code,
          language,
          lastExecStatus: statusDesc,
          lastExecOutput: stdout || compileOutput,
          lastExecStderr: stderr,
          lastExecTime:   execTime,
          lastExecMemory: execMemory,
          lastExecAt:     new Date(),
        },
      }).catch(dbErr => console.error('[Execute] DB persist error:', dbErr));

      res.json({
        status:        statusDesc,
        statusId,
        stdout,
        stderr,
        compileOutput,
        time:          execTime,
        memory:        execMemory,
      });

    } catch (err: unknown) {
      const error = err as Error & { response?: { status?: number; data?: unknown }; code?: string };
      console.error(`[Execute] Judge0 error: code=${error.code} message=${error.message} httpStatus=${error.response?.status ?? 'none'} body=${JSON.stringify(error.response?.data ?? null)}`);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          res.status(504).json({ error: 'Could not reach the code execution service. Please try again.' });
          return;
        }
        if (error.response?.status === 429) {
          res.status(429).json({ error: 'Execution rate limit exceeded. Please wait a moment.' });
          return;
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          res.status(502).json({ error: 'Judge0 authentication failed. Check JUDGE0_API_KEY and JUDGE0_API_URL in your environment variables.' });
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
