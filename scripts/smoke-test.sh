#!/usr/bin/env bash
# CipherLink E2E Smoke Test
# Run after: make up (or docker compose up -d)
# Usage: ./scripts/smoke-test.sh [API_URL]
# Example: API_URL=https://cipherlink-backend.onrender.com ./scripts/smoke-test.sh

set -euo pipefail

API="${1:-${API_URL:-http://localhost:3000}}/api"
PASS=0; FAIL=0

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'; BOLD='\033[1m'

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✅${NC} $name"; PASS=$((PASS+1))
  else
    echo -e "  ${RED}❌${NC} $name ${RED}(expected '$expected', got '$actual')${NC}"; FAIL=$((FAIL+1))
  fi
}

json_val() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null || echo ""; }

echo ""
echo -e "${BOLD}🔍 CipherLink Smoke Tests → $API${NC}"
echo ""

# ── Health ──────────────────────────────────────────────────────────────────
echo "── Health ──"
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$API/../health" || echo "000")
check "GET /health → 200" "200" "$STATUS"

# ── Auth ─────────────────────────────────────────────────────────────────────
echo ""
echo "── Auth ──"
TS=$(date +%s)
ALICE_EMAIL="alice_smoke_${TS}@test.local"
BOB_EMAIL="bob_smoke_${TS}@test.local"

R1=$(curl -sf -X POST "$API/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ALICE_EMAIL\",\"password\":\"Alice@12345\",\"displayName\":\"Alice\"}" 2>/dev/null || echo '{}')
check "Register Alice → success" "true" "$(echo "$R1" | json_val "str(d.get('success',False)).lower()")"

R2=$(curl -sf -X POST "$API/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$BOB_EMAIL\",\"password\":\"Bob@12345\",\"displayName\":\"Bob\"}" 2>/dev/null || echo '{}')
BOB_ID=$(echo "$R2" | json_val "d.get('data',{}).get('user',{}).get('id','')" 2>/dev/null || echo "")
check "Register Bob → success" "true" "$(echo "$R2" | json_val "str(d.get('success',False)).lower()")"

L1=$(curl -sf -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ALICE_EMAIL\",\"password\":\"Alice@12345\"}" 2>/dev/null || echo '{}')
TOKEN=$(echo "$L1" | json_val "d.get('data',{}).get('tokens',{}).get('accessToken','')" 2>/dev/null || echo "")
REFRESH=$(echo "$L1" | json_val "d.get('data',{}).get('tokens',{}).get('refreshToken','')" 2>/dev/null || echo "")
check "Login Alice → access token received" "1" "$([ -n "$TOKEN" ] && echo 1 || echo 0)"

if [ -z "$TOKEN" ]; then echo -e "\n${RED}No token — cannot continue${NC}"; exit 1; fi

STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$API/auth/me" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
check "GET /auth/me → 200" "200" "$STATUS"

STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$API/auth/me" 2>/dev/null || echo "000")
check "GET /auth/me without token → 401" "401" "$STATUS"

if [ -n "$REFRESH" ]; then
  REFRESH_RES=$(curl -sf -X POST "$API/auth/refresh" -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH\"}" 2>/dev/null || echo '{}')
  NEW_TOKEN=$(echo "$REFRESH_RES" | json_val "d.get('data',{}).get('accessToken','')" 2>/dev/null || echo "")
  NEW_REFRESH=$(echo "$REFRESH_RES" | json_val "d.get('data',{}).get('refreshToken','')" 2>/dev/null || echo "")
  check "POST /auth/refresh → new access token" "1" "$([ -n "$NEW_TOKEN" ] && echo 1 || echo 0)"
  check "Refresh token rotated (new token != old)" "1" "$([ "$NEW_REFRESH" != "$REFRESH" ] && echo 1 || echo 0)"
  TOKEN="$NEW_TOKEN"
fi

# ── Public Keys (ECDH) ──────────────────────────────────────────────────────
echo ""
echo "── Public Keys ──"
FAKE_KEY="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEsmokeFakeECDHPublicKey1234567890=="
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$API/users/public-key" \
  -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"publicKey\":\"$FAKE_KEY\"}" 2>/dev/null || echo "000")
check "POST /users/public-key → 200" "200" "$STATUS"

if [ -n "$BOB_ID" ]; then
  BOB_L=$(curl -sf -X POST "$API/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$BOB_EMAIL\",\"password\":\"Bob@12345\"}" 2>/dev/null || echo '{}')
  BOB_TOKEN=$(echo "$BOB_L" | json_val "d.get('data',{}).get('tokens',{}).get('accessToken','')" 2>/dev/null || echo "")
  if [ -n "$BOB_TOKEN" ]; then
    curl -sf -X POST "$API/users/public-key" -H "Authorization: Bearer $BOB_TOKEN" \
      -H "Content-Type: application/json" -d "{\"publicKey\":\"$FAKE_KEY\"}" > /dev/null 2>&1 || true
  fi
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$API/users/$BOB_ID/public-key" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
  check "GET /users/:id/public-key → 200" "200" "$STATUS"
