# API Testing Guide

Integration tests for the Transaction Categorization API.
Tests run against a live dev server and a real Supabase database.

---

## How it works

| File | Purpose |
|---|---|
| `setup-test-key.js` | Creates three fixture keys in the DB and writes their values to `.env.test` |
| `test-api.js` | Reads `.env.test`, hits the live API, asserts responses |
| `run-tests.sh` | Orchestrates both steps: starts the dev server, waits until it is ready, runs tests, shuts down |
| `.env.test` | Auto-generated — **never commit this file** |

Keys are **generated fresh** each run using `crypto.randomBytes`, so no placeholder keys
(`test_key_12345`) ever appear in source code. Each fixture key is a proper `txcat_test_…`
key that goes through the same auth path as a real key.

---

## Prerequisites

- Node.js 18+
- `@supabase/supabase-js` installed (`npm install`)
- Dev server dependencies installed (`npm install`)
- A Supabase project with the schema and the `increment_usage_check_limit` SQL
  function deployed (see `increment_usage_check_limit.sql`)

---

## Quick start

```bash
# 1. Export required env vars (or add them to .env.local and source it)
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 2. Run everything in one step
chmod +x run-tests.sh
./run-tests.sh
```

---

## Step-by-step (if you prefer manual control)

```bash
# Terminal 1 — start the dev server
npm run dev

# Terminal 2 — create fixtures, then run tests
node setup-test-key.js
node test-api.js
```

You only need to run `setup-test-key.js` once per environment, or after
wiping the `api_keys` table.

---

## What gets created in the database

`setup-test-key.js` upserts three rows into `api_keys`:

| Name | Active | Monthly limit | Used by |
|---|---|---|---|
| `[TEST] Active key` | yes | 10 000 | Most tests |
| `[TEST] Inactive key` | **no** | 10 000 | Inactive key rejection test |
| `[TEST] Exhausted quota key` | yes | **0** | Monthly quota exceeded test |

All three rows are upserted (not inserted), so re-running the script is safe.

---

## Test coverage

### Phase 1 — Valid requests
- Single transaction, response shape
- Multiple transactions, count matches
- All fields present on every result (`original`, `normalized`, `merchant`, `category`, `confidence`)
- Exactly 100 transactions (upper boundary)
- Duplicate transactions all returned

### Phase 2 — Input validation
- Missing body → `invalid_json`
- Malformed JSON (truncated) → `invalid_json`
- Malformed JSON (bare non-JSON string) → `invalid_json`
- Valid JSON but not an object → `invalid_request`
- Missing `transactions` field → `missing_field`
- `transactions` is a string → `invalid_type`
- `transactions` is a number → `invalid_type`
- Empty array → `empty_array`
- 101 items → `array_too_large`
- Non-string item in array → `invalid_item_type`
- `null` item in array → `invalid_item_type`
- Whitespace-only string → `empty_string`
- Mixed valid + whitespace-only → `empty_string`
- String of 201 chars → `string_too_long`
- String of exactly 200 chars → accepted (200 OK)

### Phase 3 — Authentication
- Missing `x-api-key` header → `401 missing_api_key`
- Unknown key → `403 invalid_api_key`
- Inactive key → `403 invalid_api_key`
- Empty string key → `401` or `403`

### Phase 4 — Quota and limits
- Monthly quota exhausted key → `429 monthly_quota_exceeded`

### Phase 5 — Merchant recognition
- Exact-match merchants: Walmart → `groceries`, Netflix → `entertainment`, Starbucks → `food`
- Processor prefixes stripped: `PAYPAL *NETFLIX` → Netflix
- Exact-match guard: `"SHELL SHOCKED RECORDS"` does **not** match Shell
- Exact-match guard: `"AMAZONIAN IMPORTS"` does **not** match Amazon
- Partial-match merchants: Chipotle → `food`, Walgreens → `health`
- Keyword fallback: coffee roaster → `food`, pharmacy → `health`
- Mixed known and unknown in one batch
- Unknown merchant falls back with valid shape and non-empty fields
- Confidence ordering: exact match > uncategorized

---

## Error codes reference

| Code | HTTP | When |
|---|---|---|
| `invalid_json` | 400 | Body is absent or not parseable JSON |
| `invalid_request` | 400 | Body is valid JSON but not an object |
| `missing_field` | 400 | `transactions` field absent |
| `invalid_type` | 400 | `transactions` is not an array |
| `empty_array` | 400 | `transactions` is `[]` |
| `array_too_large` | 400 | More than 100 items |
| `invalid_item_type` | 400 | Item is not a string |
| `empty_string` | 400 | Item is blank or whitespace only |
| `string_too_long` | 400 | Item exceeds 200 characters |
| `missing_api_key` | 401 | `x-api-key` header absent |
| `invalid_api_key` | 403 | Key unknown or inactive |
| `rate_limit_exceeded` | 429 | Too many requests per minute |
| `monthly_quota_exceeded` | 429 | Monthly transaction limit reached |
| `internal_server_error` | 500 | Unhandled server error |

---

## Troubleshooting

**`✗ .env.test not found`**
Run `node setup-test-key.js` first.

**`invalid_api_key` for all tests after re-running setup**
`setup-test-key.js` upserts on `key_hash`, but it generates a new random key each
time — meaning a new hash, a new row. The old `.env.test` is overwritten with the
new keys. If `test-api.js` still holds the old values, just run setup again and
restart the test runner.

**`fetch failed` / `ECONNREFUSED`**
The dev server is not running. Start it with `npm run dev`.

**Server did not start within 30s**
Check `/tmp/nextjs-dev.log` for startup errors. Common cause: port already in use.
Override with `API_PORT=3001 ./run-tests.sh`.

**Quota test fails with `rate_limit_exceeded` instead of `monthly_quota_exceeded`**
The per-minute in-memory rate limiter fired first. Wait 60 seconds and retry, or
lower the per-minute limit for the exhausted key row in the database temporarily.
