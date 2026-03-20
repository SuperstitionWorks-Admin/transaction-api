import { NextRequest, NextResponse } from 'next/server';
import { validateCategorizeRequest } from '@/lib/validate';
import { categorizeTransaction } from '@/lib/categorize';
import { authenticateApiKey } from '@/lib/auth';
import { incrementAndCheckMonthlyUsage, logCategorizations } from '@/lib/usage';
import { checkRateLimit } from '@/lib/ratelimit';
import { CategorizeResponse, ApiError } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ApiError>(
        { error: 'invalid_json', details: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const apiKeyHeader = request.headers.get('x-api-key');

    if (!apiKeyHeader) {
      return NextResponse.json<ApiError>(
        { error: 'missing_api_key' },
        { status: 401 }
      );
    }

    const authResult = await authenticateApiKey(apiKeyHeader);

    if (!authResult.success || !authResult.apiKey) {
      const status = authResult.error === 'missing_api_key' ? 401 : 403;
      const code = authResult.error === 'missing_api_key'
        ? 'missing_api_key'
        : 'invalid_api_key';
      return NextResponse.json<ApiError>({ error: code }, { status });
    }

    // Fully narrowed — apiKey is ApiKey, no non-null assertions needed below.
    const { apiKey } = authResult;

    const rateLimit = await checkRateLimit(apiKey.id);

    if (!rateLimit.allowed) {
      return NextResponse.json<ApiError>(
        { error: 'rate_limit_exceeded' },
        { status: 429 }
      );
    }

    const validation = validateCategorizeRequest(body);

    if (!validation.valid) {
      return NextResponse.json<ApiError>(
        {
          error: validation.error ?? 'invalid_request',
          details: validation.message,
        },
        { status: 400 }
      );
    }

    // validation.data is guaranteed by valid === true
    const { transactions } = validation.data!;

    // Atomic read-increment-check — replaces the previous racy two-step.
    const usageResult = await incrementAndCheckMonthlyUsage(
      apiKey.id,
      transactions.length,
      apiKey.monthly_limit
    );

    if (!usageResult.allowed) {
      return NextResponse.json<ApiError>(
        { error: 'monthly_quota_exceeded' },
        { status: 429 }
      );
    }

    const results = transactions.map((t) => categorizeTransaction(t));

    // Non-fatal — logged internally, does not affect the response.
    await logCategorizations(apiKey.id, results);

    const response: CategorizeResponse = {
      results,
      meta: { count: results.length },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error processing categorization request:', error);

    return NextResponse.json<ApiError>(
      {
        error: 'internal_server_error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
