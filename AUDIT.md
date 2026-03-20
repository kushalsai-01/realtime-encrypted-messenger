# CipherLink — Full Audit Report

## Stub / Missing Routes

| Route | Status | Issue |
|-------|--------|-------|
| `POST /api/auth/refresh` | ❌ Missing | No refresh endpoint. Sessions table exists but is never written to. |
| `POST /api/auth/logout` | ❌ Missing | No logout. Access tokens cannot be revoked. |
| `GET /api/auth/me` | ❌ Missing | Exists on `/api/users/me` but not on auth router. |
| `GET /api/auth/sessions` | ❌ Missing | No device session listing. |
| `DELETE /api/auth/sessions/:id` | ❌ Missing | No session revocation. |
| `POST /api/rooms` | ❌ Missing | No room creation endpoint. |
| `GET /api/rooms` | ❌ Missing | No room listing. |
| `POST /api/rooms/dm` | ❌ Missing | No DM creation. |
| `GET /api/rooms/:id/messages` | ❌ Missing | Messages only accessible via conversationId on `/api/messages`, not per room. |
| `POST /api/rooms/:id/messages` | ❌ Missing | Messages are only sent via WebSocket, not HTTP. |
| `DELETE /api/messages/:id` | ❌ Missing | No message deletion. |
| `POST /api/messages/:id/reactions` | ❌ Missing | No reactions. |
| `POST /api/users/public-key` | ❌ Missing | ECDH public key registration not implemented. |
| `GET /api/users/:id/public-key` | ❌ Missing | ECDH public key fetching not implemented. |

## WebSocket Events — Unhandled

| Event | Direction | Issue |
|-------|-----------|-------|
| `typing:start` | client→server | No handler. `wsServer.js` doesn't route event types. |
| `typing:stop` | client→server | No handler. |
| `heartbeat` | client→server | No handler. |
| `presence:get` | client→server | No handler. |
| `messages:read` | client→server | No handler. |
| Any routed event | server→client | wsServer only broadcasts one event type (message). |
| Auth on WS | — | WS accepts any `userId` query param without JWT verification — unauthenticated access possible. |

## Encryption — Not Actually Working End-to-End

| Issue | Severity | Detail |
|-------|----------|--------|
| PBKDF2 shared secret is hardcoded | 🔴 Critical | `keyExchange.js::negotiateSharedSecret()` returns the string `'cipherlink-room-key'`. All messages use the same key. |
| No ECDH key generation | 🔴 Critical | `keyManager.js` uses PBKDF2 not ECDH P-256. Users cannot establish per-conversation shared keys. |
| No IndexedDB key storage | 🔴 Critical | Keys are not persisted. Page refresh = new key = cannot decrypt existing messages. |
| No public key API | 🔴 Critical | Without `/api/users/public-key`, ECDH exchange is impossible. |
| `keyExchange.js` is a stub | 🔴 Critical | `negotiateSharedSecret()` body returns a hardcoded string. |
| `Chat.jsx` uses hardcoded recipientId `'peer'` | 🔴 Critical | Every message is addressed to a user called 'peer' which doesn't exist. |
| Decrypt result discarded | 🔴 High | `useWebSocket` calls `decrypt()` but throws away the result — decrypted text never reaches the UI. |
| Separate WebSocket instances in Chat and App | 🔴 High | `App.jsx` and `Chat.jsx` each call `useWebSocket()` creating two connections. |

## Auth — Incomplete

| Issue | Severity | Detail |
|-------|----------|--------|
| Refresh token never stored in DB | 🔴 Critical | `authService.login` signs a JWT refresh token but never writes to the `sessions` table. |
| No refresh token rotation | 🔴 High | Without DB storage, refresh tokens can't be rotated or revoked. |
| No logout / token blacklist | 🔴 High | Once issued, access tokens are valid until expiry regardless of logout. |
| `sessions` table missing `expires_at` | 🟡 Medium | Schema lacks expiry — can't enforce session expiration. |

## Frontend — Placeholder / Empty State

| File | Issue |
|------|-------|
| `App.jsx` | No router — no login/register pages. All users anonymous. |
| `App.jsx` | `userId` created with `crypto.randomUUID()` on every render (not persisted). Page refresh creates new identity. |
| `App.jsx` | Hardcoded `'cipherlink-room-key'` passed to `useEncryption`. |
| `ConversationList.jsx` | Hardcoded static list (`['general', 'team', 'private']`). No API calls. |
| `Chat.jsx` | No receive path — incoming WS messages never update the message list. |
| `MessageList.jsx` | No reactions, no delete, no reply-to, no read receipts, no timestamps. |
| `MessageInput.jsx` | No typing indicators, no reply-to context, no keyboard shortcut (Ctrl+Enter). |
| `UserStatus.jsx` | Shows raw `status` string. No online dot. |
| No Login/Register pages | App has no auth UI at all. |

## Security Issues

| Issue | Severity |
|-------|----------|
| WS accepts arbitrary userId without JWT | 🔴 Critical |
| Hardcoded shared encryption key | 🔴 Critical |
| Refresh tokens not stored — cannot be revoked | 🔴 High |
| No logout token blacklisting | 🔴 High |
| `sessions` table created but never used | 🟡 Medium |

## Env Variables — Missing from .env.example

| Variable | Used In |
|----------|---------|
| `SERVER_ID` | `config.js`, `wsServer.js` |
| `REDIS_URL` | `docker-compose.yml` (not in example) |

## Message Storage — E2E Status

✅ `Message.js` schema only has `ciphertext` and `iv` — NO plaintext field. Server stores only ciphertext. This part is correct.

## Summary Counts

- Routes missing: 14
- WS events unhandled: 5
- Critical encryption issues: 6
- Auth issues: 4
- Frontend placeholders: 9
- Security issues: 5
