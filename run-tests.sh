#!/usr/bin/env bash
# run-tests.sh
#
# End-to-end test runner. Starts the dev server, waits until it is accepting
# connections, runs the test suite, then shuts everything down.
#
# Usage:
#   ./run-tests.sh
#
# Required env vars (already in your shell or .env.local):
#   NEXT_PUBLIC_SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY

set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────

API_PORT="${API_PORT:-3000}"
API_URL="http://localhost:${API_PORT}/api/v1/categorize"
SERVER_TIMEOUT=30   # seconds to wait for the dev server to start
DEV_PID=""

# ─── Cleanup ──────────────────────────────────────────────────────────────────

cleanup() {
  if [ -n "$DEV_PID" ] && kill -0 "$DEV_PID" 2>/dev/null; then
    echo ""
    echo "Stopping dev server (pid $DEV_PID)..."
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

# ─── Env check ────────────────────────────────────────────────────────────────

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "✗ SUPABASE_SERVICE_ROLE_KEY is not set."
  echo "  Export it or prefix the command:"
  echo "  SUPABASE_SERVICE_ROLE_KEY=your_key ./run-tests.sh"
  exit 1
fi

if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "✗ NEXT_PUBLIC_SUPABASE_URL is not set."
  echo "  It is usually in .env.local — source that file first or export it."
  exit 1
fi

# ─── Step 1: Set up fixtures ──────────────────────────────────────────────────

echo ""
echo "Step 1: Creating test fixtures..."
node setup-test-key.js
echo ""

# ─── Step 2: Start dev server ─────────────────────────────────────────────────

echo "Step 2: Starting dev server on port ${API_PORT}..."
npm run dev -- --port "${API_PORT}" > /tmp/nextjs-dev.log 2>&1 &
DEV_PID=$!

echo "  Waiting for server to be ready (up to ${SERVER_TIMEOUT}s)..."

elapsed=0
until curl -s -o /dev/null -w "%{http_code}" "${API_URL}" \
      --max-time 2 \
      -H "Content-Type: application/json" \
      -d '{}' 2>/dev/null | grep -qE '^[0-9]+'; do
  if [ "$elapsed" -ge "$SERVER_TIMEOUT" ]; then
    echo ""
    echo "✗ Dev server did not start within ${SERVER_TIMEOUT}s."
    echo "  Last log lines:"
    tail -20 /tmp/nextjs-dev.log
    exit 1
  fi
  sleep 1
  elapsed=$((elapsed + 1))
  printf "."
done
echo ""
echo "  ✓ Server is up (${elapsed}s)"
echo ""

# ─── Step 3: Run tests ────────────────────────────────────────────────────────

echo "Step 3: Running tests..."
echo ""

API_URL="${API_URL}" node test-api.js
TEST_EXIT=$?

# ─── Done ─────────────────────────────────────────────────────────────────────

exit "$TEST_EXIT"
