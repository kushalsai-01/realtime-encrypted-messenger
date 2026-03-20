# realtime-encrypted-messenger

Real-time end-to-end encrypted chat. Messages and files 
(images, video, PDF) are encrypted with AES-256-GCM 
entirely in the browser. The server only relays ciphertext.

Live demo: (add your Render URL here after deployment)

---

## How it works

1. User A creates a room — gets a 20-char base32 room code
2. User B joins with that code
3. Both browsers derive the same AES-256 key from the 
   room code using PBKDF2 (100,000 iterations)
4. All messages and files are encrypted before leaving 
   the browser — the server never sees plaintext

## Tech stack

**Frontend**
- React + Vite
- Web Crypto API — AES-256-GCM encryption, PBKDF2 key derivation
- WebSocket client with exponential backoff reconnection

**Backend**
- Node.js (ESM) + ws WebSocket server
- Redis — room state with 24h TTL
- Sliding-window rate limiting
- Input validation + origin checks

**DevOps**
- Docker — containerized server (Alpine, non-root user)
- Docker Compose — local dev orchestration with Redis
- GitHub Actions — CI (tests + build + Docker) and CD (auto-deploy to Render)
- Kubernetes manifests — Deployment, Service, Ingress, HPA (2–10 pods)

---

## Local development

**Prerequisites**
- Node.js 20+
- Redis on localhost:6379

**Option A — plain Node**
```bash
# Terminal 1
cd server && npm install && npm run dev

# Terminal 2
cd client && npm install && npm run dev
```

**Option B — Docker Compose**
```bash
docker compose up
# Then in another terminal:
cd client && npm run dev
```

Open http://localhost:5173

---

## Security

- AES-256-GCM authenticated encryption (tamper-detectable)
- PBKDF2 key derivation, 100k iterations
- 20-char base32 room codes (~100 bits entropy)
- Key never leaves the browser
- Rate limiting: 5 room creates/min, 60 messages/min per connection
- Origin validation on WebSocket upgrade
- All WebSocket message fields validated (type, UUID, length)

---

## Deployment

Deployed with **Railway (backend + Redis)** and **Vercel (frontend)**.

### Backend → Railway
1. Create a new Railway project and deploy from GitHub (set root to `server`).
2. Add environment variables:
   - `NODE_ENV=production`
   - `REDIS_URL=<your redis url>`
   - `PORT=3001`
   - `ALLOWED_ORIGINS=https://realtime-encrypted-messenger.vercel.app` (or your actual Vercel URL)
3. Confirm `/health` returns `200`.

After Railway is deployed, copy the backend URL.

### Frontend → Vercel
1. Create a new Vercel Static Site and import from GitHub.
2. Root directory: `client`
3. Framework preset: `Vite`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Environment variables:
   - `VITE_WS_URL=wss://<your-railway-backend-host>/`

Redeploy after updating env vars.

---

## GitHub Actions secrets needed

Add these in repo Settings → Secrets → Actions:

| Secret | Where to get it |
|--------|----------------|
| RENDER_BACKEND_DEPLOY_HOOK | Render backend → Settings → Deploy Hook |
| RENDER_FRONTEND_DEPLOY_HOOK | Render static site → Settings → Deploy Hook |
| BACKEND_URL | Your Render backend URL |
