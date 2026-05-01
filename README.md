# 🔐 CipherLink — Real-Time Encrypted Messenger

End-to-end encrypted messaging with ECDH key exchange + AES-GCM encryption, WebSocket real-time delivery, JWT auth with refresh token rotation, and horizontal scaling via Redis pub/sub.

**Stack:** React (Vite) · Node.js + Express · WebSockets (ws) · PostgreSQL (Supabase) · MongoDB (Atlas) · Redis (Upstash) · Docker · Kubernetes

---

## Architecture

```
Browser (React) ──HTTPS──▶ Vercel CDN
                           (static SPA)
                                │
                    REST /api ──┤
                    WSS  /ws ───┤
                                ▼
                  K8s Ingress (NGINX + TLS)
                                │
                  ┌─────────────┴─────────────┐
                  ▼                           ▼
           Backend Pod 1              Backend Pod 2
           (Node.js + ws)             (Node.js + ws)
                  │                           │
          Redis Pub/Sub ◀──────────────────▶ Redis Pub/Sub
          (cross-pod WS routing)
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
   PostgreSQL  MongoDB    Upstash Redis
   (Supabase)  (Atlas)   (presence/queue/
   users/rooms messages   rate limits)
```

---

## Quick Start (Local Dev)

### Prerequisites
- Docker Desktop
- Node.js 20+ (for running without Docker)

### 1. Clone and configure
```bash
git clone https://github.com/kushalsai-01/realtime-encrypted-messenger.git
cd realtime-encrypted-messenger
cp backend/.env.example backend/.env
# Edit backend/.env — fill in MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET
# All other values are pre-configured for local docker-compose
```

### 2. Run database migrations
```bash
cd backend
npm install
npm run migrate
cd ..
```

### 3. Start with Docker Compose
```bash
docker-compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Nginx (routes both): http://localhost:80

---

## Production Deployment

### Target Architecture
- **Frontend** → Vercel (automatic deployments via GitHub)
- **Backend** → Kubernetes cluster (GKE / K3s / any managed K8s)

---

### Step 1: Set up your domain

You need a domain for the backend API. In this guide we use `api.yourdomain.com`.

Update these files with your actual domain:
- `k8s/ingress.yaml` → replace `api.yourdomain.com`
- `frontend/.env.production` → replace `api.yourdomain.com`

---

### Step 2: Build and push Docker image

```bash
# Set your Docker Hub username
export DOCKER_USERNAME=yourusername

# Build backend image
docker build -t $DOCKER_USERNAME/cem-backend:latest ./backend
docker push $DOCKER_USERNAME/cem-backend:latest

# Build frontend image (replace with your domain)
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  --build-arg VITE_WS_URL=wss://api.yourdomain.com \
  -t $DOCKER_USERNAME/cem-frontend:latest \
  ./frontend
docker push $DOCKER_USERNAME/cem-frontend:latest
```

---

### Step 3: Set up Kubernetes

#### 3a. Install prerequisites on your cluster
```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager (for automatic TLS certificates)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

#### 3b. Create Let's Encrypt ClusterIssuer
```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

#### 3c. Apply K8s configs
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configmap (non-sensitive config)
kubectl apply -f k8s/configmap.yaml

# Create secrets (fill in your real values)
kubectl create secret generic cipherlink-secrets \
  --namespace cipherlink \
  --from-literal=DATABASE_URL="postgresql://user:pass@db.supabase.co:5432/postgres" \
  --from-literal=MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/cipherlink" \
  --from-literal=UPSTASH_REDIS_REST_URL="https://yourdb.upstash.io" \
  --from-literal=UPSTASH_REDIS_REST_TOKEN="your-token" \
  --from-literal=UPSTASH_REDIS_URL="rediss://default:pass@host:port" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 64)" \
  --from-literal=JWT_REFRESH_SECRET="$(openssl rand -base64 64)" \
  --from-literal=CORS_ORIGIN="https://your-app.vercel.app"

# Apply deployment and services
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/pdb.yaml
kubectl apply -f k8s/ingress.yaml

# Update the image in the deployment (replace with your docker username and tag)
kubectl set image deployment/cipherlink-backend \
  backend=yourusername/cem-backend:latest \
  --namespace cipherlink

# Run database migration (one-time)
kubectl run migrate --rm -it \
  --image=yourusername/cem-backend:latest \
  --namespace cipherlink \
  --env-file=backend/.env \
  --restart=Never \
  -- node src/models/migrate.js
```

