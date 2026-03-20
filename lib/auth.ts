import { getDb, ApiKey } from './db';
import { hashApiKey } from './hash';

export interface AuthResult {
  success: boolean;
  apiKey?: ApiKey;
  error?: string;
}

export async function authenticateApiKey(apiKey: string | null): Promise<AuthResult> {
  if (!apiKey) {
    return {
      success: false,
      error: 'missing_api_key',
    };
  }

  const keyHash = hashApiKey(apiKey);

  const { data, error } = await getDb()
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error) {
    console.error('Error authenticating API key:', error);
    return {
      success: false,
      error: 'invalid_api_key',
    };
  }

  if (!data) {
    return {
      success: false,
      error: 'invalid_api_key',
    };
  }

  const apiKeyData = data as ApiKey;

  if (!apiKeyData.is_active) {
    return {
      success: false,
      error: 'invalid_api_key',
    };
  }

  return {
    success: true,
    apiKey: apiKeyData,
  };
}