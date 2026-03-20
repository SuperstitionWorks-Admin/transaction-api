const API_URL = 'http://localhost:3000/api/v1/categorize';
const TEST_API_KEY = 'test_key_12345';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let passCount = 0;
let failCount = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function test(name, testFn) {
  try {
    await testFn();
    passCount++;
    log(`✓ ${name}`, colors.green);
  } catch (error) {
    failCount++;
    log(`✗ ${name}`, colors.red);
    log(`  Error: ${error.message}`, colors.red);
  }
}

async function apiCall(options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  return { response, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  log('\n=== Transaction Categorization API Test Suite ===\n', colors.blue);

  log('Phase 1: Valid Requests', colors.yellow);

  await test('Valid request with common merchants', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: {
        transactions: [
          'WALMART SUPERCENTER 4821',
          'NETFLIX.COM',
          'STARBUCKS STORE #12345',
        ],
      },
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.results.length === 3, `Expected 3 results, got ${data.results.length}`);
    assert(data.meta.count === 3, `Expected count 3, got ${data.meta.count}`);

    const walmart = data.results[0];
    assert(walmart.merchant, 'Missing merchant field');
    assert(walmart.category, 'Missing category field');
    assert(walmart.confidence >= 0 && walmart.confidence <= 1, 'Invalid confidence score');
  });

  await test('Valid request with single transaction', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: {
        transactions: ['AMAZON.COM'],
      },
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.results.length === 1, `Expected 1 result, got ${data.results.length}`);
  });

  log('\nPhase 2: Missing/Invalid Body', colors.yellow);

  await test('Missing request body', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error === 'invalid_request', `Expected invalid_request, got ${data.error}`);
  });

  await test('Missing transactions field', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: {},
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error === 'invalid_request', `Expected invalid_request, got ${data.error}`);
  });

  await test('Transactions not an array', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: { transactions: 'not an array' },
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error === 'invalid_request', `Expected invalid_request, got ${data.error}`);
  });

  await test('Transactions array with non-string items', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: { transactions: [123, true, null] },
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error === 'invalid_request', `Expected invalid_request, got ${data.error}`);
  });

  log('\nPhase 3: Edge Cases', colors.yellow);

  await test('Empty transactions array', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: { transactions: [] },
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error === 'invalid_request', `Expected invalid_request, got ${data.error}`);
  });

  await test('Exactly 100 transactions', async () => {
    const transactions = Array(100).fill('WALMART');
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: { transactions },
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.results.length === 100, `Expected 100 results, got ${data.results.length}`);
  });

  await test('More than 100 transactions', async () => {
    const transactions = Array(101).fill('WALMART');
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: { transactions },
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(data.error === 'invalid_request', `Expected invalid_request, got ${data.error}`);
  });

  log('\nPhase 4: Authentication', colors.yellow);

  await test('Missing API key', async () => {
    const { response, data } = await apiCall({
      body: { transactions: ['WALMART'] },
    });

    assert(response.status === 401, `Expected 401, got ${response.status}`);
    assert(data.error === 'missing_api_key', `Expected missing_api_key, got ${data.error}`);
  });

  await test('Invalid API key', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': 'invalid_key_that_does_not_exist' },
      body: { transactions: ['WALMART'] },
    });

    assert(response.status === 403, `Expected 403, got ${response.status}`);
    assert(data.error === 'invalid_api_key', `Expected invalid_api_key, got ${data.error}`);
  });

  log('\nPhase 5: Merchant Recognition', colors.yellow);

  await test('Common merchants (Walmart, Netflix, Starbucks)', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: {
        transactions: [
          'WALMART SUPERCENTER #1234',
          'NETFLIX.COM',
          'STARBUCKS #56789',
        ],
      },
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.results[0].merchant.toLowerCase().includes('walmart'), 'Walmart not recognized');
    assert(data.results[1].merchant.toLowerCase().includes('netflix'), 'Netflix not recognized');
    assert(data.results[2].merchant.toLowerCase().includes('starbucks'), 'Starbucks not recognized');
  });

  await test('Unknown merchants', async () => {
    const { response, data } = await apiCall({
      headers: { 'x-api-key': TEST_API_KEY },
      body: {
        transactions: [
          'XYZUNKNOWNMERCHANT123',
          'RANDOM STORE NAME',
        ],
      },
    });

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.results.length === 2, `Expected 2 results, got ${data.results.length}`);
    assert(data.results[0].merchant, 'Missing merchant field for unknown merchant');
    assert(data.results[0].category, 'Missing category field for unknown merchant');
  });

  log('\n' + '='.repeat(50), colors.blue);
  log(`\nTests Passed: ${passCount}`, colors.green);
  log(`Tests Failed: ${failCount}`, failCount > 0 ? colors.red : colors.green);
  log(`Total: ${passCount + failCount}\n`, colors.blue);

  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch((error) => {
  log(`\nFatal error: ${error.message}`, colors.red);
  process.exit(1);
});