fi

# ── Rooms ────────────────────────────────────────────────────────────────────
echo ""
echo "── Rooms ──"
CREATE_ROOM=$(curl -sf -X POST "$API/rooms" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"smoke-test-room"}' 2>/dev/null || echo '{}')
ROOM_ID=$(echo "$CREATE_ROOM" | json_val "d.get('data',{}).get('id','')" 2>/dev/null || echo "")
check "POST /rooms → room created" "1" "$([ -n "$ROOM_ID" ] && echo 1 || echo 0)"

STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$API/rooms" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
check "GET /rooms → 200" "200" "$STATUS"

if [ -n "$BOB_ID" ]; then
  DM_RES=$(curl -sf -X POST "$API/rooms/dm" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"targetUserId\":\"$BOB_ID\"}" 2>/dev/null || echo '{}')
  DM_ID=$(echo "$DM_RES" | json_val "d.get('data',{}).get('id','')" 2>/dev/null || echo "")
  check "POST /rooms/dm → DM room created" "1" "$([ -n "$DM_ID" ] && echo 1 || echo 0)"
  DM_RES2=$(curl -sf -X POST "$API/rooms/dm" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"targetUserId\":\"$BOB_ID\"}" 2>/dev/null || echo '{}')
  DM_ID2=$(echo "$DM_RES2" | json_val "d.get('data',{}).get('id','')" 2>/dev/null || echo "")
  check "POST /rooms/dm second time → same room (idempotent)" "$DM_ID" "$DM_ID2"
fi

# ── Messages (E2E Encryption Verification) ──────────────────────────────────
echo ""
echo "── Messages (E2E) ──"
if [ -n "$ROOM_ID" ] && [ -n "$BOB_ID" ]; then
  SEND=$(curl -sf -X POST "$API/rooms/$ROOM_ID/messages" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"ciphertext\":\"dGVzdGVuY3J5cHRlZA==\",\"iv\":\"dGVzdGl2MTIzNDU2\",\"recipientId\":\"$BOB_ID\"}" \
    2>/dev/null || echo '{}')
  MSG_ID=$(echo "$SEND" | json_val "d.get('data',{}).get('_id','')" 2>/dev/null || echo "")
  check "POST /rooms/:id/messages → message created" "1" "$([ -n "$MSG_ID" ] && echo 1 || echo 0)"

  HAS_CONTENT=$(echo "$SEND" | json_val "'content' in d.get('data',{})" 2>/dev/null || echo "False")
  check "CRITICAL: Response has NO 'content' field (server is E2E)" "False" "$HAS_CONTENT"

  HAS_PLAINTEXT=$(echo "$SEND" | json_val "'plaintext' in d.get('data',{})" 2>/dev/null || echo "False")
  check "CRITICAL: Response has NO 'plaintext' field" "False" "$HAS_PLAINTEXT"

  HAS_CIPHER=$(echo "$SEND" | json_val "'ciphertext' in d.get('data',{})" 2>/dev/null || echo "False")
  check "Response has 'ciphertext' field" "True" "$HAS_CIPHER"

  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$API/rooms/$ROOM_ID/messages" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
  check "GET /rooms/:id/messages → 200" "200" "$STATUS"

  if [ -n "$MSG_ID" ]; then
    STATUS=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "$API/messages/$MSG_ID/reactions" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d '{"emoji":"👍"}' 2>/dev/null || echo "000")
    check "POST /messages/:id/reactions → 200" "200" "$STATUS"

    STATUS=$(curl -sf -o /dev/null -w "%{http_code}" -X DELETE "$API/messages/$MSG_ID" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    check "DELETE /messages/:id → 200" "200" "$STATUS"
  fi
fi

# ── Logout + Token Blacklist ─────────────────────────────────────────────────
echo ""
echo "── Logout ──"
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "$API/auth/logout" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}" 2>/dev/null || echo "000")
check "POST /auth/logout → 200" "200" "$STATUS"

STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$API/auth/me" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
check "Token blacklisted after logout → 401" "401" "$STATUS"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────────────"
if [ $FAIL -gt 0 ]; then
  echo -e "${RED}Results: ✅ $PASS passed  ❌ $FAIL failed${NC}"
  echo "Check logs: docker compose logs --tail=50 backend"
  exit 1
else
  echo -e "${GREEN}Results: ✅ $PASS passed  ❌ $FAIL failed${NC}"
  echo -e "${GREEN}${BOLD}CipherLink smoke tests passed! 🎉${NC}"
fi
