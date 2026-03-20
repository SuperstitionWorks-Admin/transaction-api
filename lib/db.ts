import { createClient } from '@supabase/supabase-js';

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

/**
 * Returns a lazily-initialised Supabase admin client.
 * Call this at use-time (inside functions) rather than at module load so that
 * missing env vars produce a clear error at the callsite instead of crashing
 * the entire module graph on import.
 */
export function getDb(): ReturnType<typeof createClient> {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseServiceKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY in production');
    }
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set — using placeholder client (dev only)');
    supabaseAdminInstance = createClient(supabaseUrl, 'placeholder', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return supabaseAdminInstance;
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAdminInstance;
}

export interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  is_active: boolean;
  monthly_limit: number;
  created_at: string;
}

export interface ApiUsage {
  id: string;
  api_key_id: string;
  endpoint: string;
  request_count: number;
  created_at: string;
}

export interface CategorizationLog {
  id: string;
  api_key_id: string;
  original_text: string;
  normalized_text: string;
  merchant: string;
  category: string;
  confidence: number;
  created_at: string;
}
