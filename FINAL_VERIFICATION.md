# CipherLink — Final Verification Checklist

Run through each section manually after `make up && make migrate`.

---

## Encryption (most critical)

- [ ] `POST /api/rooms/:id/messages` request body contains `ciphertext` + `iv`, NOT `content` or `plaintext`
- [ ] MongoDB document for a message has `ciphertext` (base64) + `iv` (base64) fields — NO `plaintext` or `content`
- [ ] Response from message endpoints never includes plaintext
- [ ] Open DevTools → Application → IndexedDB → `cipherlink-keys` → `keypairs` — key pair appears after login
- [ ] Private keys are NOT present in localStorage or sessionStorage
- [ ] Two browser tabs (Alice + Bob) can register, exchange messages, and each successfully decrypts the other's messages
- [ ] Smoke test check passes: "CRITICAL: Response has NO 'content' field (server is E2E)"

**Verify from MongoDB shell:**
```js
db.messages.findOne()
// Must have: ciphertext, iv
// Must NOT have: content, plaintext, text
```

---

## WebSocket

- [ ] Connect tab 1 (Alice) and tab 2 (Bob) — both show "Connected" (green dot)
- [ ] Alice sends message → appears immediately in Bob's chat (realtime via WS)
- [ ] Disconnect tab 1 (close tab or kill network) → tab 2 shows Alice as offline
- [ ] Tab 1 starts typing → tab 2 shows "typing…" indicator next to Alice's name
- [ ] Tab 1 stops typing (2s timeout) → indicator disappears in tab 2
- [ ] Bob reads messages → Alice's sent messages show ✓✓ (double tick)
- [ ] Kill network → reconnect → messages resume without page refresh (check console for reconnect attempts)
- [ ] WS connection without a valid JWT token is rejected with code 1008

**Verify WS auth:**
```bash
# Should fail with close code 1008
wscat -c "ws://localhost:3000/ws?userId=fake-id-no-token"
```

---

## Auth

- [ ] Register → login → receive `accessToken` (JWT, 15min) + `refreshToken` (40-byte hex)
- [ ] Decode accessToken JWT — verify `jti` claim is present, `exp` is ~15 minutes from now
- [ ] Wait for access token to expire (or shorten `JWT_EXPIRES_IN=1m` and wait) → next API request auto-refreshes → new token used transparently
- [ ] Make 3 simultaneous API requests while token is expired — only ONE refresh call fires (no duplicate refresh)
- [ ] `POST /auth/logout` → `POST /auth/me` with same token → 401 (blacklisted in Redis)
- [ ] `POST /auth/refresh` with old refresh token after rotation → 401 (one-time use enforced)
- [ ] `GET /auth/sessions` — returns list of active sessions

**Check Redis blacklist:**
```bash
redis-cli keys "blacklist:*"   # Should have one entry after logout
redis-cli ttl "blacklist:<jti>" # Should be < 900 (15min in seconds)
```

---

## Message Features

- [ ] Send message → appears in chat with timestamp
- [ ] Hover over message → emoji quick bar appears (👍 ❤️ 😂 😮 😢 😡)
- [ ] Click emoji → reaction badge appears below message for both users
- [ ] Click same emoji again → reaction removed (toggle)
- [ ] Hover over own message → red ✕ appears in action bar
- [ ] Click ✕ → message replaced with "This message was deleted" (italic, greyed)
- [ ] Reply is stored with `replyToId` field — header shows "🔒 Encrypted message" above reply
- [ ] Search bar filters messages client-side after decryption

---

## Rooms

- [ ] `POST /api/rooms` → new room appears in list
- [ ] `POST /api/rooms/dm` → DM room created, room type shows `is_direct: true`
- [ ] `POST /api/rooms/dm` again with same user → returns existing room (idempotent)
- [ ] `GET /api/rooms/:id/members` → returns room member list
- [ ] Only room admin can add/remove members

---

## Frontend UX

- [ ] Login page → register page navigation works
- [ ] On mobile (<768px): room list takes full screen, tap room → slides to chat view
- [ ] Back button in chat header returns to room list on mobile
- [ ] Chat input stays above keyboard on iOS (check `env(safe-area-inset-bottom)` in CSS)
- [ ] Browser notification permission prompt appears on first login
- [ ] New message in background tab → browser notification shows "🔒 Encrypted message" (no plaintext)
- [ ] Message list auto-scrolls to bottom only when already at bottom

---

## Smoke Tests

```bash
./scripts/smoke-test.sh
```

Expected output:
```
── Health ──
  ✅ GET /health → 200
── Auth ──
  ✅ Register Alice → success
  ✅ Register Bob → success
  ✅ Login Alice → access token received
  ✅ GET /auth/me → 200
  ✅ GET /auth/me without token → 401
  ✅ POST /auth/refresh → new access token
  ✅ Refresh token rotated (new token != old)
── Public Keys ──
  ✅ POST /users/public-key → 200
  ✅ GET /users/:id/public-key → 200
── Rooms ──
  ✅ POST /rooms → room created
  ✅ GET /rooms → 200
  ✅ POST /rooms/dm → DM room created
  ✅ POST /rooms/dm second time → same room (idempotent)
── Messages (E2E) ──
  ✅ POST /rooms/:id/messages → message created
  ✅ CRITICAL: Response has NO 'content' field (server is E2E)
  ✅ CRITICAL: Response has NO 'plaintext' field
  ✅ Response has 'ciphertext' field
  ✅ GET /rooms/:id/messages → 200
  ✅ POST /messages/:id/reactions → 200
  ✅ DELETE /messages/:id → 200
── Logout ──
  ✅ POST /auth/logout → 200
  ✅ Token blacklisted after logout → 401
```

---

## Build + Docker

- [ ] `cd frontend && npm run build` → zero errors, `dist/index.html` exists, bundle < 500KB
- [ ] `make up` → all 5 containers start healthy (`docker compose ps`)
- [ ] `make migrate` → PostgreSQL tables created without error
- [ ] `make logs` → no startup crash in backend logs
- [ ] `make shell-backend` → can `node src/models/migrate.js` manually
- [ ] CI badge is green on GitHub: https://github.com/kushalsai-01/realtime-encrypted-messenger/actions

---

## Production Checklist

- [ ] `backend/.env` has all required variables filled in (no PLACEHOLDER values)
- [ ] `JWT_SECRET` is at least 32 characters and different from `JWT_REFRESH_SECRET`
- [ ] `CORS_ORIGIN` is set to the exact Vercel frontend URL (no trailing slash)
- [ ] `UPSTASH_REDIS_URL` uses `rediss://` (TLS) not `redis://`
- [ ] Render service health check path set to `/health`
- [ ] Vercel project root directory set to `frontend`
- [ ] All 8 GitHub Actions secrets are configured
