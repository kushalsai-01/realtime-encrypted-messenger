# Deploy to Render

## 1. Redis
- Render dashboard → New → Redis → Free plan
- Copy the Internal Redis URL

## 2. Backend
- New → Web Service → connect GitHub repo
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `node index.js`
- Plan: Free
- Environment variables:
  - `NODE_ENV = production`
  - `REDIS_URL =` Internal Redis URL from step 1
  - `ALLOWED_ORIGINS =` your frontend URL — fill after step 3
  - `PORT = 3001`

## 3. Frontend
- New → Static Site → connect GitHub repo
- Root Directory: `client`
- Build Command: `npm run build`
- Publish Directory: `dist`
- Environment variables:
  - `VITE_WS_URL = wss://<your-backend-url>/ws`

## 4. Update ALLOWED_ORIGINS
- Go back to backend service → Environment
- Set `ALLOWED_ORIGINS = https://<your-frontend-url>`
- Save → auto-redeploys

