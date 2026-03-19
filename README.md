# realtime-chat-app

End-to-end encrypted real-time chat. Messages and files (images, 
video, PDF) are encrypted with AES-256-GCM in the browser. 
The server relays only ciphertext — it never sees plaintext.

## Tech stack
- **Frontend**: React + Vite, Web Crypto API (AES-GCM, PBKDF2)
- **Backend**: Node.js, WebSocket (ws), Redis
- **Infra**: Render (backend + Redis), Render Static Sites (frontend)

## Architecture
- User creates room → gets 20-char base32 room code
- Both users derive AES-256 key from room code via PBKDF2 (100k iterations)
- All encryption/decryption happens in browser — server never touches key
- Files chunked into 16KB pieces, each chunk encrypted before sending

## Security
- AES-256-GCM authenticated encryption (tamper-detectable)
- Room codes: 20-char base32 (~100 bits entropy)
- PBKDF2 key derivation (100,000 iterations)
- Sliding-window rate limiting per connection
- Origin validation on WebSocket upgrade
- Input validation on all WebSocket message fields

## Local development

### Prerequisites
- Node.js 20+
- Redis running on localhost:6379
  - Windows: https://github.com/tporadowski/redis/releases
  - Or use Docker: docker run -p 6379:6379 redis:alpine

### Run
```bash
# Terminal 1 — backend
cd server
npm install
npm run dev

# Terminal 2 — frontend  
cd client
npm install
npm run dev
```

Open http://localhost:5173

## DevOps & Infrastructure

- **Docker**: Containerized Node.js server with non-root user
- **Docker Compose**: Local development with Redis + server orchestration  
- **GitHub Actions**: 
  - CI pipeline: runs Jest tests against Redis, builds React app, validates Docker image
  - CD pipeline: auto-deploys to Render on push to main via deploy hooks, runs health check
- **Kubernetes**: Deployment, Service, Ingress (WebSocket-compatible), HPA, Secrets manifests

## Local dev with Docker

Requires Docker Desktop.

```bash
docker compose up
# Server at http://localhost:3001
# Redis at localhost:6379
```

Run the React client separately as described above.

## Deployment (Render)

See DEPLOY.md

## Known limitations (free tier)
- Backend spins down after 15 min inactivity on Render free tier
- First request after spin-down takes ~30s
- Redis free tier has 25MB storage limit
