# Security Overview

This project is an educational end-to-end encrypted realtime chat application. It is hardened beyond a toy example but is not a complete production security solution.

## Data protection

- Messages and files are encrypted in the browser using AES-256-GCM via the Web Crypto API.
- A per-room key is derived with PBKDF2 (SHA-256) from a 20-character base32 room secret.
- The WebSocket server never sees plaintext; it only relays opaque ciphertext blobs.
- Rooms and membership are stored in Redis with a 24 hour TTL; messages and file contents are never persisted.

## Transport and origin

- WebSocket connections are expected to be served behind HTTPS and an Nginx reverse proxy.
- The server validates the `Origin` header on every WebSocket upgrade:
  - Allowed origins are configured via `ALLOWED_ORIGINS`.
  - In development, `localhost` origins are allowed automatically.
- The `/health` endpoint sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Cache-Control: no-store`.

## Abuse and rate limiting

- Sliding-window rate limiter protects key operations:
  - `CREATE_ROOM`: 5 per minute per IP.
  - `JOIN_ROOM`: 10 per minute per IP.
  - `MESSAGE`: 60 per minute per connection.
- File transfers have an additional per-connection limiter (100 `FILE_CHUNK` events per 10 seconds).
- When limits are exceeded the server returns `RATE_LIMITED` errors and may close the connection.

## Input validation

- All WebSocket messages are validated before processing:
  - `type` must be an expected string constant.
  - `roomCode` must match `/^[A-Z2-7]{20}$/` where required.
  - `userId` must be a valid UUID v4.
  - Ciphertext payload sizes are bounded to avoid pathological inputs.
- Invalid payloads yield an `INVALID_INPUT` error and are ignored.

## Known limitations

- No authentication or user accounts; any client can choose any `userId`.
- Room secret is still a single shared value; there is no forward secrecy or key rotation.
- Session protection (e.g. CSRF, XSS, CSP) is not configured at the framework level.
- Logging and monitoring are minimal; there is no audit trail or anomaly detection.

## Production hardening recommendations

If you wanted to take this system to production, you should:

- Add real authentication (JWT or OAuth) and bind `userId` to an authenticated identity.
- Implement a proper key exchange protocol:
  - Use a long, random secret generated for each room.
  - Exchange it via an authenticated channel or QR codes, not as a user-visible code.
  - Consider adding forward secrecy (e.g. Double Ratchet or similar).
- Enforce HTTPS everywhere and consider HTTP/2 or HTTP/3 with strict TLS configuration.
- Add a strict Content Security Policy and implement defense-in-depth against XSS.
- Integrate logging, metrics, and alerting for rate-limit hits and unusual patterns.
- Put the service behind a WAF or API gateway with DDoS protection.
- Add backup, restore, and disaster-recovery plans for Redis and configuration.

