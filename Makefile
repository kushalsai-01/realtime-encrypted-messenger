.PHONY: up down build logs migrate shell-backend shell-db prod-up prod-down k8s-apply k8s-status k8s-logs k8s-delete

up:
	docker compose up -d --build
	@echo "✓ Stack running → http://localhost"

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f backend

migrate:
	docker compose exec backend node src/models/migrate.js

shell-backend:
	docker compose exec backend sh

shell-db:
	docker compose exec postgres psql -U cipherlink -d cipherlink

prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

k8s-apply:
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/secrets.yaml
	kubectl apply -f k8s/redis-deployment.yaml
	kubectl apply -f k8s/redis-service.yaml
	kubectl apply -f k8s/backend-deployment.yaml
	kubectl apply -f k8s/backend-service.yaml
	kubectl apply -f k8s/frontend-deployment.yaml
	kubectl apply -f k8s/frontend-service.yaml
	kubectl apply -f k8s/ingress.yaml
	kubectl apply -f k8s/hpa.yaml
	@echo "✓ K8s manifests applied"

k8s-status:
	kubectl get all -n cipherlink

k8s-logs:
	kubectl logs -f deployment/cipherlink-backend -n cipherlink

k8s-delete:
	kubectl delete namespace cipherlink
