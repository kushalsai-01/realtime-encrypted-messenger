# Kubernetes Deployment

## Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/server-deployment.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

## Check status
kubectl get all -n realtime-chat

## View logs
kubectl logs -f deployment/chat-server -n realtime-chat

## Scale manually
kubectl scale deployment/chat-server --replicas=3 -n realtime-chat

