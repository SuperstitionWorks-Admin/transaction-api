# API Testing Guide

This document explains how to test the Transaction Categorization API.

## Prerequisites

- Node.js installed
- Dev server running (`npm run dev`)
- Valid Supabase service role key

## Test Coverage

The test suite covers all required scenarios:

### Phase 1: Valid Requests
- Valid request with common merchants
- Single transaction request

### Phase 2: Missing/Invalid Body
- Missing request body
- Missing transactions field
- Transactions not an array
- Transactions array with non-string items

### Phase 3: Edge Cases
- Empty transactions array
- Exactly 100 transactions
- More than 100 transactions

### Phase 4: Authentication
- Missing API key
- Invalid API key

### Phase 5: Merchant Recognition
- Common merchants (Walmart, Netflix, Starbucks)
- Unknown merchants

## Running Tests

### Option 1: Manual Setup

1. Create test API key:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_key node setup-test-key.js
```

2. Start dev server:
```bash
npm run dev
```

3. In another terminal, run tests:
```bash
node test-api.js
```

### Option 2: Automated Script

```bash
chmod +x run-tests.sh
SUPABASE_SERVICE_ROLE_KEY=your_key ./run-tests.sh
```

## Test API Key

The test suite uses:
- **API Key**: `test_key_12345`
- **Name**: Test API Key
- **Monthly Limit**: 10,000 requests

This key is automatically created by `setup-test-key.js`.

## Expected Results

All tests should pass:
- ✓ Valid request with common merchants
- ✓ Valid request with single transaction
- ✓ Missing request body
- ✓ Missing transactions field
- ✓ Transactions not an array
- ✓ Transactions array with non-string items
- ✓ Empty transactions array
- ✓ Exactly 100 transactions
- ✓ More than 100 transactions
- ✓ Missing API key
- ✓ Invalid API key
- ✓ Common merchants (Walmart, Netflix, Starbucks)
- ✓ Unknown merchants

## Troubleshooting

### "Missing Supabase environment variables"
Ensure `SUPABASE_SERVICE_ROLE_KEY` is set when running setup-test-key.js

### "fetch failed"
Ensure the dev server is running on http://localhost:3000

### "invalid_api_key" for all tests
Run `setup-test-key.js` again to create the test API key in the database
