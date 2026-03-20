#!/bin/bash

echo "=== Setting up Test Environment ==="
echo ""

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required"
  echo "Usage: SUPABASE_SERVICE_ROLE_KEY=your_key ./run-tests.sh"
  exit 1
fi

echo "Step 1: Creating test API key..."
node setup-test-key.js

if [ $? -ne 0 ]; then
  echo "Failed to create test API key"
  exit 1
fi

echo ""
echo "Step 2: Starting dev server in background..."
npm run dev > /dev/null 2>&1 &
DEV_PID=$!

echo "Waiting for server to start..."
sleep 5

echo ""
echo "Step 3: Running API tests..."
node test-api.js
TEST_EXIT=$?

echo ""
echo "Step 4: Cleaning up..."
kill $DEV_PID 2>/dev/null

exit $TEST_EXIT
