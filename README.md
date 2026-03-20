<div align="center">
  <h1>🔐 CipherLink</h1>
  <p><strong>Realtime End-to-End Encrypted Messenger</strong></p>
  <p>
    <a href="https://github.com/kushalsai-01/realtime-encrypted-messenger/actions">
      <img src="https://github.com/kushalsai-01/realtime-encrypted-messenger/actions/workflows/ci.yml/badge.svg" alt="CI"/>
    </a>
    <img src="https://img.shields.io/badge/Encryption-AES--256--GCM-green" alt="AES-256-GCM"/>
    <img src="https://img.shields.io/badge/Key_Exchange-ECDH_P--256-blue" alt="ECDH"/>
    <img src="https://img.shields.io/badge/Node.js-20-brightgreen" alt="Node.js"/>
  </p>
  <p>
    <a href="https://realtime-encrypted-messenger.vercel.app">🚀 Live Demo</a> •
    <a href="#encryption-model">Encryption Model</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#quick-start">Quick Start</a>
  </p>
</div>

---

## What This Is

CipherLink is a production-grade encrypted messaging app where **the server never sees your messages**. Messages are encrypted in the browser using AES-256-GCM, with keys established via ECDH P-256 key exchange. Even if the server database were fully compromised, all messages remain unreadable.

**Built to demonstrate:**
- Browser-native Web Crypto API — zero third-party crypto dependencies
- ECDH P-256 key exchange + AES-256-GCM encryption entirely on the client
- Private keys stored in IndexedDB — never transmitted to the server
- Real-time WebSocket messaging (presence, typing indicators, read receipts)
- JWT auth with refresh token rotation, concurrent refresh locking, and logout blacklisting
- Production deployment: Docker + Kubernetes + GitHub Actions CI/CD

---

## Encryption Model

```
Alice's Device                   Server (blind)            Bob's Device
──────────────                   ──────────────            ────────────
Generate ECDH keypair                                       Generate ECDH keypair
Save private key → IndexedDB                               Save private key → IndexedDB
    │                                                           │
    ├─── POST /api/users/public-key ────────────────────────────┤
    │                                                           │
    ├─── GET Bob's public key ──────────────────────────────────►
    │                                                           │
ECDH(Alice.private, Bob.public) = SharedKey    ECDH(Bob.private, Alice.public) = SharedKey
    │                                                           │
AES-GCM.encrypt(plaintext, SharedKey) → { ciphertext, iv }     │
    │                                                           │
    ├─── WS { ciphertext, iv } ─────────────────────────────────►
    │              Stores { ciphertext, iv } only               │
    │                                           AES-GCM.decrypt(ciphertext, SharedKey) → plaintext
```

**Server stores:** `ciphertext` (base64) + `iv` (base64) + metadata (senderId, conversationId, timestamp)  
**Server never sees:** plaintext, private keys, shared keys

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Nginx (:80)                            │
│     Rate limiting · WS upgrade · Gzip · Security headers  │
└──────────────┬──────────────────────┬────────────────────┘
               │                      │
┌──────────────▼──────┐   ┌──────────▼────────────────────┐
│  React Frontend      │   │  Node.js Backend (:3000)       │
│  Vite + Tailwind     │   │  Express + WebSocket (ws)      │
│  Web Crypto API      │   │  JWT (15min) + Refresh tokens  │
│  IndexedDB for keys  │   │  Token blacklist in Redis      │
└─────────────────────┘   └────────────┬───────────────────┘
                                        │
                           ┌────────────┴──────────────────┐
                           │  PostgreSQL  │  MongoDB  │  Redis │
                           │  Users/Auth  │  Messages │  Cache  │
                           │  Rooms/Keys  │  E2E only │  PubSub │
                           └───────────────────────────────┘
