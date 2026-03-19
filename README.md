# Realtime Encrypted Chat

Minimal two-user end-to-end encrypted chat built with a custom WebSocket server, Redis room storage, browser Web Crypto, and a dark UI.

## Project structure

- server: Node WebSocket server and Redis room management
- client: React + Vite SPA with AES‑GCM encryption in the browser
- nginx: reverse proxy and WebSocket upgrade config
- terraform: AWS EC2, security group, and ElastiCache Redis
- docker-compose.yml: local Redis + server

## Local development

```bash
cd realtime-chat
cp .env.example .env

docker compose up -d

cd server
npm install
npm run dev

cd ../client
npm install
npm run dev
```

Client runs on http://localhost:5173 and server on ws://localhost:3001/ws.

## Three-day deployment sequence (after local dev works)

Day 1: finish local implementation and testing.

Day 2:

```bash
cd terraform
terraform init
terraform apply

ssh -i ~/.ssh/id_rsa ec2-user@$(terraform output -raw server_ip)

git clone YOUR_REPO && cd realtime-chat/server
npm install
REDIS_URL=redis://ELASTICACHE_HOST:6379 pm2 start index.js --name chat-server
pm2 save && pm2 startup

sudo cp ../nginx/chat.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d your-domain.com

cd ../client
npm install
npm run build
sudo mkdir -p /var/www/chat
sudo cp -r dist /var/www/chat/dist
```

Day 3: monitoring, tuning security group rules, and adding metrics or logging as needed.
