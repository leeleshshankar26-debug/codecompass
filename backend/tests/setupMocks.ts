/**
 * Jest setupFilesAfterEnv entry — runs AFTER the test framework is installed.
 * jest.mock() is available here and hoisted correctly by Jest's Babel transform.
 *
 * These mocks prevent real network calls to Supabase, Prisma, and Redis
 * during tests, keeping the suite fast and hermetic.
 */

// ── Mock @supabase/supabase-js ────────────────────────────────
// getUser() instantly rejects invalid tokens (returns error, no HTTP call).
// To simulate an authenticated user in a test, use a token starting with 'valid-'.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(async (token: string) => {
        if (token && token.startsWith('valid-')) {
          return { data: { user: { id: 'test-user-id-123' } }, error: null };
        }
        return { data: { user: null }, error: { message: 'Invalid JWT' } };
      }),
    },
  })),
}));

// ── Mock Prisma client ────────────────────────────────────────
// Prevents real PostgreSQL connections.
// Individual tests can override these mocks with mockResolvedValueOnce etc.
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    learningSession: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
    },
    chatMessage: {
      findMany: jest.fn(async () => []),
      createMany: jest.fn(async () => ({ count: 0 })),
    },
    codeState: {
      upsert: jest.fn(async () => ({})),
    },
  },
}));
