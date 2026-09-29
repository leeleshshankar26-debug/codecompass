import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const sessionsRouter = Router();

// All session routes require authentication
sessionsRouter.use(requireAuth);

// ── GET /api/sessions — list the calling user's sessions ──────
sessionsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.learningSession.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    res.json(sessions);
  } catch (err) {
    console.error('[Sessions] list error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// ── POST /api/sessions — create a new session ─────────────────
sessionsRouter.post(
  '/',
  body('language')
    .optional()
    .isIn(['python', 'javascript', 'java', 'cpp'])
    .withMessage('Invalid language'),
  body('title').optional().isString().trim().isLength({ max: 120 }),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { language = 'python', title = 'New Session' } = req.body as {
      language?: string;
      title?: string;
    };

    try {
      const session = await prisma.learningSession.create({
        data: {
          userId: req.userId,
          language,
          title,
          codeState: {
            create: {
              language,
              code: STARTER_CODE[language] ?? '',
            },
          },
        },
        include: { codeState: true },
      });
      res.status(201).json(session);
    } catch (err) {
      console.error('[Sessions] create error:', err);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }
);

// ── GET /api/sessions/:id — get a single session ─────────────
sessionsRouter.get(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // express-validator has confirmed this is a UUID string
    const id = req.params['id'] as string;

    try {
      const session = await prisma.learningSession.findUnique({
        where: { id },
        include: {
          messages: { orderBy: { createdAt: 'asc' }, take: 200 },
          codeState: true,
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Ownership check — NEVER skip this
      if (session.userId !== req.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(session);
    } catch (err) {
      console.error('[Sessions] get error:', err);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  }
);

// ── PATCH /api/sessions/:id — update title or language ────────
sessionsRouter.patch(
  '/:id',
  param('id').isUUID(),
  body('title').optional().isString().trim().isLength({ max: 120 }),
  body('language').optional().isIn(['python', 'javascript', 'java', 'cpp']),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const id = req.params['id'] as string;

    try {
      const existing = await prisma.learningSession.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!existing) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      if (existing.userId !== req.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { title, language } = req.body as { title?: string; language?: string };
      const update: Record<string, unknown> = {};
      if (title !== undefined) update.title = title;
      if (language !== undefined) update.language = language;

      const updated = await prisma.learningSession.update({
        where: { id },
        data: update,
      });
      res.json(updated);
    } catch (err) {
      console.error('[Sessions] update error:', err);
      res.status(500).json({ error: 'Failed to update session' });
    }
  }
);

// ── PATCH /api/sessions/:id/code — autosave code ─────────────
sessionsRouter.patch(
  '/:id/code',
  param('id').isUUID(),
  body('code').isString().isLength({ max: 64000 }).withMessage('Code too large (max 64 KB)'),
  body('stdin').optional().isString().isLength({ max: 4096 }),
  body('language').optional().isIn(['python', 'javascript', 'java', 'cpp']),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const id = req.params['id'] as string;

    try {
      const existing = await prisma.learningSession.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!existing) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      if (existing.userId !== req.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { code, stdin, language } = req.body as {
        code: string;
        stdin?: string;
        language?: string;
      };

      const updatedCode = await prisma.codeState.upsert({
        where: { sessionId: id },
        update: {
          code,
          ...(stdin !== undefined && { stdin }),
          ...(language && { language }),
        },
        create: {
          sessionId: id,
          code,
          stdin: stdin ?? '',
          language: language ?? 'python',
        },
      });

      res.json(updatedCode);
    } catch (err) {
      console.error('[Sessions] code update error:', err);
      res.status(500).json({ error: 'Failed to save code' });
    }
  }
);

// ── DELETE /api/sessions/:id ──────────────────────────────────
sessionsRouter.delete(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const id = req.params['id'] as string;

    try {
      const existing = await prisma.learningSession.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!existing) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      if (existing.userId !== req.userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await prisma.learningSession.delete({ where: { id } });
      res.json({ message: 'Session deleted' });
    } catch (err) {
      console.error('[Sessions] delete error:', err);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  }
);

// ── Starter code per language ─────────────────────────────────
const STARTER_CODE: Record<string, string> = {
  python: `# Welcome to CodeCompass!\n# Start writing your Python code here.\n\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n`,
  javascript: `// Welcome to CodeCompass!\n// Start writing your JavaScript code here.\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("World"));\n`,
  java: `// Welcome to CodeCompass!\n// Start writing your Java code here.\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(greet("World"));\n    }\n\n    static String greet(String name) {\n        return "Hello, " + name + "!";\n    }\n}\n`,
  cpp: `// Welcome to CodeCompass!\n// Start writing your C++ code here.\n\n#include <iostream>\n#include <string>\nusing namespace std;\n\nstring greet(string name) {\n    return "Hello, " + name + "!";\n}\n\nint main() {\n    cout << greet("World") << endl;\n    return 0;\n}\n`,
};
