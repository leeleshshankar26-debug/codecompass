import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazy singleton Supabase service-role client.
 * Call getSupabaseAdmin() to get the instance.
 * Only initialised on first use so tests can import without real credentials.
 */
let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the Supabase admin client.'
    );
  }

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}
