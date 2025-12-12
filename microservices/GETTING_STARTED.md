# 🚀 Hướng dẫn khởi động Microservices

## 📋 Yêu cầu

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (nếu chạy local)
- Redis (nếu chạy local)
- RabbitMQ (nếu chạy local)

---

## 🔧 Setup môi trường

### 1. Copy environment file

```bash
cd microservices
cp .env.example .env
```

### 2. Cập nhật `.env` file

```env
JWT_SECRET=your-strong-jwt-secret-here
SERVICE_SECRET=your-service-secret-here
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLIENT_URL=http://localhost:3000
```

---

## 🐳 Option 1: Chạy với Docker Compose (Khuyến nghị)

### Khởi động tất cả services

```bash
cd microservices
docker-compose up -d
```

### Xem logs

```bash
docker-compose logs -f
```

### Dừng services

```bash
docker-compose down
```

### Rebuild services

```bash
docker-compose up -d --build
```

### Xóa volumes (reset databases)

```bash
docker-compose down -v
```

---

## 💻 Option 2: Chạy local (Development)

### Prerequisites

Khởi động infrastructure services:

```bash
cd microservices
docker-compose up -d postgres-auth postgres-post postgres-comment redis rabbitmq
```

### 1. Auth Service

```bash
cd microservices/auth-service
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 2. Post Service (nếu đã tạo)

```bash
cd microservices/post-service
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 3. Comment Service (nếu đã tạo)

```bash
cd microservices/comment-service
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 4. Media Service (nếu đã tạo)

```bash
cd microservices/media-service
npm install
npm run dev
```

### 5. API Gateway

```bash
cd microservices/api-gateway
npm install
npm run dev
```

---

## 🧪 Testing

### 1. Health checks

```bash
# API Gateway
curl http://localhost:8080/health

# Auth Service
curl http://localhost:3001/health

# Post Service
curl http://localhost:3002/health

# Comment Service
curl http://localhost:3004/health

# Media Service
curl http://localhost:3003/health
```

### 2. Test signup

```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User"
  }'
```

### 3. Test login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 4. Test authenticated endpoint

```bash
curl -X GET http://localhost:8080/api/auth/me \
  -b cookies.txt
```

---

## 📊 Monitoring

### RabbitMQ Management

- URL: http://localhost:15673
- Username: admin
- Password: admin

### Database Connections

```bash
# Auth DB
psql -h localhost -p 5433 -U postgres -d auth_db

# Post DB
psql -h localhost -p 5434 -U postgres -d post_db

# Comment DB
psql -h localhost -p 5435 -U postgres -d comment_db
```

### Redis CLI

```bash
docker exec -it microservices_redis_1 redis-cli
```

---

## 🔄 Migration từ Monolith

### Cấu trúc thư mục

```
new-feed-server/
├── app.js                    # Monolith cũ (GIỮ NGUYÊN)
├── controllers/              # Monolith cũ (GIỮ NGUYÊN)
├── routes/                   # Monolith cũ (GIỮ NGUYÊN)
├── ...                       # Monolith files (GIỮ NGUYÊN)
│
└── microservices/            # ✨ Microservices mới
    ├── api-gateway/
    ├── auth-service/
    ├── post-service/
    ├── comment-service/
    ├── media-service/
    └── docker-compose.yml
```

### Chiến lược

1. ✅ Giữ monolith chạy trên port 3004
2. ✅ Chạy microservices trên port 8080 (API Gateway)
3. ✅ Dần chuyển traffic từ monolith sang microservices
4. ✅ Test song song 2 hệ thống
5. ✅ Sau khi stable, tắt monolith

---

## 🐛 Troubleshooting

### Port conflicts

Nếu gặp lỗi port đã bị sử dụng:

```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8080
kill -9 <PID>
```

### Database connection errors

```bash
# Reset databases
docker-compose down -v
docker-compose up -d postgres-auth postgres-post postgres-comment

# Chờ DB khởi động
sleep 5

# Run migrations
cd auth-service && npx prisma migrate deploy
```

### Redis connection errors

```bash
docker-compose restart redis
```

### Service not responding

```bash
# Check logs
docker-compose logs -f <service-name>

# Restart service
docker-compose restart <service-name>
```

---

## 📚 Next Steps

1. ✅ Tạo Post Service
2. ✅ Tạo Comment Service
3. ✅ Tạo Media Service
4. ✅ Implement RabbitMQ event bus
5. ✅ Add comprehensive logging
6. ✅ Add monitoring (Prometheus/Grafana)
7. ✅ Setup CI/CD pipeline
8. ✅ Load testing & optimization

---

## 📖 Architecture Docs

- [API Gateway](./api-gateway/README.md)
- [Auth Service](./auth-service/README.md)
- [Service Communication](./docs/SERVICE_COMMUNICATION.md)
- [Event-Driven Architecture](./docs/EVENTS.md)
