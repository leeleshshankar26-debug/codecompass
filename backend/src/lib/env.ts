/**
 * Validates required environment variables at startup.
 * Throws a clear error rather than silently using undefined values.
 * In test environments, provide dummy values via tests/setup.ts.
 */

const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'JUDGE0_API_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n` +
      `Copy backend/.env.example to backend/.env and fill in each value.`
    );
  }
}

export function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Environment variable ${key} is not set`);
  return val;
}