#### 3d. Verify deployment
```bash
# Check pods are running
kubectl get pods -n cipherlink

# Check ingress (look for ADDRESS — this is your load balancer IP)
kubectl get ingress -n cipherlink

# Check TLS certificate
kubectl get certificate -n cipherlink

# View backend logs
kubectl logs -n cipherlink deployment/cipherlink-backend -f

# Check health endpoint
curl https://api.yourdomain.com/health
```

---

### Step 4: Deploy Frontend to Vercel

#### Option A: Vercel Dashboard (recommended for first deploy)
1. Go to https://vercel.com/new → Import GitHub repo
2. Set root directory to `frontend`
3. Set environment variables:
   - `VITE_API_URL` = `https://api.yourdomain.com`
   - `VITE_WS_URL` = `wss://api.yourdomain.com`
4. Deploy

#### Option B: Auto-deploy via GitHub Actions
Set these GitHub repository secrets (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | Your Docker Hub password/token |
| `KUBE_CONFIG` | Base64 kubeconfig: `cat ~/.kube/config \| base64 -w 0` |
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `UPSTASH_REDIS_REST_URL` | Upstash REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST API token |
| `UPSTASH_REDIS_URL` | Upstash `rediss://` URL for IORedis |
| `JWT_SECRET` | 64-char random secret |
| `JWT_REFRESH_SECRET` | 64-char random secret (different from JWT_SECRET) |
| `CORS_ORIGIN` | Your Vercel app URL, e.g. `https://cipherlink.vercel.app` |
| `VITE_API_URL` | `https://api.yourdomain.com` |
| `VITE_WS_URL` | `wss://api.yourdomain.com` |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

Push to `main` → GitHub Actions builds images, deploys to K8s, and deploys frontend to Vercel automatically.

---

## Environment Variables Reference

### Backend (`backend/.env`)
See `backend/.env.example` for all variables with descriptions.

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend REST API URL (e.g. `https://api.yourdomain.com`) |
| `VITE_WS_URL` | Backend WebSocket URL (e.g. `wss://api.yourdomain.com`) |

---

## Troubleshooting

### Pods not starting / CrashLoopBackOff
```bash
kubectl describe pod -n cipherlink <pod-name>
kubectl logs -n cipherlink <pod-name> --previous
```
Common causes: missing secrets, wrong DATABASE_URL format, MongoDB connection timeout.

### WebSocket connections failing
1. Check ingress annotations: `nginx.ingress.kubernetes.io/proxy-read-timeout` must be `"3600"`
2. Verify the ingress has TLS configured (wss:// requires HTTPS on the ingress)
3. Check CORS_ORIGIN includes your Vercel domain

### "Invalid token" on WebSocket connect
The JWT access token expired. The frontend will redirect to login. Check that `JWT_EXPIRES_IN=15m` is set.

### Messages not appearing on second pod
Verify `UPSTASH_REDIS_URL` is set correctly — cross-pod delivery uses IORedis pub/sub.

### Rate limit errors (429)
Rate limits are Redis-backed and shared across pods. Limits: 120 req/min general, 20 req/15min for auth endpoints.

### Database migration
```bash
# Run once after first deployment, or when schema changes
kubectl run migrate --rm -it \
  --image=yourusername/cem-backend:latest \
  --namespace cipherlink \
  --restart=Never \
  -- node src/models/migrate.js
```

---

## Security Notes

- **E2E Encryption**: ECDH key exchange + AES-GCM. Private keys never leave the browser (stored in IndexedDB).
- **JWT**: 15-minute access tokens + 30-day rotating refresh tokens. Logout blacklists the JTI in Redis.
- **Refresh tokens**: Stored as SHA-256 hashes in PostgreSQL. Token rotation on every refresh.
- **Rate limiting**: Redis-backed, shared across all pods.
- **Secrets**: Never committed to git. K8s Secrets + GitHub Actions secrets only.
