import { CategorizedTransaction } from './transaction';

export type ApiErrorCode =
  | 'invalid_json'
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'rate_limit_exceeded'
  | 'monthly_quota_exceeded'
  | 'invalid_request'
  | 'missing_field'
  | 'invalid_type'
  | 'empty_array'
  | 'array_too_large'
  | 'invalid_item_type'
  | 'empty_string'
  | 'string_too_long'
  | 'internal_server_error';

export interface CategorizeRequest {
  transactions: string[];
}

export interface CategorizeResponse {
  results: CategorizedTransaction[];
  meta: {
    count: number;
  };
}

export interface ApiError {
  error: ApiErrorCode;
  details?: string;
}