```

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Encryption | Web Crypto API (ECDH P-256 + AES-256-GCM) |
| Key storage | IndexedDB — private keys never leave the device |
| Transport | Native WebSocket with exponential backoff reconnection |
| Backend | Node.js 20, Express, `ws` library |
| User/room DB | PostgreSQL on Supabase |
| Message DB | MongoDB Atlas (ciphertext only) |
| Cache/PubSub | Upstash Redis (presence, offline queue, token blacklist) |
| Auth | JWT (15min) + rotating refresh tokens (30d, stored hashed in DB) |
| DevOps | Docker, Kubernetes, GitHub Actions |

---

## Features

- ✅ **E2E Encryption** — ECDH key exchange, AES-256-GCM messages, server is cryptographically blind
- ✅ **Rooms + DMs** — create group rooms, open direct messages with any user
- ✅ **Realtime** — messages, typing indicators, online/offline presence, read receipts
- ✅ **Message reactions** — emoji quick bar (👍 ❤️ 😂 😮 😢 😡), toggleable
- ✅ **Message delete** — soft-delete with "This message was deleted" placeholder
- ✅ **Reply-to** — reference encrypted messages in replies
- ✅ **Message search** — client-side full-text search after decryption
- ✅ **Auth** — register/login, 15-min JWTs, rotating refresh tokens, session management, logout blacklist
- ✅ **Reconnection** — exponential backoff (max 10 attempts, up to 30s delay)
- ✅ **Notifications** — browser push notifications when tab is not focused
- ✅ **Mobile UX** — responsive layout, iOS safe-area keyboard inset

---

## Quick Start

```bash
git clone https://github.com/kushalsai-01/realtime-encrypted-messenger.git
cd realtime-encrypted-messenger

# Copy and fill in env vars
cp backend/.env.example backend/.env
# Edit backend/.env with real database credentials

# Start all services (Docker required)
make up

# Run database migrations
make migrate

# Open http://localhost
```

**Without Docker:**
```bash
cd backend && npm install && npm run dev   # terminal 1
cd frontend && npm install && npm run dev  # terminal 2
```

---

## Security Properties

| Property | Implementation |
|----------|---------------|
| Message confidentiality | AES-256-GCM — authenticated encryption |
| Key agreement | ECDH P-256 via Web Crypto API |
| Forward secrecy | Per-conversation derived key (ECDH) |
| Private key storage | IndexedDB only — never transmitted |
| Access token TTL | 15 minutes |
| Refresh token rotation | One-time use, hashed in DB, rotated on every use |
| Logout security | Access token JTI blacklisted in Redis |
| Token length | Refresh tokens = 80-char hex (cryptographically random) |
| Transport security | HTTPS/WSS in production (TLS 1.3 via Nginx/Render) |
| Rate limiting | 120 req/min API, 10 req/min auth, 100 req/min WS burst |

---

## Deployment

Push to `main` → CI/CD runs automatically:

1. **GitHub Actions CI** — install deps, build frontend, verify `dist/index.html` exists
2. **GitHub Actions Deploy** — build+push Docker images to Docker Hub, trigger Render backend deploy, deploy frontend to Vercel

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |
| `VITE_API_URL` | `https://cipherlink-backend.onrender.com` |
| `VITE_WS_URL` | `wss://cipherlink-backend.onrender.com` |
| `RENDER_DEPLOY_HOOK_URL` | Render → Settings → Deploy Hook |
| `VERCEL_TOKEN` | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Vercel project settings |
| `VERCEL_PROJECT_ID` | Vercel project settings |

### Run Smoke Tests

```bash
# After make up
./scripts/smoke-test.sh

# Against production
API_URL=https://cipherlink-backend.onrender.com ./scripts/smoke-test.sh
```

---

## Project Structure

```
realtime-encrypted-messenger/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, Redis, env validation
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── middleware/       # Auth (JWT + blacklist), errors, rate limiting
│   │   ├── models/          # Mongoose Message schema + PostgreSQL migrations
│   │   ├── routes/          # auth, rooms, messages, users
│   │   ├── services/        # Business logic (auth, rooms, messages, presence)
│   │   └── websocket/       # WS server, event router, Redis pub/sub
│   ├── Dockerfile           # Multi-stage, non-root
│   └── render.yaml          # Render deploy config
├── frontend/
│   ├── src/
│   │   ├── crypto/          # ECDH keygen, AES-GCM cipher, IndexedDB key store
│   │   ├── hooks/           # useAuth, useEncryption, useWebSocket
│   │   ├── components/      # Chat, MessageList, MessageInput, ConversationList
│   │   ├── pages/           # Login, Register
│   │   └── services/        # API (axios + interceptors), WS client, key exchange
│   └── vercel.json          # Vercel deploy config
├── k8s/                     # 11 Kubernetes manifests (HPA 2-10 pods)
├── nginx/                   # Reverse proxy config
├── scripts/
│   └── smoke-test.sh        # E2E smoke tests (bash + curl)
├── Makefile                 # Dev shortcuts
└── docker-compose.yml       # Local full stack
```
