# 🚀 Deployment Guide - NewFeed Microservices

## 📋 Mục lục

- [Production Checklist](#production-checklist)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Scaling](#scaling)
- [Backup & Recovery](#backup--recovery)

---

## ✅ Production Checklist

### Trước khi deploy

- [ ] **Security**

  - [ ] Thay đổi tất cả secrets mặc định
    - `JWT_SECRET`
    - `SERVICE_SECRET`
    - Database passwords
  - [ ] Cấu hình HTTPS/TLS cho API Gateway
  - [ ] Set up firewall rules
  - [ ] Enable CORS với domain production

- [ ] **Environment Variables**

  - [ ] Configure production DATABASE_URL
  - [ ] Set REDIS_HOST, REDIS_PORT
  - [ ] Set RABBITMQ_URL
  - [ ] Configure CLOUDINARY credentials
  - [ ] Set CLIENT_URL to production domain

- [ ] **Infrastructure**

  - [ ] PostgreSQL với replication và backup
  - [ ] Redis với persistence (AOF/RDB)
  - [ ] RabbitMQ cluster (3+ nodes)
  - [ ] Load balancer cho API Gateway
  - [ ] CDN cho static assets

- [ ] **Monitoring**

  - [ ] Prometheus metrics
  - [ ] Grafana dashboards
  - [ ] Log aggregation (ELK/Loki)
  - [ ] Alerting (PagerDuty/Slack)

- [ ] **CI/CD**
  - [ ] Automated tests
  - [ ] Docker image build pipeline
  - [ ] Deployment automation
  - [ ] Rollback strategy

---

## 🐳 Docker Deployment

### 1. Production Docker Compose

**docker-compose.prod.yml:**

```yaml
version: "3.8"

services:
  # API Gateway - Scale horizontally
  api-gateway:
    image: newfeed/api-gateway:latest
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      SERVICE_SECRET: ${SERVICE_SECRET}
    ports:
      - "8080:8080"
    depends_on:
      - auth-service
      - post-service
      - comment-service
      - media-service
    networks:
      - microservices-network

  # Auth Service
  auth-service:
    image: newfeed/auth-service:latest
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
    environment:
      NODE_ENV: production
      DATABASE_URL: ${AUTH_DB_URL}
      JWT_SECRET: ${JWT_SECRET}
      SERVICE_SECRET: ${SERVICE_SECRET}
    depends_on:
      - postgres-auth
    networks:
      - microservices-network

  # Post Service
  post-service:
    image: newfeed/post-service:latest
    deploy:
      replicas: 2
    environment:
      NODE_ENV: production
      DATABASE_URL: ${POST_DB_URL}
      SERVICE_SECRET: ${SERVICE_SECRET}
      RABBITMQ_URL: ${RABBITMQ_URL}
      AUTH_SERVICE_URL: http://auth-service:3001
    depends_on:
      - postgres-post
      - rabbitmq
    networks:
      - microservices-network

  # Comment Service - Scale for high traffic
  comment-service:
    image: newfeed/comment-service:latest
    deploy:
      replicas: 3
    environment:
      NODE_ENV: production
      DATABASE_URL: ${COMMENT_DB_URL}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      RABBITMQ_URL: ${RABBITMQ_URL}
    depends_on:
      - postgres-comment
      - redis
      - rabbitmq
    networks:
      - microservices-network

  # Media Service
  media-service:
    image: newfeed/media-service:latest
    deploy:
      replicas: 2
    environment:
      NODE_ENV: production
      DATABASE_URL: ${POST_DB_URL}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
    networks:
      - microservices-network

  # PostgreSQL - Auth DB
  postgres-auth:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: auth_db
    volumes:
      - postgres-auth-data:/var/lib/postgresql/data
    networks:
      - microservices-network

  # PostgreSQL - Post DB
  postgres-post:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: post_db
    volumes:
      - postgres-post-data:/var/lib/postgresql/data
    networks:
      - microservices-network

  # PostgreSQL - Comment DB
  postgres-comment:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: comment_db
    volumes:
      - postgres-comment-data:/var/lib/postgresql/data
    networks:
      - microservices-network

  # Redis - Persistence enabled
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - microservices-network

  # RabbitMQ - Cluster
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
      RABBITMQ_ERLANG_COOKIE: ${RABBITMQ_COOKIE}
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - microservices-network

  # Nginx Load Balancer (Optional)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api-gateway
    networks:
      - microservices-network

volumes:
  postgres-auth-data:
  postgres-post-data:
  postgres-comment-data:
  redis-data:
  rabbitmq-data:

networks:
  microservices-network:
    driver: bridge
```

### 2. Build & Deploy

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Tag images for registry
docker tag newfeed/api-gateway:latest registry.example.com/newfeed/api-gateway:v1.0.0
docker tag newfeed/auth-service:latest registry.example.com/newfeed/auth-service:v1.0.0
# ... repeat for all services

# Push to registry
docker push registry.example.com/newfeed/api-gateway:v1.0.0
docker push registry.example.com/newfeed/auth-service:v1.0.0
# ... repeat for all services

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale comment-service=5
```

### 3. Nginx Configuration

**nginx.conf:**

```nginx
upstream api_gateway {
    least_conn;
    server api-gateway-1:8080;
    server api-gateway-2:8080;
    server api-gateway-3:8080;
}

server {
    listen 80;
    server_name api.newfeed.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.newfeed.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to API Gateway
    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE endpoint - longer timeout
    location /api/sse {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
    }
}
```

---

## ☸️ Kubernetes Deployment

### 1. Namespace

**namespace.yaml:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: newfeed
```

### 2. ConfigMap

**configmap.yaml:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: newfeed-config
  namespace: newfeed
data:
  RABBITMQ_URL: "amqp://rabbitmq:5672"
  REDIS_HOST: "redis"
  REDIS_PORT: "6379"
  AUTH_SERVICE_URL: "http://auth-service:3001"
  POST_SERVICE_URL: "http://post-service:3002"
  COMMENT_SERVICE_URL: "http://comment-service:3004"
  MEDIA_SERVICE_URL: "http://media-service:3003"
```

### 3. Secrets

```bash
kubectl create secret generic newfeed-secrets \
  --from-literal=JWT_SECRET=your_jwt_secret \
  --from-literal=SERVICE_SECRET=your_service_secret \
  --from-literal=DB_PASSWORD=your_db_password \
  --from-literal=CLOUDINARY_API_SECRET=your_cloudinary_secret \
  -n newfeed
```

### 4. API Gateway Deployment

**api-gateway-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: newfeed
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: api-gateway
          image: registry.example.com/newfeed/api-gateway:v1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: newfeed-secrets
                  key: JWT_SECRET
            - name: SERVICE_SECRET
              valueFrom:
                secretKeyRef:
                  name: newfeed-secrets
                  key: SERVICE_SECRET
          envFrom:
            - configMapRef:
                name: newfeed-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: newfeed
spec:
  selector:
    app: api-gateway
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
  type: LoadBalancer
```

### 5. Auth Service with StatefulSet

**auth-service-statefulset.yaml:**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-auth
  namespace: newfeed
spec:
  serviceName: postgres-auth
  replicas: 1
  selector:
    matchLabels:
      app: postgres-auth
  template:
    metadata:
      labels:
        app: postgres-auth
    spec:
      containers:
        - name: postgres
          image: postgres:14-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: "auth_db"
            - name: POSTGRES_USER
              value: "admin"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: newfeed-secrets
                  key: DB_PASSWORD
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-auth
  namespace: newfeed
spec:
  selector:
    app: postgres-auth
  ports:
    - protocol: TCP
      port: 5432
      targetPort: 5432
  clusterIP: None
```

### 6. Horizontal Pod Autoscaler

**hpa.yaml:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: comment-service-hpa
  namespace: newfeed
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: comment-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 7. Deploy to Kubernetes

```bash
# Apply all configurations
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f api-gateway-deployment.yaml
kubectl apply -f auth-service-statefulset.yaml
kubectl apply -f hpa.yaml

# Check status
kubectl get pods -n newfeed
kubectl get services -n newfeed

# View logs
kubectl logs -f deployment/api-gateway -n newfeed

# Scale manually
kubectl scale deployment comment-service --replicas=5 -n newfeed
```

---

## 🔧 Environment Configuration

### Production .env Template

```bash
# ===== API Gateway =====
JWT_SECRET=<generate-with-openssl-rand-base64-32>
SERVICE_SECRET=<generate-with-openssl-rand-base64-32>

# ===== Databases =====
AUTH_DB_URL=postgresql://admin:STRONG_PASSWORD@postgres-auth:5432/auth_db
POST_DB_URL=postgresql://admin:STRONG_PASSWORD@postgres-post:5432/post_db
COMMENT_DB_URL=postgresql://admin:STRONG_PASSWORD@postgres-comment:5432/comment_db

# ===== Redis =====
REDIS_HOST=redis.prod.example.com
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD

# ===== RabbitMQ =====
RABBITMQ_URL=amqp://admin:STRONG_PASSWORD@rabbitmq.prod.example.com:5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=STRONG_PASSWORD
RABBITMQ_COOKIE=UNIQUE_ERLANG_COOKIE

# ===== Cloudinary =====
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ===== URLs =====
CLIENT_URL=https://newfeed.com
API_URL=https://api.newfeed.com
```

### Generate Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Service Secret
openssl rand -base64 32

# Database Password
openssl rand -base64 24

# RabbitMQ Cookie
openssl rand -hex 20
```

---

## 💾 Database Setup

### PostgreSQL Replication

**Master Configuration:**

```ini
# postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 64
hot_standby = on
```

**Slave Configuration:**

```ini
# recovery.conf
standby_mode = on
primary_conninfo = 'host=master_host port=5432 user=replicator password=STRONG_PASSWORD'
trigger_file = '/tmp/postgresql.trigger'
```

### Database Backup Script

```bash
#!/bin/bash
# backup-databases.sh

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup each database
pg_dump -h postgres-auth -U admin auth_db | gzip > $BACKUP_DIR/auth_db.sql.gz
pg_dump -h postgres-post -U admin post_db | gzip > $BACKUP_DIR/post_db.sql.gz
pg_dump -h postgres-comment -U admin comment_db | gzip > $BACKUP_DIR/comment_db.sql.gz

# Upload to S3
aws s3 sync $BACKUP_DIR s3://newfeed-backups/$(date +%Y%m%d)/

# Keep only last 7 days
find /backups -type d -mtime +7 -exec rm -rf {} \;
```

### Restore Database

```bash
# Restore from backup
gunzip < backup.sql.gz | psql -h postgres-auth -U admin auth_db
```

---

## 📊 Monitoring & Logging

### Prometheus Metrics

**prometheus.yml:**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "api-gateway"
    static_configs:
      - targets: ["api-gateway:8080"]

  - job_name: "auth-service"
    static_configs:
      - targets: ["auth-service:3001"]

  - job_name: "post-service"
    static_configs:
      - targets: ["post-service:3002"]

  - job_name: "comment-service"
    static_configs:
      - targets: ["comment-service:3004"]

  - job_name: "media-service"
    static_configs:
      - targets: ["media-service:3003"]
```

### Grafana Dashboard

Import dashboards:

- Node.js Application Metrics
- PostgreSQL Database
- Redis Metrics
- RabbitMQ Overview

### ELK Stack for Logging

**docker-compose.logging.yml:**

```yaml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

---

## 📈 Scaling

### Auto-scaling Rules

**Comment Service (High traffic):**

- Min replicas: 2
- Max replicas: 10
- CPU threshold: 70%
- Memory threshold: 80%

**Post Service:**

- Min replicas: 2
- Max replicas: 5
- CPU threshold: 75%

**API Gateway:**

- Min replicas: 3
- Max replicas: 8
- Requests per second: > 1000

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# or
choco install k6  # Windows

# Run load test
k6 run load-test.js
```

**load-test.js:**

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up
    { duration: "5m", target: 100 }, // Stay at 100 users
    { duration: "2m", target: 200 }, // Ramp up
    { duration: "5m", target: 200 }, // Stay at 200 users
    { duration: "2m", target: 0 }, // Ramp down
  ],
};

export default function () {
  let response = http.get("https://api.newfeed.com/api/auth/health");

  check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

## 💾 Backup & Recovery

### Daily Backup Cron

```bash
# /etc/cron.d/newfeed-backup
0 2 * * * /opt/newfeed/backup-databases.sh
0 3 * * * /opt/newfeed/backup-redis.sh
0 4 * * * /opt/newfeed/backup-rabbitmq.sh
```

### Redis Backup

```bash
#!/bin/bash
# backup-redis.sh

redis-cli --rdb /backups/redis/dump-$(date +%Y%m%d).rdb
aws s3 cp /backups/redis/dump-$(date +%Y%m%d).rdb s3://newfeed-backups/redis/
```

### Disaster Recovery Plan

1. **Database failure:**

   - Promote read replica to master
   - Update connection strings
   - Verify data integrity

2. **Service failure:**

   - Kubernetes auto-restarts pods
   - If persistent, rollback to previous version
   - Check logs for root cause

3. **Complete infrastructure failure:**
   - Restore from latest S3 backups
   - Rebuild Kubernetes cluster
   - Deploy services from registry
   - Restore databases
   - Verify functionality

---

## 🔐 Security Best Practices

1. **Secrets Management:**

   - Use Kubernetes Secrets or Vault
   - Rotate credentials every 90 days
   - Never commit secrets to Git

2. **Network Security:**

   - Use private networks for services
   - Expose only API Gateway publicly
   - Implement service mesh (Istio)

3. **Database Security:**

   - Enable SSL/TLS connections
   - Use read-only users where possible
   - Regular security patches

4. **Rate Limiting:**

   - API Gateway: 100 req/15min per IP
   - Authenticated endpoints: 1000 req/hour per user
   - GraphQL query complexity limits

5. **Monitoring:**
   - Set up alerts for suspicious activities
   - Log all authentication attempts
   - Monitor for DDoS attacks

---

**🎉 Deployment hoàn tất! Kiểm tra health endpoints và monitoring dashboards.**
