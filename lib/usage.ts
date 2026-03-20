import { getDb } from './db';
import { CategorizedTransaction } from '@/types/transaction';

/**
 * Atomically increments the monthly usage counter for an API key and checks
 * whether the new total exceeds the key's limit — all inside a single DB
 * transaction, preventing the race condition where two concurrent requests
 * both pass a non-atomic read-check-write sequence.
 *
 * Replaces the previous separate getMonthlyUsage() + logApiUsage() pattern.
 *
 * Requires the SQL function below to be deployed to Supabase first —
 * see migration file: supabase/migrations/increment_usage_check_limit.sql
 */
export async function incrementAndCheckMonthlyUsage(
  apiKeyId: string,
  count: number,
  limit: number
): Promise<{ allowed: boolean; newTotal: number }> {
  const { data, error } = await getDb().rpc('increment_usage_check_limit', {
    p_api_key_id: apiKeyId,
    p_count: count,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to check/increment monthly usage: ${error.message}`);
  }

  const result = data as { allowed: boolean; new_total: number };
  return { allowed: result.allowed, newTotal: result.new_total };
}

/**
 * Logs individual categorization results for audit / analytics purposes.
 * Errors here are intentionally non-fatal — a failed categorization log
 * should not fail the user's API response.
 */
export async function logCategorizations(
  apiKeyId: string,
  results: CategorizedTransaction[]
): Promise<void> {
  const logs = results.map((result) => ({
    api_key_id: apiKeyId,
    original_text: result.original,
    normalized_text: result.normalized,
    merchant: result.merchant,
    category: result.category,
    confidence: result.confidence,
  }));

  const { error } = await getDb().from('categorization_logs').insert(logs);

  if (error) {
    console.error('Error logging categorizations (non-fatal):', error);
  }
}
