import { CategorizeRequest, ApiErrorCode } from '@/types/api';

interface ValidationResult {
  valid: boolean;
  error?: ApiErrorCode;
  message?: string;
  data?: CategorizeRequest;
}

const MAX_TRANSACTIONS = 100;
const MAX_TRANSACTION_LENGTH = 200;

export function validateCategorizeRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'invalid_request',
      message: 'Request body must be a valid JSON object',
    };
  }

  const { transactions } = body as Record<string, unknown>;

  if (transactions === undefined || transactions === null) {
    return {
      valid: false,
      error: 'missing_field',
      message: 'transactions field is required',
    };
  }

  if (!Array.isArray(transactions)) {
    return {
      valid: false,
      error: 'invalid_type',
      message: 'transactions must be an array',
    };
  }

  if (transactions.length === 0) {
    return {
      valid: false,
      error: 'empty_array',
      message: 'transactions array cannot be empty',
    };
  }

  if (transactions.length > MAX_TRANSACTIONS) {
    return {
      valid: false,
      error: 'array_too_large',
      message: `transactions array cannot exceed ${MAX_TRANSACTIONS} items`,
    };
  }

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];

    if (typeof transaction !== 'string') {
      return {
        valid: false,
        error: 'invalid_item_type',
        message: `transaction at index ${i} must be a string`,
      };
    }

    if (transaction.trim().length === 0) {
      return {
        valid: false,
        error: 'empty_string',
        message: `transaction at index ${i} cannot be empty`,
      };
    }

    if (transaction.length > MAX_TRANSACTION_LENGTH) {
      return {
        valid: false,
        error: 'string_too_long',
        message: `transaction at index ${i} exceeds maximum length of ${MAX_TRANSACTION_LENGTH} characters`,
      };
    }
  }

  return {
    valid: true,
    data: { transactions: transactions as string[] },
  };
}
