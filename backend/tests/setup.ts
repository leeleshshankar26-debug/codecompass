/**
 * Jest global setup file.
 * Sets NODE_ENV and dummy env vars before any test module is imported.
 * Real credentials are NOT needed — tests verify HTTP-level auth rejection
 * without connecting to Supabase, Prisma, or external services.
 */

// Must be set before src/index.ts is imported (which calls validateEnv)
process.env.NODE_ENV = 'test';

// Dummy values that pass the "key exists" check but won't connect to real services
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL = process.env.DIRECT_URL || 'postgresql://test:test@localhost:5432/test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret';
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'sk-or-test';
process.env.JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-test.example.com';
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://redis-test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'test-token';
